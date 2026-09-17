// ============================================================================
// ProtectedRoute.jsx: route guard for authenticated-only screens
// ============================================================================
// PURPOSE:
//   - Stops users from entering protected pages when they are not logged in.
//   - It redirects customers to the login page and then sends them back to the
//     page they originally wanted after a successful login.
//
// WHY THIS APPROACH:
//   - The app should not let unauthenticated users hit the cart or checkout routes
//     directly.
//   - Route guards keep the auth rule in one place and prevent duplicate checks in
//     every page.
//
// DEPENDENCIES:
//   - react-router-dom: Navigate and useLocation
//   - ../context/AuthContext: shared authentication state
// ============================================================================

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p>Checking session...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default ProtectedRoute;
