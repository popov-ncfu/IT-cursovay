import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

vi.mock('../state/auth', () => {
  return {
    useAuth: () => ({
      accessToken: null,
      user: null,
      loading: false,
      refreshIfNeeded: () => Promise.resolve(),
      login: vi.fn(),
      register: vi.fn(),
      me: vi.fn(),
      logout: vi.fn(),
    }),
  };
});

describe('App (smoke)', () => {
  it('renders Login when not authenticated', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
  });
});

