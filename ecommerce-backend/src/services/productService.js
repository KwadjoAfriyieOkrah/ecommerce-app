// ============================================================================
// productService.js: Business logic for product catalog and inventory operations
// ============================================================================
// PURPOSE:
//   - Handles the core logic for listing products, searching the catalog, and
//     retrieving product details from PostgreSQL.
//   - This service keeps database queries and inventory rules separate from the
//     HTTP layer so routes stay clean and reusable.
//
// WHY THIS APPROACH:
//   - A service layer separates business rules from route handlers.
//   - Routes should only parse HTTP requests and return JSON; the service decides how
//     products are queried, filtered, and validated.
//   - Alternative: putting all SQL and business rules directly in routes would make
//     the code harder to test and maintain.
//
// DEPENDENCIES:
//   - ../db/connection: PostgreSQL pool used to execute product queries.
//
// SECURITY CONSIDERATIONS:
//   - All queries use parameterized values to prevent SQL injection.
//   - Inventory checks prevent overselling and negative stock values.
// ============================================================================

const pool = require('../db/connection');

// ────────────────────────────────────────────────────────────────────────
// FUNCTION: getProducts({ search, category, minPrice, maxPrice, limit, offset })
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Fetches a list of products matching optional filters such as category,
//     search text, and price range.
//   - It returns only active products by default to keep the storefront clean.
//
// PARAMETERS:
//   - search (string) — optional text search against the product name/description
//   - category (string) — optional category filter
//   - minPrice (number) — minimum allowed price in cents
//   - maxPrice (number) — maximum allowed price in cents
//   - limit (number) — number of results per page
//   - offset (number) — how far into the results to start
//
// RETURNS:
//   - An array of product rows matching the filter criteria.
//
// WHY THIS APPROACH:
//   - SQL filtering is efficient and keeps the database doing the heavy lifting.
//   - Parameterized values protect the query from malicious strings and special
//     characters in search terms.
//
// EXAMPLE USAGE:
//   const products = await getProducts({ category: 'electronics', limit: 20, offset: 0 });
// ────────────────────────────────────────────────────────────────────────
async function getProducts({ search, category, minPrice, maxPrice, limit = 20, offset = 0 } = {}) {
  const conditions = ['is_active = TRUE'];
  const values = [];
  let index = 1;

  // SEARCH FILTER.
  // - Search is applied against the product name and description.
  // - The query uses ILIKE for case-insensitive matching, which is helpful for
  //   product catalog search without requiring exact casing.
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(`(name ILIKE $${index} OR description ILIKE $${index})`);
    values.push(term);
    index += 1;
  }

  // CATEGORY FILTER.
  // - If the client passes a category, narrow the result set to matching products.
  if (category && category.trim()) {
    conditions.push(`category = $${index}`);
    values.push(category.trim());
    index += 1;
  }

  // PRICE FILTERS.
  // - minPrice and maxPrice are stored in cents to avoid float issues.
  if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
    conditions.push(`price_cents >= $${index}`);
    values.push(Number(minPrice));
    index += 1;
  }

  if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
    conditions.push(`price_cents <= $${index}`);
    values.push(Number(maxPrice));
    index += 1;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  values.push(Number(limit));
  values.push(Number(offset));

  const query = `
    SELECT
      id,
      name,
      description,
      price_cents,
      stock,
      category,
      image_url,
      is_active,
      created_at,
      updated_at
    FROM products
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${index}
    OFFSET $${index + 1}
  `;

  const result = await pool.query(query, values);
  return result.rows;
}

// ────────────────────────────────────────────────────────────────────────
// FUNCTION: getProductById(productId)
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Retrieves a single product by id for the product detail page.
//   - It returns the full row if the product exists and is active.
//
// PARAMETERS:
//   - productId (number) — the unique product identifier
//
// RETURNS:
//   - One product row or null if not found.
//
// EXAMPLE USAGE:
//   const product = await getProductById(12);
// ────────────────────────────────────────────────────────────────────────
async function getProductById(productId) {
  const query = `
    SELECT
      id,
      name,
      description,
      price_cents,
      stock,
      category,
      image_url,
      is_active,
      created_at,
      updated_at
    FROM products
    WHERE id = $1 AND is_active = TRUE
  `;

  const result = await pool.query(query, [productId]);
  return result.rows[0] || null;
}

// ────────────────────────────────────────────────────────────────────────
// FUNCTION: checkInventory(productId, quantity)
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Checks whether enough stock exists for a requested quantity.
//   - This is a business rule used before adding to cart or creating an order.
//
// PARAMETERS:
//   - productId (number) — product to inspect
//   - quantity (number) — requested quantity
//
// RETURNS:
//   - true if stock is sufficient, otherwise false
//
// WHY THIS APPROACH:
//   - This prevents overselling and keeps the inventory model reliable.
//   - It is better to validate stock before creating an order than to discover the
//     issue later when the customer tries to checkout.
// ────────────────────────────────────────────────────────────────────────
async function checkInventory(productId, quantity) {
  if (!productId || !quantity || Number(quantity) <= 0) {
    return false;
  }

  const result = await pool.query(
    'SELECT stock FROM products WHERE id = $1 AND is_active = TRUE',
    [productId]
  );

  if (result.rows.length === 0) {
    return false;
  }

  return Number(result.rows[0].stock) >= Number(quantity);
}

// ────────────────────────────────────────────────────────────────────────
// FUNCTION: reduceStock(productId, quantity)
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Lowers stock by the requested quantity after a valid order or cart purchase.
//   - It ensures that inventory is updated only when a product is in stock.
//
// PARAMETERS:
//   - productId (number) — product to update
//   - quantity (number) — units to subtract
//
// RETURNS:
//   - Updated product row or null if the operation cannot proceed.
//
// WHY THIS APPROACH:
//   - Inventory is a real business rule: stock should never become negative.
//   - This prevents overselling and keeps product availability accurate.
// ────────────────────────────────────────────────────────────────────────
async function reduceStock(productId, quantity) {
  const available = await checkInventory(productId, quantity);

  if (!available) {
    return null;
  }

  const result = await pool.query(
    `UPDATE products
     SET stock = stock - $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [quantity, productId]
  );

  return result.rows[0] || null;
}

module.exports = {
  getProducts,
  getProductById,
  checkInventory,
  reduceStock,
};

// SUMMARY:
// - getProducts handles product listing and filtering.
// - getProductById fetches a single product detail row.
// - checkInventory protects the business from overselling.
// - reduceStock updates stock after a successful sale or order action.
