// ============================================================================
// App.jsx: root application shell for the storefront UI
// ============================================================================
// PURPOSE:
//   - Creates the React app shell and the basic route structure for the storefront.
//   - This is the entry point that wires together the public pages and navigation.
//
// WHY THIS APPROACH:
//   - React lets us compose a single-page app from small components and route-based
//     pages.
//   - A simple root layout is enough for the early phase while we build the product
//     list and auth flow.
//
// DEPENDENCIES:
//   - react-router-dom: route definitions and navigation links
//   - ./pages/ProductsPage: public product listing page
//   - ./pages/LoginPage: customer login form
//   - ./pages/RegisterPage: new customer signup form
//   - ./components/Navbar: global navigation bar
// ============================================================================

import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AccountPage from './pages/AccountPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderDetailsPage from './pages/OrderDetailsPage';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="app-shell">
          <Navbar />

          <main className="page-content">
            <Routes>
              <Route path="/" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <AccountPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cart"
                element={
                  <ProtectedRoute>
                    <CartPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account/orders/:id"
                element={
                  <ProtectedRoute>
                    <OrderDetailsPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
