// ============================================================================
// CheckoutPage.jsx: order checkout form for authenticated shoppers
// ============================================================================
// PURPOSE:
//   - Displays the user cart summary and asks for a shipping address before placing
//     the order.
//   - This is the final step before the backend creates an order from the current
//     cart and empties it.
//
// WHY THIS APPROACH:
//   - The checkout flow is a UI view with a clear step: review cart, submit address,
//     confirm order.
//   - React state handles the shipping address field and the page can show the order
//     result immediately after a successful API call.
//
// DEPENDENCIES:
//   - React hooks: useEffect, useState
//   - react-router-dom: useNavigate
//   - ../context/CartContext: cart state and checkout action
// ============================================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, fetchCart, checkout } = useCart();
  const [shippingAddress, setShippingAddress] = useState('');
  const [message, setMessage] = useState('');
  const [successOrder, setSuccessOrder] = useState(null);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!shippingAddress.trim()) {
      setMessage('Shipping address is required');
      return;
    }

    const result = await checkout(shippingAddress);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    setSuccessOrder(result.order);
    setMessage('Order placed successfully');
  };

  if (successOrder) {
    return (
      <div>
        <h1>Order placed</h1>
        <p>Order ID: {successOrder.id}</p>
        <p>Total: ${(successOrder.total_cents / 100).toFixed(2)}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            padding: '0.8rem 1rem',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Continue shopping
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1>Checkout</h1>

      <div
        style={{
          background: '#fff',
          padding: '1rem',
          borderRadius: '12px',
          boxShadow: '0 6px 20px rgba(15, 23, 42, 0.08)',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Order summary</h2>
        <p>Items: {cart.item_count || 0}</p>
        <p>Total: ${(cart.subtotal_cents / 100).toFixed(2)}</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <textarea
          value={shippingAddress}
          onChange={(event) => setShippingAddress(event.target.value)}
          placeholder="Shipping address"
          rows={5}
          style={{
            padding: '0.8rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            resize: 'vertical',
          }}
        />

        <button
          type="submit"
          style={{
            padding: '0.9rem 1rem',
            background: '#111827',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Place order
        </button>
      </form>

      {message && <p style={{ marginTop: '1rem' }}>{message}</p>}
    </div>
  );
}

export default CheckoutPage;
