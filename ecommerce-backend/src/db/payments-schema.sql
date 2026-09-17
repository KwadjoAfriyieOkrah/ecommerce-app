-- ============================================================================
-- payments-schema.sql: PostgreSQL schema for payment records and transaction logs
-- ============================================================================
-- PURPOSE:
--   - Records payment attempts and final transaction details for each completed
--     order.
--   - This is the backend's source of truth for payment status, provider data, and
--     auditability.
--
-- WHY THIS APPROACH:
--   - A dedicated payments table separates payment state from order state and keeps
--     the checkout process auditable and easier to debug.
--   - Alternative: storing payment metadata directly in the orders table would make
--     it harder to track multiple payment attempts or refunds later.
--
-- SECURITY & DATA INTEGRITY:
--   - amount_cents is stored in integer cents to avoid float precision issues.
--   - status is constrained to a known set of states.
--   - each order can have at most one successful payment record, but can have
--     multiple attempts if needed.
-- ============================================================================

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    provider VARCHAR(50) NOT NULL DEFAULT 'stripe',
    transaction_reference VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX idx_payments_order_id ON payments (order_id);
CREATE INDEX idx_payments_user_id ON payments (user_id);
CREATE INDEX idx_payments_status ON payments (status);

-- ---------------------------------------------------------------------------
-- NOTES
-- ---------------------------------------------------------------------------
-- Payment records are intentionally stored separately from the order itself so the
-- application can keep both transaction history and order history without forcing
-- a single table to hold too many responsibilities.
