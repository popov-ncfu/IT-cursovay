import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth';

export default function Register() {
  const nav = useNavigate();
  const { register, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await register(email, password);
      nav('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Не удалось зарегистрироваться');
    }
  };

  return (
    <div className="authWrap">
      <div className="card authCard">
        <div className="brand" style={{ marginBottom: 14 }}>
          <span className="brandDot" />
          InventoryFlow
        </div>
        <h2 className="authHeading">Регистрация</h2>
        <div className="subtle" style={{ marginBottom: 14 }}>
          Начните вести складской учёт за пару минут.
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
              autoComplete="new-password"
            />
          </label>
          {error ? <div className="error">{error}</div> : null}
          <button className="btn btnPrimary" disabled={loading} type="submit">
            {loading ? 'Создаём…' : 'Создать аккаунт'}
          </button>
        </form>

        <div className="subtle" style={{ marginTop: 12 }}>
          Уже есть аккаунт? <a href="/login">Войти</a>
        </div>
      </div>
    </div>
  );
}

