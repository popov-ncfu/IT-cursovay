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
      setError(err?.response?.data?.message ?? err?.message ?? 'Register failed');
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 420 }}>
      <h2>Register</h2>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="new-password"
        />
        {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}
        <button disabled={loading} type="submit">
          {loading ? 'Creating...' : 'Create account'}
        </button>
      </form>
      <div style={{ marginTop: 12 }}>
        Have an account? <a href="/login">Login</a>
      </div>
    </div>
  );
}

