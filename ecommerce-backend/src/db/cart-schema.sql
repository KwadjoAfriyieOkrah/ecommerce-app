-- ============================================================================
-- cart-schema.sql: PostgreSQL schema for user shopping carts
-- ============================================================================
-- PURPOSE:
--   - Stores each customer's cart as a set of product selections.
--   - This lets the storefront add items, update quantities, and calculate totals
--     before checkout without duplicating data across unrelated tables.
--
-- WHY THIS APPROACH:
--   - A cart is naturally a many-to-many relationship between users and products.
--   - This table keeps the quantity and timestamps together with each product entry.
--   - Alternative: storing cart data in a single JSON column would be less queryable
--     and harder to enforce constraints or validation.
--
-- DEPENDENCIES:
--   - users table: each cart item belongs to a logged-in customer
--   - products table: each cart item points to a valid product in the catalog
--
-- SECURITY & DATA INTEGRITY:
--   - quantity must always be positive.
--   - each user-product pair is unique, preventing duplicate cart rows.
--   - foreign keys protect against orphaned cart items.
-- ============================================================================

CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, product_id)
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
-- WHY THIS INDEX EXISTS:
--   - The cart is usually read by user_id, and this helps fetch the current cart
--     quickly for a logged-in shopper.
CREATE INDEX idx_cart_items_user_id ON cart_items (user_id);

-- WHY THIS INDEX EXISTS:
--   - Product lookups in the cart often happen while validating stock or updating
--     a specific item quantity.
CREATE INDEX idx_cart_items_product_id ON cart_items (product_id);

-- ---------------------------------------------------------------------------
-- NOTES
-- ---------------------------------------------------------------------------
-- The cart is intentionally kept as a normalized table of user-product rows.
-- This makes it easy to calculate totals, enforce stock validation, and support
-- future features like saved carts or wishlist entries.
