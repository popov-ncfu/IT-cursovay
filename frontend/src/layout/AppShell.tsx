import { PropsWithChildren, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../state/auth';

type Props = PropsWithChildren<{
  title?: string;
}>;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export default function AppShell({ title, children }: Props) {
  const { user, logout, loading } = useAuth();
  const loc = useLocation();

  const showNav = useMemo(() => {
    // If user is not present yet, keep layout but hide actions.
    return Boolean(user);
  }, [user]);

  const right = useMemo(() => {
    if (!user) return null;
    return (
      <div className="pageTitleRight">
        <span className="badge">
          {user.email}
          <span className="subtle" style={{ marginLeft: 6 }}>
            {user.role}
          </span>
        </span>
        <button className="btn btnSm btnDanger" type="button" disabled={loading} onClick={() => void logout()}>
          {loading ? 'Выходим…' : 'Выйти'}
        </button>
      </div>
    );
  }, [loading, logout, user]);

  return (
    <>
      <div className="topbar">
        <div className="topbarInner">
          <div className="row" style={{ flex: 1 }}>
            <div className="brand">
              <span className="brandDot" />
              InventoryFlow
            </div>
            {showNav ? (
              <nav className="nav" aria-label="Основная навигация">
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) => cx('navLink', isActive && 'navLinkActive')}
                  aria-current={loc.pathname === '/dashboard' ? 'page' : undefined}
                >
                  Дашборд
                </NavLink>
                <NavLink
                  to="/items"
                  className={({ isActive }) => cx('navLink', isActive && 'navLinkActive')}
                  aria-current={loc.pathname.startsWith('/items') ? 'page' : undefined}
                >
                  Товары
                </NavLink>
                <NavLink
                  to="/transactions"
                  className={({ isActive }) => cx('navLink', isActive && 'navLinkActive')}
                  aria-current={loc.pathname === '/transactions' ? 'page' : undefined}
                >
                  Операции
                </NavLink>
                {user?.role === 'ADMIN' ? (
                  <NavLink
                    to="/admin/users"
                    className={({ isActive }) => cx('navLink', isActive && 'navLinkActive')}
                    aria-current={loc.pathname.startsWith('/admin') ? 'page' : undefined}
                  >
                    Админ
                  </NavLink>
                ) : null}
              </nav>
            ) : (
              <div />
            )}
          </div>

          {right}
        </div>
      </div>

      <div className="container">
        {title ? (
          <div className="pageTitle">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h2>{title}</h2>
              <div className="subtle">Быстрые действия, чистые данные, меньше кликов.</div>
            </div>
          </div>
        ) : null}
        {children}
      </div>
    </>
  );
}

