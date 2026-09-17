// ============================================================================
// cartService.js: Shopping cart business logic for users and inventory
// ============================================================================
// PURPOSE:
//   - Manages the user's cart, including listing items, adding products, updating
//     quantities, and removing items from the cart.
//   - This keeps cart rules such as stock validation and total calculations in one
//     place instead of spreading them across routes.
//
// WHY THIS APPROACH:
//   - A service layer keeps business rules reusable and testable away from the HTTP
//     layer.
//   - Alternative: writing all cart logic into the router would mix request parsing
//     and business validation together, making features harder to extend.
//
// DEPENDENCIES:
//   - ../db/connection: PostgreSQL pool used for the cart queries
//
// SECURITY CONSIDERATIONS:
//   - Product and user IDs are validated before query execution.
//   - Inventory is checked before allowing any quantity to increase.
//   - All queries use parameterized values to prevent SQL injection.
// ============================================================================

const pool = require('../db/connection');

// ────────────────────────────────────────────────────────────────────────
// FUNCTION: getCart(userId)
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Fetches every cart item for a user and returns the items plus the subtotal.
//   - This is used by the cart page to show the shopper what is in their basket.
//
// PARAMETERS:
//   - userId (number) — the logged-in customer whose cart is being read
//
// RETURNS:
//   - { items, subtotal_cents, item_count }
//
// WHY THIS APPROACH:
//   - The database does the join work, which is efficient and keeps the route code
//     simpler.
//   - We calculate totals at the service layer so the route can remain focused on
//     HTTP responses instead of cart math.
// ────────────────────────────────────────────────────────────────────────
async function getCart(userId) {
  const query = `
    SELECT
      ci.id,
      ci.product_id,
      ci.quantity,
      p.name,
      p.description,
      p.price_cents,
      p.image_url,
      p.category,
      p.stock,
      (ci.quantity * p.price_cents) AS line_total_cents
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.user_id = $1
    ORDER BY ci.updated_at DESC
  `;

  const result = await pool.query(query, [userId]);

  const items = result.rows.map((row) => ({
    id: row.id,
    product_id: row.product_id,
    quantity: Number(row.quantity),
    name: row.name,
    description: row.description,
    price_cents: Number(row.price_cents),
    image_url: row.image_url,
    category: row.category,
    stock: Number(row.stock),
    line_total_cents: Number(row.line_total_cents),
  }));

  const subtotal_cents = items.reduce((total, item) => total + item.line_total_cents, 0);
  const item_count = items.reduce((total, item) => total + item.quantity, 0);

  return {
    items,
    subtotal_cents,
    item_count,
  };
}

// ────────────────────────────────────────────────────────────────────────
// FUNCTION: addItemToCart(userId, productId, quantity)
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Adds a product to the cart or increases the existing quantity.
//   - It checks that the product exists, is active, and has enough stock before
//     updating the cart.
//
// PARAMETERS:
//   - userId (number) — the logged-in customer
//   - productId (number) — the product being added
//   - quantity (number) — how many units to add
//
// RETURNS:
//   - The updated cart item row or a validation error trigger
//
// WHY THIS APPROACH:
//   - We should prevent overselling before the customer adds an item that cannot
//     be fulfilled.
//   - This is a core business rule: inventory must stay truthful and the cart must
//     reflect actual availability.
// ────────────────────────────────────────────────────────────────────────
async function addItemToCart(userId, productId, quantity) {
  const parsedProductId = Number(productId);
  const parsedQuantity = Number(quantity);

  if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) {
    const error = new Error('Invalid product id');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
    const error = new Error('Quantity must be a positive integer');
    error.statusCode = 400;
    throw error;
  }

  const productResult = await pool.query(
    'SELECT id, stock, is_active, price_cents FROM products WHERE id = $1',
    [parsedProductId]
  );

  if (productResult.rows.length === 0) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  const product = productResult.rows[0];

  if (product.is_active !== true) {
    const error = new Error('Product is currently unavailable');
    error.statusCode = 400;
    throw error;
  }

  const existingResult = await pool.query(
    'SELECT quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
    [userId, parsedProductId]
  );

  const existingQuantity = existingResult.rows[0] ? Number(existingResult.rows[0].quantity) : 0;
  const totalRequested = existingQuantity + parsedQuantity;

  if (totalRequested > Number(product.stock)) {
    const error = new Error('Not enough stock available for this quantity');
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `
      INSERT INTO cart_items (user_id, product_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, product_id)
      DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity,
                    updated_at = CURRENT_TIMESTAMP
      RETURNING id, user_id, product_id, quantity, created_at, updated_at
    `,
    [userId, parsedProductId, parsedQuantity]
  );

  return result.rows[0];
}

// ────────────────────────────────────────────────────────────────────────
// FUNCTION: updateCartItemQuantity(userId, productId, quantity)
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Updates the quantity for a product already inside the cart.
//   - If the quantity is set to zero or less, the item is removed.
//
// PARAMETERS:
//   - userId (number) — customer whose cart is being edited
//   - productId (number) — product row to update
//   - quantity (number) — target quantity after update
//
// RETURNS:
//   - The updated cart row or a successful deletion marker.
// ────────────────────────────────────────────────────────────────────────
async function updateCartItemQuantity(userId, productId, quantity) {
  const parsedProductId = Number(productId);
  const parsedQuantity = Number(quantity);

  if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) {
    const error = new Error('Invalid product id');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(parsedQuantity)) {
    const error = new Error('Quantity must be an integer');
    error.statusCode = 400;
    throw error;
  }

  const productResult = await pool.query(
    'SELECT stock, is_active FROM products WHERE id = $1',
    [parsedProductId]
  );

  if (productResult.rows.length === 0) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  const product = productResult.rows[0];

  if (product.is_active !== true) {
    const error = new Error('Product is currently unavailable');
    error.statusCode = 400;
    throw error;
  }

  if (parsedQuantity <= 0) {
    const result = await pool.query(
      'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2 RETURNING id',
      [userId, parsedProductId]
    );

    return {
      deleted: result.rowCount > 0,
      product_id: parsedProductId,
    };
  }

  if (parsedQuantity > Number(product.stock)) {
    const error = new Error('Requested quantity exceeds available stock');
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `
      UPDATE cart_items
      SET quantity = $3, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND product_id = $2
      RETURNING id, user_id, product_id, quantity, updated_at
    `,
    [userId, parsedProductId, parsedQuantity]
  );

  if (result.rows.length === 0) {
    const error = new Error('Item not found in cart');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

// ────────────────────────────────────────────────────────────────────────
// FUNCTION: removeItemFromCart(userId, productId)
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Removes a product from the current user's cart.
//
// PARAMETERS:
//   - userId (number) — current customer
//   - productId (number) — product to remove
//
// RETURNS:
//   - A deletion result describing whether anything was removed.
// ────────────────────────────────────────────────────────────────────────
async function removeItemFromCart(userId, productId) {
  const parsedProductId = Number(productId);

  if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) {
    const error = new Error('Invalid product id');
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2 RETURNING id',
    [userId, parsedProductId]
  );

  return {
    deleted: result.rowCount > 0,
    product_id: parsedProductId,
  };
}

module.exports = {
  getCart,
  addItemToCart,
  updateCartItemQuantity,
  removeItemFromCart,
};
