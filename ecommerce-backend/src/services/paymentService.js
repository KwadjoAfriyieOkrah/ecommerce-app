// ============================================================================
// paymentService.js: Payment processing and transaction record management
// ============================================================================
// PURPOSE:
//   - Manages payment records for completed orders.
//   - This service handles creating a payment record and fetching payment status,
//     while keeping the route layer focused on HTTP behavior.
//
// WHY THIS APPROACH:
//   - Payment status is business-critical and should be centralized in one service.
//   - Alternative: embedding payment processing logic directly in order routes
//     would create a tighter coupling between checkout logic and payment rules.
//
// DEPENDENCIES:
//   - ../db/connection: PostgreSQL pool used to persist payment records
//
// SECURITY CONSIDERATIONS:
//   - Payment amounts come from the order total, not the client request body.
//   - The service validates order ownership before recording a payment.
//   - All SQL values are parameterized to prevent injection.
// ============================================================================

const pool = require('../db/connection');

// ────────────────────────────────────────────────────────────────────────
// FUNCTION: getPaymentForOrder(userId, orderId)
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Reads the payment record for a specific order if it belongs to the user.
//
// PARAMETERS:
//   - userId (number) — authenticated customer
//   - orderId (number) — order being checked
//
// RETURNS:
//   - The payment row or null if none exists
// ────────────────────────────────────────────────────────────────────────
async function getPaymentForOrder(userId, orderId) {
  const query = `
    SELECT p.id, p.order_id, p.user_id, p.amount_cents, p.status, p.provider,
           p.transaction_reference, p.created_at, p.updated_at
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    WHERE o.user_id = $1 AND p.order_id = $2
  `;

  const result = await pool.query(query, [userId, orderId]);
  return result.rows[0] || null;
}

// ────────────────────────────────────────────────────────────────────────
// FUNCTION: createPayment(userId, orderId, { provider, transactionReference })
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Creates a payment record when an order is successfully paid.
//   - It validates the order belongs to the current user and that payment is not
//     duplicated for the same order.
//
// PARAMETERS:
//   - userId (number) — authenticated customer
//   - orderId (number) — order to pay for
//   - provider (string) — payment provider, such as stripe
//   - transactionReference (string) — external payment ID
//
// RETURNS:
//   - A payment row with status paid
//
// WHY THIS APPROACH:
//   - We should never trust the client to declare a payment is successful.
//   - The backend verifies the order belongs to the user, then records the payment
//     result using only server-side values.
// ────────────────────────────────────────────────────────────────────────
async function createPayment(userId, orderId, { provider = 'stripe', transactionReference } = {}) {
  const parsedOrderId = Number(orderId);

  if (!Number.isInteger(parsedOrderId) || parsedOrderId <= 0) {
    const error = new Error('Invalid order id');
    error.statusCode = 400;
    throw error;
  }

  const orderResult = await pool.query(
    'SELECT id, user_id, total_cents FROM orders WHERE id = $1',
    [parsedOrderId]
  );

  if (orderResult.rows.length === 0) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  const order = orderResult.rows[0];

  if (Number(order.user_id) !== Number(userId)) {
    const error = new Error('You do not have access to this order');
    error.statusCode = 403;
    throw error;
  }

  const existingPayment = await pool.query(
    'SELECT id FROM payments WHERE order_id = $1',
    [parsedOrderId]
  );

  if (existingPayment.rows.length > 0) {
    const error = new Error('Payment already recorded for this order');
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `
      INSERT INTO payments (order_id, user_id, amount_cents, status, provider, transaction_reference)
      VALUES ($1, $2, $3, 'paid', $4, $5)
      RETURNING id, order_id, user_id, amount_cents, status, provider, transaction_reference, created_at, updated_at
    `,
    [parsedOrderId, userId, Number(order.total_cents), provider, transactionReference || null]
  );

  return result.rows[0];
}

module.exports = {
  getPaymentForOrder,
  createPayment,
};
