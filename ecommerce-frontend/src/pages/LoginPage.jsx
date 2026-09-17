// ============================================================================
// LoginPage.jsx: customer login form for the storefront
// ============================================================================
// PURPOSE:
//   - Lets a customer log in with an email and password.
//   - The form sends the credentials to the backend and stores the token locally
//     for authenticated requests.
//
// WHY THIS APPROACH:
//   - React makes form state management straightforward with controlled inputs.
//   - This provides a clean UX for login while keeping auth logic separated from the
//     page layout and navigation.
//
// DEPENDENCIES:
//   - React hooks: useState
// ============================================================================

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [message, setMessage] = useState('');

  if (isAuthenticated) {
    return (
      <div>
        <h1>You are already logged in</h1>
        <button type="button" onClick={() => navigate('/')}>
          Continue shopping
        </button>
      </div>
    );
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await login(form.email, form.password);
      setMessage('Login successful');

      const redirectTo = location.state?.from || '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setMessage(err.message || 'Login failed');
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      <h1>Login</h1>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
        />

        <button
          type="submit"
          style={{
            padding: '0.8rem 1rem',
            background: '#111827',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Login
        </button>
      </form>

      {message && <p style={{ marginTop: '1rem' }}>{message}</p>}
    </div>
  );
}

export default LoginPage;
