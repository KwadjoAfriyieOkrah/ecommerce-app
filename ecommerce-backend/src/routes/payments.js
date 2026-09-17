// ============================================================================
// payments.js: HTTP routes for order payment records
// ============================================================================
// PURPOSE:
//   - Exposes payment endpoints for querying and recording payment status for a
//     completed order.
//   - This route layer keeps the API contract simple while the service handles the
//     authorization and persistence logic.
//
// WHY THIS APPROACH:
//   - Payment endpoints are naturally tied to an authenticated user and an order.
//   - Keeping the request parsing and JWT verification here lets the service focus
//     on database checks and transaction creation.
//
// DEPENDENCIES:
//   - express: router API
//   - ../services/paymentService: payment logic
//   - ../services/authService: JWT verification for protected endpoints
//
// SECURITY CONSIDERATIONS:
//   - Only authenticated users can access their payment records.
//   - Payment route ensures the order belongs to the current user before returning or
//     creating a payment record.
// ============================================================================

const express = require('express');
const router = express.Router();

const paymentService = require('../services/paymentService');
const authService = require('../services/authService');

// ────────────────────────────────────────────────────────────────────────
// MIDDLEWARE: requireAuth
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Verifies the Authorization header and adds the current auth user to the
//     request object.
//
// WHY THIS APPROACH:
//   - Payment records are sensitive and should only be used by the authenticated
//     customer who owns the order.
// ────────────────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = authService.verifyJWTToken(token);
    req.user = { id: payload.userId };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

router.use(requireAuth);

// ────────────────────────────────────────────────────────────────────────
// ROUTE: GET /api/payments/:orderId
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Returns the payment record for a user's order.
//
// RESPONSE:
//   - 200 OK with the payment row
//   - 404 if no payment exists for that order
// ────────────────────────────────────────────────────────────────────────
router.get('/:orderId', async (req, res, next) => {
  try {
    const orderId = Number(req.params.orderId);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: 'Invalid order id' });
    }

    const payment = await paymentService.getPaymentForOrder(req.user.id, orderId);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    return res.status(200).json({ payment });
  } catch (error) {
    next(error);
  }
});

// ────────────────────────────────────────────────────────────────────────
// ROUTE: POST /api/payments/:orderId
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Records a successful payment for an order.
//   - Example body: { provider: 'stripe', transactionReference: 'pi_123abc' }
//
// RESPONSE:
//   - 201 Created with the payment record
// ────────────────────────────────────────────────────────────────────────
router.post('/:orderId', async (req, res, next) => {
  try {
    const orderId = Number(req.params.orderId);
    const { provider, transactionReference } = req.body || {};

    const payment = await paymentService.createPayment(req.user.id, orderId, {
      provider,
      transactionReference,
    });

    return res.status(201).json({
      success: true,
      payment,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      error: error.message || 'Unable to create payment record',
    });
  }
});

module.exports = router;
