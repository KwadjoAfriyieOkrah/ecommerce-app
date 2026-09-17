// ============================================================================
// orders.js: HTTP routes for customer checkout and order history
// ============================================================================
// PURPOSE:
//   - Exposes authenticated order endpoints for listing all orders and creating a
//     new order from the current cart.
//   - This is the API layer that connects the cart to the checkout workflow.
//
// WHY THIS APPROACH:
//   - Order endpoints should be protected and focused strictly on HTTP concerns.
//   - Business rules like stock checks, totals, and transaction handling live in
//     the service layer, which is easier to test and maintain.
//
// DEPENDENCIES:
//   - express: router creation
//   - ../services/orderService: order logic and checkout transaction
//   - ../services/authService: JWT verification for protected routes
//
// SECURITY CONSIDERATIONS:
//   - Only authenticated users can access order data or create orders.
//   - Input is validated before the service runs any database transaction.
//   - Errors are returned as generic messages to prevent leaking internal details.
// ============================================================================

const express = require('express');
const router = express.Router();

const orderService = require('../services/orderService');
const authService = require('../services/authService');

// ────────────────────────────────────────────────────────────────────────
// MIDDLEWARE: requireAuth
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Reads the bearer token, verifies it using the JWT secret, and attaches the
//     current user to the request.
//
// WHY THIS APPROACH:
//   - Protected order routes must only work for authenticated customers. This is
//     the standard security pattern for a Node.js Express API.
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
// ROUTE: GET /api/orders
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Returns the current user's order history.
//
// RESPONSE:
//   - 200 OK with an array of order records
// ────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const orders = await orderService.getOrdersByUser(req.user.id);
    return res.status(200).json({ orders });
  } catch (error) {
    next(error);
  }
});

// ────────────────────────────────────────────────────────────────────────
// ROUTE: GET /api/orders/:id
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Retrieves a specific order from the authenticated customer's history.
//
// RESPONSE:
//   - 200 OK with a single order record
//   - 404 Not Found if the order belongs to another user or does not exist
// ────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: 'Invalid order id' });
    }

    const order = await orderService.getOrderById(req.user.id, orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.status(200).json({ order });
  } catch (error) {
    next(error);
  }
});

// ────────────────────────────────────────────────────────────────────────
// ROUTE: POST /api/orders
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Creates a new order from the user's current cart.
//   - Example body: { shippingAddress: '123 Main Street, Accra' }
//
// RESPONSE:
//   - 201 Created with the new order details
// ────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { shippingAddress } = req.body || {};

    const order = await orderService.createOrder(req.user.id, { shippingAddress });

    return res.status(201).json({
      success: true,
      order,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      error: error.message || 'Unable to create order',
    });
  }
});

module.exports = router;
