-- ============================================================================
-- orders-schema.sql: PostgreSQL schema for purchase orders and order items
-- ============================================================================
-- PURPOSE:
--   - Stores each completed order and the products included in the purchase.
--   - This creates a durable record of what the customer bought, how much they
--     spent, and where the order should be fulfilled.
--
-- WHY THIS APPROACH:
--   - Orders are a real transactional event, so they should be stored separately
--     from the cart, which is temporary and can change before checkout.
--   - Splitting the order into a header row and item rows keeps totals, shipping,
--     and product details organized and queryable.
--
-- DEPENDENCIES:
--   - users table: each order belongs to a customer account
--   - products table: each order item references a product catalog row
--
-- SECURITY & DATA INTEGRITY:
--   - All total values are stored in cents to avoid floating-point mistakes.
--   - Quantity and price are validated so negative or invalid orders are rejected.
--   - Foreign keys prevent orphaned order records.
-- ============================================================================

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'cancelled')),
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    shipping_address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX idx_orders_user_id ON orders (user_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_order_items_product_id ON order_items (product_id);

-- ---------------------------------------------------------------------------
-- NOTES
-- ---------------------------------------------------------------------------
-- The order tables are intentionally separated from the shopping cart because the
-- cart is editable and temporary while an order is a completed business record.
-- This separation also makes it easier to track order history and inventory
-- adjustments after a successful purchase.
