import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth';

export default function Login() {
  const nav = useNavigate();
  const { login, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      nav('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Не удалось войти');
    }
  };

  return (
    <div className="authWrap">
      <div className="card authCard">
        <div className="brand" style={{ marginBottom: 14 }}>
          <span className="brandDot" />
          InventoryFlow
        </div>
        <h2 className="authHeading">Вход</h2>
        <div className="subtle" style={{ marginBottom: 14 }}>
          С возвращением. Войдите, чтобы продолжить.
        </div>

        <form onSubmit={onSubmit} className="stack">
          <label>
            Email
            <input
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label>
            Пароль
            <input
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </label>
          {error ? <div className="error">{error}</div> : null}
          <button className="btn btnPrimary" disabled={loading} type="submit">
            {loading ? 'Входим…' : 'Войти'}
          </button>
        </form>

        <div className="subtle" style={{ marginTop: 12 }}>
          Нет аккаунта? <a href="/register">Создать</a>
        </div>
      </div>
    </div>
  );
}

