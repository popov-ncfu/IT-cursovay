import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth';

export default function Dashboard() {
  const nav = useNavigate();
  const { user, logout, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // If auth provider couldn't load user, bounce to login.
      nav('/login');
    }
  }, [loading, user, nav]);

  return (
    <div style={{ padding: 16, maxWidth: 700 }}>
      <h2>Dashboard</h2>

      {user ? (
        <div style={{ marginBottom: 16 }}>
          <div>
            <b>Email:</b> {user.email}
          </div>
          <div>
            <b>Role:</b> {user.role}
          </div>
        </div>
      ) : (
        <div>Loading user...</div>
      )}

      <button onClick={() => void logout()} disabled={loading} type="button">
        {loading ? 'Signing out...' : 'Logout'}
      </button>
    </div>
  );
}

