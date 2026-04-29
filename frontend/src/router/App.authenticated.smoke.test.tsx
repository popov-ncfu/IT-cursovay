import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

vi.mock('../state/auth', () => {
  return {
    useAuth: () => ({
      accessToken: 'test-access-token',
      user: { userId: 'u1', email: 'test@example.com', role: 'ADMIN' },
      loading: false,
      refreshIfNeeded: () => Promise.resolve(),
      login: vi.fn(),
      register: vi.fn(),
      me: vi.fn(),
      logout: vi.fn(),
    }),
  };
});

vi.mock('../api/items', () => {
  return {
    fetchItems: () => Promise.resolve({ items: [], total: 0, skip: 0, take: 100 }),
  };
});

vi.mock('../api/notifications', () => {
  return {
    fetchNotifications: () => Promise.resolve({ notifications: [], total: 0, skip: 0, take: 10 }),
  };
});

vi.mock('../api/audit', () => {
  return {
    fetchAuditLogs: () => Promise.resolve({ auditLogs: [], total: 0, skip: 0, take: 10 }),
  };
});

describe('App (smoke, authenticated)', () => {
  it('renders Dashboard when authenticated', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Дашборд' })).toBeInTheDocument();
  });
});

