// ============================================================================
// ProductsPage.jsx: storefront product listing page
// ============================================================================
// PURPOSE:
//   - Fetches products from the backend and displays them in a catalog layout.
//   - This is the main shopping page where customers browse products and decide
//     what to add to their cart.
//
// WHY THIS APPROACH:
//   - React components can manage loading and error states cleanly with useState and
//     useEffect.
//   - Fetching data on mount matches the component lifecycle pattern and keeps the
//     UI responsive.
//
// DEPENDENCIES:
//   - React hooks: useEffect, useState
// ============================================================================

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const categories = ['all', 'electronics', 'fashion', 'home', 'accessories'];

function ProductsPage() {
  const navigate = useNavigate();
  const { addItemToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const query = selectedCategory === 'all' ? '' : `?category=${encodeURIComponent(selectedCategory)}`;
        const response = await fetch(`http://localhost:5000/api/products${query}`);

        if (!response.ok) {
          throw new Error('Unable to load products');
        }

        const data = await response.json();
        const nextProducts = [...(data.products || [])];

        if (sortBy === 'low-high') {
          nextProducts.sort((a, b) => a.price_cents - b.price_cents);
        } else if (sortBy === 'high-low') {
          nextProducts.sort((a, b) => b.price_cents - a.price_cents);
        } else if (sortBy === 'name') {
          nextProducts.sort((a, b) => a.name.localeCompare(b.name));
        }

        setProducts(nextProducts);
      } catch (err) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [selectedCategory, sortBy]);

  const handleExploreClick = () => {
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return <div className="storefront-shell"><p className="status-message">Loading products...</p></div>;
  }

  if (error) {
    return <div className="storefront-shell"><p className="status-message error-message">{error}</p></div>;
  }

  return (
    <div className="storefront-shell">
      <section className="storefront-hero">
        <div className="hero-copy">
          <p className="eyebrow">Veloura</p>
          <h1>Everyday essentials, elevated.</h1>
          <p className="hero-text">
            Thoughtful pieces for the way you live now — more comfortable, more functional, and designed to fit beautifully into your daily routine.
          </p>
          <div className="hero-actions">
            <button type="button" className="primary-cta" onClick={handleExploreClick}>
              Shop now
            </button>
            <button type="button" className="secondary-cta" onClick={() => navigate('/products/1')}>
              Best sellers
            </button>
            <span className="stat-pill">{products.length} picks for you</span>
          </div>
        </div>

        <div className="hero-highlight">
          <div className="highlight-card">
            <span className="highlight-label">Free shipping</span>
            <strong>On orders over $75</strong>
          </div>
          <div className="highlight-card">
            <span className="highlight-label">Premium finish</span>
            <strong>Thoughtful design in every detail</strong>
          </div>
          <div className="highlight-card">
            <span className="highlight-label">Secure checkout</span>
            <strong>Protected by modern auth flow</strong>
          </div>
        </div>
      </section>

      <div className="catalog-header" id="catalog">
        <div>
          <p className="section-kicker">Featured products</p>
          <h2>Made for everyday routines.</h2>
        </div>
        <span className="catalog-badge">New arrivals</span>
      </div>

      <div className="catalog-toolbar">
        <div className="filter-row" aria-label="Product categories">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={selectedCategory === category ? 'filter-chip active' : 'filter-chip'}
              onClick={() => setSelectedCategory(category)}
            >
              {category === 'all' ? 'All items' : category}
            </button>
          ))}
        </div>

        <label className="sort-control">
          <span>Sort by</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="featured">Featured</option>
            <option value="low-high">Price: Low to High</option>
            <option value="high-low">Price: High to Low</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      <div className="catalog-grid">
        {products.map((product) => (
          <article key={product.id} className="product-card">
            <div className="product-image-wrap">
              <img
                src={product.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80'}
                alt={product.name}
                className="product-image"
              />
            </div>

            <div className="product-meta">
              <div>
                <p className="product-category">{product.category}</p>
                <h3>{product.name}</h3>
              </div>
              <strong className="price-tag">${(product.price_cents / 100).toFixed(2)}</strong>
            </div>

            <p className="product-description">{product.description}</p>

            <div className="product-actions">
              <Link to={`/products/${product.id}`} className="view-details-btn">
                View details
              </Link>
              <button
                type="button"
                className="add-to-cart-btn"
                onClick={async () => {
                  const result = await addItemToCart(product.id, 1);

                  if (result.error) {
                    alert(result.error);
                    return;
                  }

                  navigate('/cart');
                }}
              >
                Add to cart
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default ProductsPage;
