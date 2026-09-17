// ============================================================================
// AccountPage.jsx: authenticated customer account dashboard
// ============================================================================
// PURPOSE:
//   - Shows the currently signed-in customer their account information and order
//     history.
//   - This page is the place where the customer can review past purchases and log
//     out in a clean way.
//
// WHY THIS APPROACH:
//   - Account data and order history are naturally grouped together in one page.
//   - A single protected page helps keep the learning flow simple while still
//     proving the auth session works end-to-end.
//
// DEPENDENCIES:
//   - React hooks: useEffect, useState
//   - react-router-dom: useNavigate
//   - ../context/AuthContext: session state and logout helper
// ============================================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AccountPage() {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [profile, setProfile] = useState({ name: '', phone: '', email: '' });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        const [profileResponse, ordersResponse] = await Promise.all([
          fetch('http://localhost:5000/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch('http://localhost:5000/api/orders', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (profileResponse.status === 401 || ordersResponse.status === 401) {
          logout();
          navigate('/login', { replace: true });
          return;
        }

        if (!profileResponse.ok) {
          throw new Error('Unable to load profile');
        }

        if (!ordersResponse.ok) {
          throw new Error('Unable to load order history');
        }

        const profileData = await profileResponse.json();
        const ordersData = await ordersResponse.json();

        setProfile({
          name: profileData.user?.name || '',
          phone: profileData.user?.phone || '',
          email: profileData.user?.email || '',
        });

        setOrders(ordersData.orders || []);
      } catch (error) {
        console.error('Account data fetch failed:', error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchAccountData();
      return;
    }

    navigate('/login', { replace: true });
  }, [token, logout, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to update profile');
      }

      setMessage('Profile updated successfully');
    } catch (error) {
      setMessage(error.message || 'Profile update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <p style={{ margin: 0, color: '#64748b' }}>Account</p>
            <h1 style={{ margin: '0.35rem 0 0' }}>{profile.email || 'Customer'}</h1>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: '0.7rem 1rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </section>

      <section
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 6px 20px rgba(15, 23, 42, 0.08)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Profile</h2>

        <form onSubmit={handleSave} style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              name="name"
              value={profile.name}
              onChange={handleChange}
              style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              name="phone"
              value={profile.phone}
              onChange={handleChange}
              style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              value={profile.email}
              disabled
              style={{
                padding: '0.8rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#475569',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '0.8rem 1rem',
              border: 'none',
              borderRadius: '8px',
              background: '#111827',
              color: '#fff',
              cursor: 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </form>

        {message && <p style={{ marginTop: '1rem' }}>{message}</p>}
      </section>

      <section
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 6px 20px rgba(15, 23, 42, 0.08)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Order history</h2>

        {loading ? (
          <p>Loading orders...</p>
        ) : orders.length === 0 ? (
          <p>You have not placed any orders yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.85rem' }}>
            {orders.map((order) => (
              <div
                key={order.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.9rem 1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <strong>Order #{order.id}</strong>
                  <span>{order.status}</span>
                </div>
                <p style={{ margin: '0.5rem 0 0' }}>
                  Total: ${(order.total_cents / 100).toFixed(2)}
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/account/orders/${order.id}`)}
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.55rem 0.8rem',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#2563eb',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  View details
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AccountPage;
