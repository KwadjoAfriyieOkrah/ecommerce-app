// ============================================================================
// CartContext.jsx: shared shopping cart state for the storefront
// ============================================================================
// PURPOSE:
//   - Stores the current cart data so the product list, cart page, and checkout page
//     can all read and update the same shopping state.
//   - This avoids passing cart data through many component layers and keeps the app
//     easier to maintain.
//
// WHY THIS APPROACH:
//   - Context is the standard React pattern for global state that belongs to many
//     pages, such as the cart and authentication information.
//   - It is simpler than prop drilling for a small-to-medium app.
//   - Trade-off: a little more setup, but much cleaner than passing cart props on
//     every page and component.
//
// DEPENDENCIES:
//   - React: createContext, useContext, useMemo, useState
// ============================================================================

import { createContext, useContext, useMemo, useState } from 'react';
import API_URL from '../utils/api';

const CartContext = createContext(null);


// ────────────────────────────────────────────────────────────────────────
// FUNCTION: CartProvider({ children })
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Provides cart data and helper methods to all components inside the app.
//   - It keeps the current cart in React state and updates it after every API call.
//
// PARAMETERS:
//   - children (ReactNode) — the subtree that should receive the cart context
//
// RETURNS:
//   - A context provider containing the cart state and action methods
//
// WHY THIS APPROACH:
//   - React Context makes the cart available to multiple routes without rewriting
//     the same fetch logic in every page.
//   - We keep cart state in one place so add, update, remove, and checkout flows all
//     act on the same source of truth.
// ────────────────────────────────────────────────────────────────────────
export function CartProvider({ children }) {
  const [cart, setCart] = useState({
    items: [],
    subtotal_cents: 0,
    item_count: 0,
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');

    return token
      ? {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      : {
          'Content-Type': 'application/json',
        };
  };

  const fetchCart = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setCart({ items: [], subtotal_cents: 0, item_count: 0 });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/cart`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Unable to load cart');
      }

      const data = await response.json();
      setCart(data.cart || { items: [], subtotal_cents: 0, item_count: 0 });
    } catch (error) {
      console.error('Cart fetch failed:', error);
      setCart({ items: [], subtotal_cents: 0, item_count: 0 });
    }
  };

  const addItemToCart = async (productId, quantity = 1) => {
    const token = localStorage.getItem('token');

    if (!token) {
      return { error: 'Login required to add items to cart' };
    }

    const response = await fetch('${API_URL}/api/cart', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ productId, quantity }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Unable to add item to cart' };
    }

    await fetchCart();
    return { success: true, item: data.item };
  };

  const updateItemQuantity = async (productId, quantity) => {
    const token = localStorage.getItem('token');

    if (!token) {
      return { error: 'Login required to update cart' };
    }

    const response = await fetch(`${API_URL}/api/cart/${productId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ quantity }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Unable to update cart item' };
    }

    await fetchCart();
    return { success: true, item: data.item };
  };

  const removeItem = async (productId) => {
    const token = localStorage.getItem('token');

    if (!token) {
      return { error: 'Login required to remove item' };
    }

    const response = await fetch(`${API_URL}/api/cart/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Unable to remove item' };
    }

    await fetchCart();
    return { success: true, result: data.result };
  };

  const checkout = async (shippingAddress) => {
    const token = localStorage.getItem('token');

    if (!token) {
      return { error: 'Login required to checkout' };
    }

    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ shippingAddress }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Checkout failed' };
    }

    setCart({ items: [], subtotal_cents: 0, item_count: 0 });
    return { success: true, order: data.order };
  };

  const value = useMemo(
    () => ({
      cart,
      fetchCart,
      addItemToCart,
      updateItemQuantity,
      removeItem,
      checkout,
    }),
    [cart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}
