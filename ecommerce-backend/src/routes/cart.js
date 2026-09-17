// ============================================================================
// cart.js: HTTP routes for shopping cart actions
// ============================================================================
// PURPOSE:
//   - Exposes cart endpoints for listing, adding, updating, and removing items.
//   - The route layer reads authenticated user data and delegates cart logic to the
//     service layer so business rules remain centralized and easy to test.
//
// WHY THIS APPROACH:
//   - Routes handle request validation and transport concerns, while the cart service
//     handles database logic and stock checks.
//   - Alternative: mixing validation and query code inside the route would create a
//     larger file that is harder to reason about and extend.
//
// DEPENDENCIES:
//   - express: router creation for HTTP endpoints
//   - ../services/cartService: the cart business logic
//   - ../services/authService: JWT verification for authenticated requests
//
// SECURITY CONSIDERATIONS:
//   - Protected endpoints require a valid bearer token.
//   - All input is validated before reaching the database.
//   - Generic errors are returned to clients instead of exposing internal stack traces.
// ============================================================================

const express = require('express');
const router = express.Router();

const cartService = require('../services/cartService');
const authService = require('../services/authService');

// ────────────────────────────────────────────────────────────────────────
// MIDDLEWARE: requireAuth
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Validates the Authorization header and attaches the authenticated user id to
//     the request object.
//   - This protects the cart endpoints so only logged-in customers can change their
//     own cart.
//
// WHY THIS APPROACH:
//   - Protecting endpoints at the route layer is the standard way to enforce
//     authentication in Express.
//   - It avoids trusting client-side state and ensures each request is verified by
//     the server using the JWT secret.
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
// ROUTE: GET /api/cart
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Returns the authenticated customer's current cart contents and subtotal.
//
// RESPONSE:
//   - 200 OK with { cart: { items, subtotal_cents, item_count } }
// ────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const cart = await cartService.getCart(req.user.id);
    return res.status(200).json({ cart });
  } catch (error) {
    next(error);
  }
});

// ────────────────────────────────────────────────────────────────────────
// ROUTE: POST /api/cart
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Adds an item to the authenticated user's cart.
//   - Example body: { productId: 1, quantity: 2 }
//
// RESPONSE:
//   - 201 Created with the cart item details
// ────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { productId, quantity } = req.body || {};

    const item = await cartService.addItemToCart(req.user.id, productId, quantity);

    return res.status(201).json({
      success: true,
      item,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      error: error.message || 'Unable to add item to cart',
    });
  }
});

// ────────────────────────────────────────────────────────────────────────
// ROUTE: PUT /api/cart/:productId
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Updates the quantity of a product already in the current cart.
//   - Example body: { quantity: 3 }
//
// RESPONSE:
//   - 200 OK with the updated item
// ────────────────────────────────────────────────────────────────────────
router.put('/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body || {};

    const item = await cartService.updateCartItemQuantity(req.user.id, productId, quantity);

    return res.status(200).json({
      success: true,
      item,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      error: error.message || 'Unable to update cart item',
    });
  }
});

// ────────────────────────────────────────────────────────────────────────
// ROUTE: DELETE /api/cart/:productId
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Removes a product from the authenticated user's cart.
//
// RESPONSE:
//   - 200 OK with a deletion result
// ────────────────────────────────────────────────────────────────────────
router.delete('/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;

    const result = await cartService.removeItemFromCart(req.user.id, productId);

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      error: error.message || 'Unable to remove item from cart',
    });
  }
});

module.exports = router;
