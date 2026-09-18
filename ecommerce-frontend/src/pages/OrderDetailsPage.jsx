// ============================================================================
// OrderDetailsPage.jsx: details for a single authenticated order
// ============================================================================
// PURPOSE:
//   - Shows one order in detail, including the shipping address, status, total,
//     and ordered item list.
//   - This page is reached from the account dashboard to make order tracking more
//     user-friendly.
//
// WHY THIS APPROACH:
//   - Each purchase deserves a dedicated screen so customers can inspect a specific
//     order without losing context.
//   - React route params let us fetch the order by id cleanly.
//
// DEPENDENCIES:
//   - React hooks: useEffect, useState
//   - react-router-dom: useParams, useNavigate
//   - ../context/AuthContext: current session for Authorization header
// ============================================================================

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_URL from '../utils/api';

function OrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`${API_URL}/api/products/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            logout();
            navigate('/login', { replace: true });
            return;
          }

          throw new Error('Unable to load order details');
        }

        const data = await response.json();
        setOrder(data.order);
      } catch (error) {
        console.error('Order detail fetch failed:', error);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchOrder();
      return;
    }

    navigate('/login', { replace: true });
  }, [id, token, logout, navigate]);

  if (loading) {
    return <p>Loading order details...</p>;
  }

  if (!order) {
    return <p>Order not found.</p>;
  }

  const items = order.items || [];

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 6px 20px rgba(15, 23, 42, 0.08)',
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/account')}
          style={{
            marginBottom: '1rem',
            border: 'none',
            background: 'transparent',
            color: '#2563eb',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          ← Back to account
        </button>

        <h1>Order #{order.id}</h1>
        <p>Status: {order.status}</p>
        <p>Shipping address: {order.shipping_address}</p>
        <p>Total: ${(order.total_cents / 100).toFixed(2)}</p>
      </section>

      <section
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 6px 20px rgba(15, 23, 42, 0.08)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Items</h2>

        {items.length === 0 ? (
          <p>No items found for this order.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.85rem' }}>
            {items.map((item, index) => (
              <div
                key={`${item.product_id}-${index}`}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.9rem 1rem',
                }}
              >
                <p style={{ margin: 0 }}><strong>Product ID:</strong> {item.product_id}</p>
                <p style={{ margin: '0.4rem 0 0' }}><strong>Quantity:</strong> {item.quantity}</p>
                <p style={{ margin: '0.4rem 0 0' }}>
                  <strong>Unit price:</strong> ${(item.price_cents / 100).toFixed(2)}
                </p>
                <p style={{ margin: '0.4rem 0 0' }}>
                  <strong>Line total:</strong> ${(item.line_total_cents / 100).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default OrderDetailsPage;
