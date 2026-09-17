-- ============================================================================
-- products-schema.sql: PostgreSQL schema for the e-commerce product catalog
-- ============================================================================
-- PURPOSE:
--   - Defines the database structure for selling products in the storefront.
--   - This schema stores product information used by listing, filtering, search,
--     detail views, and future cart and order operations.
--
-- WHY THIS APPROACH:
--   - A relational schema keeps catalog data structured and queryable.
--   - Normalized data reduces repetition and keeps inventory, pricing, and metadata
--     consistent across the app.
--
-- SECURITY & DATA INTEGRITY:
--   - Price is stored in integer cents to avoid floating-point rounding errors.
--   - Inventory values are validated as non-negative integers.
--   - The schema makes product lookup and filtering efficient with indexes.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: products
-- ---------------------------------------------------------------------------
-- WHY THIS TABLE EXISTS:
--   - We need a central catalog of items that can be listed, filtered, searched,
--     and displayed to customers in the storefront.
--   - Product details include the name, description, stock level, category, price,
--     and public image to present the item properly.
--
-- COLUMN EXPLANATIONS:
--   - id: SERIAL is used for an auto-incrementing primary key. Each product gets a
--     unique numeric identifier without needing manual assignment.
--   - name: VARCHAR(255) stores the product name. It is a text field with a limit,
--     which is appropriate for product titles and helps keep indexing efficient.
--   - description: TEXT is used because descriptions can be longer than a short
--     string and may include paragraphs or detailed product information.
--   - price_cents: INTEGER stores the price in cents instead of decimal dollars.
--     Example: $19.99 becomes 1999. This avoids floating-point issues, which can
--     cause subtle rounding bugs in billing and totals.
--   - stock: INTEGER tracks available inventory. It must be non-negative because a
--     product cannot logically have less than zero units in stock.
--   - category: VARCHAR(100) stores a normalized product category such as
--     "electronics" or "fashion". This makes filtering fast and consistent.
--   - image_url: TEXT stores the image path or CDN URL for the product photo.
--   - is_active: BOOLEAN marks whether the product is visible and available for
--     sale. This allows administrators to hide products without deleting them.
--   - created_at: TIMESTAMP WITH TIME ZONE stores when the product was added.
--   - updated_at: TIMESTAMP WITH TIME ZONE stores the last modification time.
--
-- WHY NOT STORE PASSWORDS OR USER DATA HERE:
--   - This table is for catalog data only. It should not contain authentication
--     details or customer data, to keep the data model clean and secure.
--
-- WHY NOT DENORMALIZE:
--   - We avoid duplicating product metadata across related tables because it creates
--     inconsistencies. One canonical products row acts as the source of truth.
--   - This keeps updates centralized and reduces storage waste.
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    category VARCHAR(100) NOT NULL,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
-- WHY INDEXES MATTER:
--   - Without an index, the database would scan every row when a user searches or
--     filters the catalog.
--   - With an index, PostgreSQL can jump directly to likely matches, much like a
--     book index helps you find a topic faster.
--   - Trade-off: indexes take some extra disk space and add a small cost to writes,
--     but they greatly improve product listing and filtering performance.

-- PRODUCT SEARCH BY NAME.
-- - This helps with search endpoints such as GET /api/products?search=laptop.
CREATE INDEX idx_products_name ON products (name);

-- PRODUCT FILTER BY CATEGORY.
-- - A category filter is common in storefronts and should be fast even with many
--   products in the catalog.
CREATE INDEX idx_products_category ON products (category);

-- ACTIVE PRODUCTS ONLY.
-- - Many product pages should only show items that are approved and available.
CREATE INDEX idx_products_active ON products (is_active);

-- ---------------------------------------------------------------------------
-- SECURITY AND SQL INJECTION NOTES
-- ---------------------------------------------------------------------------
-- WHY PARAMETERIZED QUERIES MATTER:
--   - Search terms, categories, and filter values should never be concatenated into
--     SQL strings.
--   - The backend should use parameterized queries such as:
--       SELECT * FROM products WHERE name ILIKE $1 AND category = $2
--   - This prevents SQL injection attempts and keeps user input safe.
--
-- EXAMPLE ATTACK TO AVOID:
--   - User input: "%' OR 1=1 --"
--   - Unsafe SQL: "SELECT * FROM products WHERE name LIKE '%" + search + "%'"
--   - Safe SQL: "SELECT * FROM products WHERE name ILIKE $1"

-- ---------------------------------------------------------------------------
-- SAMPLE PRODUCT INSERTS
-- ---------------------------------------------------------------------------
-- These examples show how products are intended to look in the database.
-- Example: product names and categories are stored as strings; price is in cents.
-- Example data:
--   ('Wireless Headphones', 'Noise cancelling travel headphones', 29999, 25, 'electronics', 'https://example.com/headphones.jpg', true)
--   ('Cotton T-Shirt', 'Soft everyday cotton tee', 2499, 120, 'fashion', 'https://example.com/shirt.jpg', true)

-- End of schema
