// ============================================================================
// RegisterPage.jsx: customer registration form
// ============================================================================
// PURPOSE:
//   - Lets a new customer create an account and sign up for the store.
//   - The page submits the registration payload to the backend auth API.
//
// WHY THIS APPROACH:
//   - A controlled form keeps the inputs in React state and makes validation easier
//     before the request is sent.
//   - This mirrors the backend validation pattern and keeps the code easy to reason
//     about for a beginner learning React.
//
// DEPENDENCIES:
//   - React hooks: useState
// ============================================================================

import { useState } from 'react';
import API_URL from '../utils/api';

function RegisterPage() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
  });
  const [message, setMessage] = useState('');
  const API_URL = import.meta.env.VITE_API_URL;

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
      const response = await fetch('${API_URL}/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setMessage('Registration successful');
    } catch (err) {
      setMessage(err.message || 'Registration failed');
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      <h1>Register</h1>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <input
          name="name"
          placeholder="Full name"
          value={form.name}
          onChange={handleChange}
          style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
        />

        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
        />

        <input
          name="phone"
          placeholder="Phone number"
          value={form.phone}
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
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Create account
        </button>
      </form>

      {message && <p style={{ marginTop: '1rem' }}>{message}</p>}
    </div>
  );
}

export default RegisterPage;
