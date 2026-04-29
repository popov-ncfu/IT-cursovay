import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth';
import { fetchAuditLogs } from '../api/audit';
import { fetchItems } from '../api/items';
import { fetchNotifications } from '../api/notifications';
import { AuditLog, Item, Notification } from '../types/inventory';
import AppShell from '../layout/AppShell';

export default function Dashboard() {
  const nav = useNavigate();
  const { user, loading } = useAuth();

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
    <AppShell title="Дашборд">
      {dataLoading ? <div className="subtle">Загрузка дашборда…</div> : null}

      <div className="grid2" style={{ marginTop: 10 }}>
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">Низкий остаток</div>
            <span className={lowStockItems.length ? 'badge badgeWarn' : 'badge badgeOk'}>
              {lowStockItems.length ? `Требует внимания: ${lowStockItems.length}` : 'Всё в норме'}
            </span>
          </div>
          <div className="cardBody">
            {lowStockSummary.length === 0 ? (
              <div className="subtle">Нет товаров с низким остатком.</div>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                {lowStockSummary.map((it) => (
                  <Link key={it.id} to={`/items/${it.id}`} className="navLink" style={{ borderRadius: 12 }}>
                    <div className="row" style={{ width: '100%' }}>
                      <div style={{ fontWeight: 750, color: 'var(--text)' }}>{it.name}</div>
                      <span className="badge badgeWarn">
                        {it.quantity}/{it.threshold}
                      </span>
                    </div>
                  </Link>
                ))}
                {lowStockItems.length > lowStockSummary.length ? (
                  <div className="subtle">+{lowStockItems.length - lowStockSummary.length} ещё в списке товаров</div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">Уведомления</div>
            <span className={unreadCount ? 'badge badgeWarn' : 'badge badgeOk'}>
              {unreadCount ? `Непрочитано: ${unreadCount}` : 'Нет'}
            </span>
          </div>
          <div className="cardBody">
            {unreadNotifications.length === 0 ? (
              <div className="subtle">Нет непрочитанных уведомлений.</div>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                {unreadNotifications.slice(0, 4).map((n) => (
                  <div key={n.id} className="card" style={{ boxShadow: 'none', background: 'rgba(255,255,255,.04)' }}>
                    <div className="cardBody" style={{ padding: 12 }}>
                      <div style={{ fontWeight: 750 }}>{n.message}</div>
                      <div className="subtle" style={{ marginTop: 6 }}>
                        {formatDate(n.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="cardHeader">
            <div className="cardTitle">Последние операции</div>
            <span className="badge">Последних: {recentTransactions.length}</span>
          </div>
          <div className="cardBody">
            {recentTransactions.length === 0 ? (
              <div className="subtle">Операций пока нет.</div>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                {recentTransactions.map((log) => {
                  const beforeQty = (log.changes?.before?.quantity as number | undefined) ?? undefined;
                  const afterQty = (log.changes?.after?.quantity as number | undefined) ?? undefined;
                  const delta = beforeQty !== undefined && afterQty !== undefined ? afterQty - beforeQty : undefined;
                  const qty = log.changes?.request?.quantity as number | undefined;

                  return (
                    <div
                      key={log.id}
                      className="card"
                      style={{ boxShadow: 'none', background: 'rgba(255,255,255,.04)' }}
                    >
                      <div className="cardBody" style={{ padding: 12 }}>
                        <div className="row" style={{ alignItems: 'flex-start' }}>
                          <div style={{ fontWeight: 850 }}>
                            {log.action}
                            {qty !== undefined ? ` (${qty})` : ''}
                            {log.itemId ? (
                              <span style={{ marginLeft: 8, fontWeight: 650 }}>
                                <span className="subtle">товар</span>{' '}
                                <Link to={`/items/${log.itemId}`}>{log.itemId}</Link>
                              </span>
                            ) : null}
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div className="subtle">{formatDate(log.createdAt)}</div>
                            {delta !== undefined ? (
                              <div className={delta === 0 ? 'badge' : delta > 0 ? 'badge badgeOk' : 'badge badgeDanger'}>
                                изменение {delta > 0 ? '+' : ''}
                                {delta}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

