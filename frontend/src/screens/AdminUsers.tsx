import { useEffect, useState } from 'react';
import { useAuth } from '../state/auth';
import { fetchUsers, updateUserRole, UserRole, UserListItem } from '../api/users';
import AppShell from '../layout/AppShell';

const roles: UserRole[] = ['ADMIN', 'MANAGER', 'VIEWER'];

export default function AdminUsers() {
  const { user } = useAuth();

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchUsers();
      setUsers(res);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Не удалось загрузить пользователей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onChangeRole = async (id: string, role: UserRole) => {
    setSavingId(id);
    setError(null);
    try {
      const updated = await updateUserRole(id, role);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Не удалось обновить роль');
    } finally {
      setSavingId(null);
    }
  };

  if (!user)
    return (
      <AppShell title="Админ: пользователи и роли">
        <div className="subtle">Загрузка…</div>
      </AppShell>
    );
  if (user.role !== 'ADMIN')
    return (
      <AppShell title="Админ: пользователи и роли">
        <div className="card">
          <div className="cardBody">
            <div className="cardTitle">Доступ ограничен</div>
            <div className="subtle" style={{ marginTop: 6 }}>
              Управлять пользователями может только ADMIN.
            </div>
          </div>
        </div>
      </AppShell>
    );

  return (
    <AppShell title="Админ: пользователи и роли">
      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

      <div className="card">
        <div className="cardHeader">
          <div className="cardTitle">Пользователи</div>
          <div className="pageTitleRight">
            <span className="badge">Всего: {users.length}</span>
            <button className="btn btnSm" type="button" disabled={loading} onClick={() => void load()}>
              {loading ? 'Обновляем…' : 'Обновить'}
            </button>
          </div>
        </div>
        <div className="cardBody">
          {loading ? (
            <div className="subtle">Загрузка пользователей…</div>
          ) : users.length === 0 ? (
            <div className="subtle">Пользователей нет.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>ID пользователя</th>
                  <th>Роль</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 800 }}>{u.email}</td>
                    <td className="subtle">{u.id}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => void onChangeRole(u.id, e.target.value as UserRole)}
                        disabled={savingId === u.id}
                        style={{ maxWidth: 220 }}
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}

