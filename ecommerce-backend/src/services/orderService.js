// ============================================================================
// orderService.js: Business logic for placing and querying customer orders
// ============================================================================
// PURPOSE:
//   - Handles checkout logic such as turning a user's cart into a valid order,
//     reducing stock, and retrieving order history.
//   - This keeps the route layer focused on HTTP concerns while the service owns
//     inventory and order validation rules.
//
// WHY THIS APPROACH:
//   - Checkout is a transactional process: if any part fails, the order should not
//     be partially created.
//   - A service layer allows us to wrap cart-to-order conversion in a single
//     database transaction and ensure inventory stays consistent.
//
// DEPENDENCIES:
//   - ../db/connection: PostgreSQL pool used for transactional queries
//
// SECURITY CONSIDERATIONS:
//   - Stock is checked before order creation to prevent overselling.
//   - Order totals are generated from the catalog price at checkout time, not from
//     untrusted client input.
//   - All queries use parameterized values to prevent SQL injection.
// ============================================================================

const pool = require('../db/connection');

// ────────────────────────────────────────────────────────────────────────
// FUNCTION: getOrdersByUser(userId)
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Returns the authenticated user's order history, including item totals.
//
// PARAMETERS:
//   - userId (number) — the logged-in customer whose orders we want to fetch
//
// RETURNS:
//   - An array of order records with item details
//
// WHY THIS APPROACH:
//   - Order history is naturally user-scoped, so the database should filter orders
//     by user_id instead of returning all records across the system.
// ────────────────────────────────────────────────────────────────────────
async function getOrdersByUser(userId) {
  const query = `
    SELECT
      o.id,
      o.status,
      o.total_cents,
      o.shipping_address,
      o.created_at,
      json_agg(
        json_build_object(
          'product_id', oi.product_id,
          'quantity', oi.quantity,
          'price_cents', oi.price_cents,
          'line_total_cents', oi.quantity * oi.price_cents
        )
      ) AS items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = $1
    GROUP BY o.id, o.status, o.total_cents, o.shipping_address, o.created_at
    ORDER BY o.created_at DESC
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
}

// ────────────────────────────────────────────────────────────────────────
// FUNCTION: getOrderById(userId, orderId)
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Retrieves a single order from the current user's history.
//
// PARAMETERS:
//   - userId (number) — logged-in user
//   - orderId (number) — specific order requested by the client
//
// RETURNS:
//   - One order with child items or null if the order does not belong to the user
// ────────────────────────────────────────────────────────────────────────
async function getOrderById(userId, orderId) {
  const query = `
    SELECT
      o.id,
      o.status,
      o.total_cents,
      o.shipping_address,
      o.created_at,
      json_agg(
        json_build_object(
          'product_id', oi.product_id,
          'quantity', oi.quantity,
          'price_cents', oi.price_cents,
          'line_total_cents', oi.quantity * oi.price_cents
        )
      ) AS items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = $1 AND o.id = $2
    GROUP BY o.id, o.status, o.total_cents, o.shipping_address, o.created_at
  `;

  const result = await pool.query(query, [userId, orderId]);
  return result.rows[0] || null;
}

// ────────────────────────────────────────────────────────────────────────
// FUNCTION: createOrder(userId, { shippingAddress })
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Converts a user's current cart into a purchase order.
//   - It validates stock, creates the order record, inserts order items, reduces
//     product inventory, and clears the cart in one transaction.
//
// PARAMETERS:
//   - userId (number) — logged-in customer making the purchase
//   - payload.shippingAddress (string) — address used for fulfillment
//
// RETURNS:
//   - The created order record along with its items
//
// WHY THIS APPROACH:
//   - Checkout is a transaction: either the full order succeeds or nothing is
//     committed. This prevents half-written orders when a database error occurs.
//   - We use the cart as the source of truth for what the user intends to buy, but
//     we validate the current product stock and prices before finalizing the order.
// ────────────────────────────────────────────────────────────────────────
async function createOrder(userId, { shippingAddress } = {}) {
  if (!shippingAddress || !String(shippingAddress).trim()) {
    const error = new Error('Shipping address is required');
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const cartResult = await client.query(
      `
        SELECT ci.product_id, ci.quantity, p.stock, p.price_cents, p.name
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        WHERE ci.user_id = $1
      `,
      [userId]
    );

    if (cartResult.rows.length === 0) {
      const error = new Error('Cart is empty');
      error.statusCode = 400;
      throw error;
    }

    const cartItems = cartResult.rows;
    const productUpdates = [];
    let totalCents = 0;

    for (const item of cartItems) {
      if (Number(item.quantity) > Number(item.stock)) {
        const error = new Error(`Not enough stock for product: ${item.name}`);
        error.statusCode = 400;
        throw error;
      }

      const lineTotal = Number(item.quantity) * Number(item.price_cents);
      totalCents += lineTotal;

      productUpdates.push({
        productId: item.product_id,
        quantity: Number(item.quantity),
      });
    }

    const orderResult = await client.query(
      `
        INSERT INTO orders (user_id, status, total_cents, shipping_address)
        VALUES ($1, 'pending', $2, $3)
        RETURNING id, user_id, status, total_cents, shipping_address, created_at
      `,
      [userId, totalCents, String(shippingAddress).trim()]
    );

    const order = orderResult.rows[0];

    for (const item of cartItems) {
      await client.query(
        `
          INSERT INTO order_items (order_id, product_id, quantity, price_cents)
          VALUES ($1, $2, $3, $4)
        `,
        [order.id, item.product_id, item.quantity, item.price_cents]
      );
    }

    for (const item of productUpdates) {
      await client.query(
        `
          UPDATE products
          SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `,
        [item.quantity, item.productId]
      );
    }

    await client.query(
      'DELETE FROM cart_items WHERE user_id = $1',
      [userId]
    );

    await client.query('COMMIT');

    return {
      ...order,
      items: cartItems.map((item) => ({
        product_id: item.product_id,
        quantity: Number(item.quantity),
        price_cents: Number(item.price_cents),
        line_total_cents: Number(item.quantity) * Number(item.price_cents),
      })),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getOrdersByUser,
  getOrderById,
  createOrder,
};
