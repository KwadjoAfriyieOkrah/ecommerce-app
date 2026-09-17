// ============================================================================
// CartPage.jsx: shopping cart page for the storefront
// ============================================================================
// PURPOSE:
//   - Shows the current cart contents, quantity controls, and subtotal.
//   - This is the page where a shopper decides whether to continue shopping or go
//     to checkout.
//
// WHY THIS APPROACH:
//   - A dedicated cart page lets us separate cart reading and editing from product
//     browsing.
//   - React state is handled through the shared CartContext so both the catalog and
//     cart page stay synchronized.
//
// DEPENDENCIES:
//   - React hooks: useEffect, useState
//   - react-router-dom: useNavigate
//   - ../context/CartContext: cart state and helper methods
// ============================================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

function CartPage() {
  const navigate = useNavigate();
  const { cart, fetchCart, updateItemQuantity, removeItem } = useCart();
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleQuantityChange = async (productId, newQuantity) => {
    if (newQuantity <= 0) {
      await removeItem(productId);
      return;
    }

    const result = await updateItemQuantity(productId, newQuantity);

    if (result.error) {
      setMessage(result.error);
    }
  };

  if (!cart.items || cart.items.length === 0) {
    return (
      <div>
        <h1>Your cart is empty</h1>
        <p>Add some products to continue shopping.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Your cart</h1>

      {message && <p style={{ color: 'crimson' }}>{message}</p>}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {cart.items.map((item) => (
          <div
            key={item.product_id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fff',
              padding: '1rem',
              borderRadius: '12px',
              boxShadow: '0 6px 20px rgba(15, 23, 42, 0.08)',
            }}
          >
            <div>
              <h3 style={{ margin: '0 0 0.5rem' }}>{item.name}</h3>
              <p style={{ margin: 0, color: '#475569' }}>
                ${(item.price_cents / 100).toFixed(2)} each
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => handleQuantityChange(item.product_id, item.quantity - 1)}
                style={{ padding: '0.4rem 0.7rem' }}
              >
                -
              </button>

              <span>{item.quantity}</span>

              <button
                type="button"
                onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}
                style={{ padding: '0.4rem 0.7rem' }}
              >
                +
              </button>

              <button
                type="button"
                onClick={() => removeItem(item.product_id)}
                style={{ padding: '0.4rem 0.7rem', color: 'crimson' }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: '1.5rem',
          background: '#fff',
          borderRadius: '12px',
          padding: '1rem',
          boxShadow: '0 6px 20px rgba(15, 23, 42, 0.08)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Subtotal</h2>
        <p style={{ fontSize: '1.4rem', fontWeight: 700 }}>
          ${(cart.subtotal_cents / 100).toFixed(2)}
        </p>

        <button
          type="button"
          onClick={() => navigate('/checkout')}
          style={{
            width: '100%',
            background: '#111827',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Proceed to checkout
        </button>
      </div>
    </div>
  );
}

export default CartPage;
