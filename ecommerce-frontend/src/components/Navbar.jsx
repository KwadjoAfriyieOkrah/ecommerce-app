// ============================================================================
// Navbar.jsx: top navigation for the storefront
// ============================================================================
// PURPOSE:
//   - Shows the main storefront navigation links, making it easy to browse products
//     and move between the login and registration pages.
//
// WHY THIS APPROACH:
//   - The navigation bar is a reusable component and does not need to rebuild every
//     time a page changes.
//   - It keeps the app consistent and prevents each page from re-implementing the
//     same menu markup.
//
// DEPENDENCIES:
//   - react-router-dom: Link component for client-side routing
// ============================================================================

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { cart } = useCart();

  return (
    <header className="topbar">
      <nav className="topbar-inner">
        <Link to="/" className="brand-block" aria-label="Go to homepage">
          <span className="brand-mark">V</span>
          <span>
            <strong>Veloura</strong>
            <small>Everyday living</small>
          </span>
        </Link>

        <div className="nav-actions">
          <div className="nav-links">
            <Link to="/" className="nav-link">Browse</Link>
            <Link to="/cart" className="nav-link cart-link">
              Basket
              <span className="cart-count">{cart?.item_count || 0}</span>
            </Link>
          </div>

          {isAuthenticated ? (
            <div className="auth-group">
              <Link to="/account" className="nav-link account-link">
                {user?.email || 'Account'}
              </Link>
              <button type="button" onClick={logout} className="logout-btn">
                Sign out
              </button>
            </div>
          ) : (
            <div className="auth-group">
              <Link to="/login" className="login-link">Login</Link>
              <Link to="/register" className="register-link">Join now</Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
