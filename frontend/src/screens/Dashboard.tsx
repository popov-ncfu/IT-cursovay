import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth';
import { fetchAuditLogs } from '../api/audit';
import { fetchItems } from '../api/items';
import { fetchNotifications } from '../api/notifications';
import { AuditLog, Item, Notification } from '../types/inventory';

export default function Dashboard() {
  const nav = useNavigate();
  const { user, logout, loading } = useAuth();

  const [lowStockItems, setLowStockItems] = useState<Item[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<Notification[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<AuditLog[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      // If auth provider couldn't load user, bounce to login.
      nav('/login');
    }
  }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    void (async () => {
      const [itemsRes, notificationsRes, auditRes] = await Promise.all([
        fetchItems({ take: 100, skip: 0 }),
        fetchNotifications({ isRead: false, take: 10 }),
        fetchAuditLogs({ entity: 'Transaction', take: 10 }),
      ]);

      const lows = itemsRes.items.filter((i) => i.threshold > 0 && i.quantity < i.threshold);
      setLowStockItems(lows);
      setUnreadNotifications(notificationsRes.notifications);
      setRecentTransactions(auditRes.auditLogs);
    })().finally(() => setDataLoading(false));
  }, [user]);

  const unreadCount = useMemo(
    () => unreadNotifications.filter((n) => n.isRead === false).length,
    [unreadNotifications],
  );

  const formatDate = (input: string) => new Date(input).toLocaleString();

  const lowStockSummary = useMemo(() => {
    return lowStockItems.slice(0, 6);
  }, [lowStockItems]);

  return (
    <div style={{ padding: 16, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/items">Items</Link>
        </div>
      </div>

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

      <button
        onClick={() => void logout()}
        disabled={loading}
        type="button"
        style={{ marginBottom: 16 }}
      >
        {loading ? 'Signing out...' : 'Logout'}
      </button>

      {dataLoading ? (
        <div>Loading dashboard...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          <div style={{ border: '1px solid #e5e5e5', borderRadius: 10, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Low stock</h3>
            <div style={{ marginBottom: 12 }}>
              <b>Total low-stock:</b> {lowStockItems.length}
            </div>
            {lowStockSummary.length === 0 ? (
              <div>No low-stock items.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {lowStockSummary.map((it) => (
                  <Link key={it.id} to={`/items/${it.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ fontWeight: 600 }}>{it.name}</div>
                      <div style={{ color: '#b45309', fontWeight: 700 }}>
                        {it.quantity}/{it.threshold}
                      </div>
                    </div>
                  </Link>
                ))}
                {lowStockItems.length > lowStockSummary.length ? (
                  <div style={{ opacity: 0.7 }}>
                    +{lowStockItems.length - lowStockSummary.length} more in Items list
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div style={{ border: '1px solid #e5e5e5', borderRadius: 10, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Notifications</h3>
            <div style={{ marginBottom: 12 }}>
              <b>Unread:</b> {unreadCount}
            </div>
            {unreadNotifications.length === 0 ? (
              <div>No unread notifications.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {unreadNotifications.slice(0, 4).map((n) => (
                  <div key={n.id} style={{ border: '1px solid #f0f0f0', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontWeight: 600 }}>{n.message}</div>
                    <div style={{ marginTop: 6, color: '#666', fontSize: 12 }}>
                      {formatDate(n.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ gridColumn: '1 / -1', border: '1px solid #e5e5e5', borderRadius: 10, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Last operations</h3>
            {recentTransactions.length === 0 ? (
              <div>No operations yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentTransactions.map((log) => {
                  const beforeQty = (log.changes?.before?.quantity as number | undefined) ?? undefined;
                  const afterQty = (log.changes?.after?.quantity as number | undefined) ?? undefined;
                  const delta = beforeQty !== undefined && afterQty !== undefined ? afterQty - beforeQty : undefined;
                  const qty = log.changes?.request?.quantity as number | undefined;

                  return (
                    <div
                      key={log.id}
                      style={{
                        border: '1px solid #f0f0f0',
                        borderRadius: 10,
                        padding: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>
                        {log.action}
                        {qty !== undefined ? ` (${qty})` : ''}
                        {log.itemId ? (
                          <span style={{ marginLeft: 8 }}>
                            item:{' '}
                            <Link to={`/items/${log.itemId}`} style={{ marginLeft: 6 }}>
                              {log.itemId}
                            </Link>
                          </span>
                        ) : null}
                      </div>
                      <div style={{ color: '#666', fontSize: 12, textAlign: 'right' }}>
                        {formatDate(log.createdAt)}
                        {delta !== undefined ? (
                          <div style={{ marginTop: 4 }}>
                            delta: {delta > 0 ? '+' : ''}
                            {delta}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

