// ============================================================================
// products.js: HTTP routes for product listing, filtering, search, and detail views
// ============================================================================
// PURPOSE:
//   - Exposes the product catalog endpoints for the backend API.
//   - This file receives HTTP requests, validates query parameters, calls the
//     product service, and returns JSON responses for the storefront.
//
// WHY THIS APPROACH:
//   - Routes handle HTTP concerns while services handle business logic.
//   - This keeps the product listing logic reusable and easier to test.
//   - Alternative: embedding SQL directly in route handlers would duplicate logic and
//     create difficult-to-maintain code.
//
// HOW REQUESTS FLOW:
//   - Client requests GET /api/products?category=electronics
//   - Route reads the query string and validates values
//   - Route calls productService.getProducts(...)
//   - PostgreSQL runs the query and returns matching rows
//   - Route sends a clean JSON response to the client
//
// DEPENDENCIES:
//   - express: router setup for product endpoints
//   - ../services/productService: product catalog business logic
//
// SECURITY CONSIDERATIONS:
//   - All filter values are validated before use.
//   - Search values stay parameterized to prevent SQL injection.
//   - Product routes never expose internal database errors to clients.
// ============================================================================

const express = require('express');
const router = express.Router();
const productService = require('../services/productService');

// ────────────────────────────────────────────────────────────────────────
// ROUTE: GET /api/products
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Lists products with optional search, category, and price filters.
//   - This is the main storefront endpoint used for browsing the catalog.
//
// QUERY PARAMETERS:
//   - search (optional) — text search across product name and description
//   - category (optional) — filter by product category
//   - minPrice (optional) — minimum price in cents
//   - maxPrice (optional) — maximum price in cents
//   - limit (optional) — how many items per page
//   - offset (optional) — starting offset for pagination
//
// RESPONSE:
//   - 200 OK
//   - { products: [...] }
//
// EXAMPLE USAGE:
//   GET /api/products?category=electronics&minPrice=20000&maxPrice=50000&limit=10&offset=0
// ────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      limit,
      offset,
    } = req.query;

    // VALIDATE QUERY PARAMS.
    // - We convert optional numeric filters to numbers when provided.
    // - We avoid invalid values such as NaN, negative numbers, or empty strings.
    const parsedLimit = limit ? Number(limit) : 20;
    const parsedOffset = offset ? Number(offset) : 0;

    const validatedLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
    const validatedOffset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

    const normalizedMinPrice = minPrice !== undefined && minPrice !== '' ? Number(minPrice) : undefined;
    const normalizedMaxPrice = maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : undefined;

    if (
      (normalizedMinPrice !== undefined && (!Number.isFinite(normalizedMinPrice) || normalizedMinPrice < 0)) ||
      (normalizedMaxPrice !== undefined && (!Number.isFinite(normalizedMaxPrice) || normalizedMaxPrice < 0))
    ) {
      return res.status(400).json({ error: 'Invalid price filter' });
    }

    if (normalizedMinPrice !== undefined && normalizedMaxPrice !== undefined && normalizedMinPrice > normalizedMaxPrice) {
      return res.status(400).json({ error: 'Minimum price cannot be greater than maximum price' });
    }

    const products = await productService.getProducts({
      search: search || undefined,
      category: category || undefined,
      minPrice: normalizedMinPrice,
      maxPrice: normalizedMaxPrice,
      limit: validatedLimit,
      offset: validatedOffset,
    });

    return res.status(200).json({
      products,
    });
  } catch (error) {
    // ERROR HANDLING:
    // - Unexpected errors are passed to the centralized Express error middleware.
    // - This ensures a consistent 500 response without leaking sensitive internals.
    next(error);
  }
});

// ────────────────────────────────────────────────────────────────────────
// ROUTE: GET /api/products/:id
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Returns the details of a single product.
//   - This is used by the product detail page when a user clicks a product.
//
// ROUTE PARAMS:
//   - id (number) — the product slug or unique id
//
// RESPONSE:
//   - 200 OK with a product object
//   - 404 Not Found when the product does not exist
//
// EXAMPLE USAGE:
//   GET /api/products/12
// ────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: 'Invalid product id' });
    }

    const product = await productService.getProductById(productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.status(200).json({ product });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

// WHY THIS FILE MATTERS:
// - It turns catalog queries into usable HTTP endpoints.
// - It keeps the product list and product detail API consistent with the auth API
//   pattern already established in the project.
// - It is a clean foundation for future features like product reviews, cart items,
//   and checkout integration.
