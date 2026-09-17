-- ============================================================================
-- seed-products.sql: realistic storefront product data for PostgreSQL
-- ============================================================================
-- PURPOSE:
--   - Populates the products table with a premium-looking catalog for portfolio
--     presentation and live storefront testing.
--   - This script clears the current catalog and re-seeds it with a modern product
--     mix that works well for a portfolio or client-facing demo.
--
-- HOW TO RUN:
--   psql "postgresql://postgres:stephen2120@localhost:5432/ecommerce_db" -f src/db/seed-products.sql
--
-- WHY THIS APPROACH:
--   - The script is repeatable, easy to inspect, and quick to run during demos.
--   - It keeps the product catalog realistic and portfolio-friendly without needing
--     a custom Node script or extra packages.
-- ============================================================================

BEGIN;

DELETE FROM payments;
DELETE FROM order_items;
DELETE FROM cart_items;
DELETE FROM orders;
DELETE FROM products;

ALTER SEQUENCE products_id_seq RESTART WITH 1;

INSERT INTO products (
  name,
  description,
  price_cents,
  stock,
  category,
  image_url,
  is_active
)
VALUES
  (
    'Aero Wireless Headphones',
    'Premium over-ear headphones with active noise cancellation, all-day battery life, and a soft-touch finish.',
    29999,
    32,
    'electronics',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80',
    TRUE
  ),
  (
    'Luma Smartwatch Pro',
    'A modern fitness-focused smartwatch with heart-rate monitoring, GPS tracking, and a polished aluminum body.',
    24999,
    24,
    'electronics',
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=80',
    TRUE
  ),
  (
    'Terra Ceramic Bottle',
    'Stay hydrated in style with a double-wall insulated bottle designed for workdays, hikes, and everyday errands.',
    8999,
    48,
    'home',
    'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80',
    TRUE
  ),
  (
    'Northline Backpack',
    'Minimal commuter backpack with padded sleeves, weather-resistant fabric, and enough room for a laptop and day gear.',
    15999,
    18,
    'accessories',
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80',
    TRUE
  ),
  (
    'Summit Running Sneakers',
    'Lightweight performance sneakers built for comfort, traction, and a modern everyday look.',
    11999,
    41,
    'fashion',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
    TRUE
  ),
  (
    'Harbor Desk Lamp',
    'A sleek desk lamp with adjustable lighting, warm ambience, and a clean Scandinavian-inspired silhouette.',
    6999,
    27,
    'home',
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
    TRUE
  ),
  (
    'Horizon Camera Kit',
    'Compact camera bundle for creators and travelers who want crisp photos and easy portability.',
    34999,
    12,
    'electronics',
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80',
    TRUE
  ),
  (
    'Everlane Cotton Tee',
    'Soft everyday cotton tee designed for premium comfort, simple styling, and all-season wear.',
    2499,
    86,
    'fashion',
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
    TRUE
  ),
  (
    'Nova Coffee Maker',
    'Brew café-style coffee at home with programmable settings, a compact footprint, and smooth performance.',
    18999,
    16,
    'home',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
    TRUE
  ),
  (
    'Pulse Wireless Earbuds',
    'Pocket-sized earbuds with rich sound, water resistance, and a quick-charge case for busy lifestyles.',
    12999,
    35,
    'electronics',
    'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=900&q=80',
    TRUE
  );

COMMIT;
