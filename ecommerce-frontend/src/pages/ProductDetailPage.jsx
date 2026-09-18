// ============================================================================
// ProductDetailPage.jsx: premium product detail experience for the storefront
// ============================================================================
// PURPOSE:
//   - Shows one product in a more luxurious layout with image, pricing, features,
//     and a clear purchase path.
//   - This page helps the storefront feel more premium for client-facing portfolio
//     demos and creates a better product storytelling flow.
//
// WHY THIS APPROACH:
//   - A dedicated detail page keeps the storefront feeling more polished than a
//     single crowded catalog card.
//   - It gives users a cleaner decision-making experience before they add an item
//     to the cart.
//
// DEPENDENCIES:
//   - React hooks for fetching data and handling local UI state
//   - react-router-dom for matching the selected product ID
//   - CartContext for the add-to-cart action
// ============================================================================

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import API_URL from '../utils/api';

function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItemToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const API_URL = import.meta.env.VITE_API_URL;
  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await fetch(`${API_URL}/api/products/${id}`);

        if (!response.ok) {
          throw new Error('Unable to load product details');
        }

        const data = await response.json();
        setProduct(data.product || null);
      } catch (err) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) {
      return;
    }

    const result = await addItemToCart(product.id, 1);

    if (result.error) {
      alert(result.error);
      return;
    }

    navigate('/cart');
  };

  if (loading) {
    return (
      <div className="detail-shell">
        <p className="status-message">Loading product details...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="detail-shell">
        <p className="status-message error-message">{error || 'Product not found.'}</p>
      </div>
    );
  }

  return (
    <div className="detail-shell">
      <div className="breadcrumb-row">
        <Link to="/" className="breadcrumb-link">Home</Link>
        <span>/</span>
        <span>{product.category}</span>
      </div>

      <article className="detail-layout">
        <div className="detail-image-panel">
          <img src={product.image_url} alt={product.name} className="detail-image" />
        </div>

        <div className="detail-copy">
          <p className="detail-kicker">{product.category}</p>
          <h1>{product.name}</h1>

          <div className="detail-price-row">
            <strong>${(product.price_cents / 100).toFixed(2)}</strong>
            <span>{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span>
          </div>

          <p className="detail-description">{product.description}</p>

          <div className="detail-badges">
            <span>Free shipping</span>
            <span>Easy returns</span>
            <span>Secure checkout</span>
          </div>

          <div className="detail-actions">
            <button type="button" className="primary-cta detail-primary" onClick={handleAddToCart}>
              Add to basket
            </button>
            <button type="button" className="secondary-cta" onClick={() => navigate('/')}>
              Keep browsing
            </button>
          </div>

          <div className="detail-meta-box">
            <h2>Why it fits your routine</h2>
            <ul>
              <li>Built with everyday comfort in mind, without compromising on quality.</li>
              <li>Designed to work seamlessly through workdays, weekends, and everything in between.</li>
              <li>Simple, functional, and made to feel effortlessly at home in your lifestyle.</li>
            </ul>
          </div>
        </div>
      </article>
    </div>
  );
}

export default ProductDetailPage;
