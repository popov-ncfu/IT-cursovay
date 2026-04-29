import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Dashboard from '../screens/Dashboard';
import Login from '../screens/Login';
import Register from '../screens/Register';
import RequireAuth from './RequireAuth';
import { useAuth } from '../state/auth';
import ItemsList from '../screens/ItemsList';
import ItemCard from '../screens/ItemCard';
import Transactions from '../screens/Transactions';
import AdminUsers from '../screens/AdminUsers';

export default function App() {
  const { refreshIfNeeded, accessToken } = useAuth();
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    void refreshIfNeeded().finally(() => setBootstrapped(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!bootstrapped)
    return (
      <div className="authWrap">
        <div className="card authCard">
          <div className="brand" style={{ marginBottom: 10 }}>
            <span className="brandDot" />
            InventoryFlow
          </div>
          <div className="subtle">Загрузка…</div>
        </div>
      </div>
    );

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={accessToken ? '/dashboard' : '/login'} replace />}
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />

      <Route
        path="/items"
        element={
          <RequireAuth>
            <ItemsList />
          </RequireAuth>
        }
      />

      <Route
        path="/items/:id"
        element={
          <RequireAuth>
            <ItemCard />
          </RequireAuth>
        }
      />

      <Route
        path="/transactions"
        element={
          <RequireAuth>
            <Transactions />
          </RequireAuth>
        }
      />

      <Route
        path="/admin/users"
        element={
          <RequireAuth>
            <AdminUsers />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

