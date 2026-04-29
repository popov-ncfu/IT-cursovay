import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchAuditLogs } from '../api/audit';
import { fetchItem } from '../api/items';
import { AuditLog, Item } from '../types/inventory';
import AppShell from '../layout/AppShell';

type AuditLogWithDelta = AuditLog & {
  delta?: number;
};

function formatDate(input: string) {
  // Keeping it simple and dependency-free.
  return new Date(input).toLocaleString();
}

export default function ItemCard() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogWithDelta[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    void (async () => {
      const it = await fetchItem(id);
      setItem(it);

      // We only have transaction audit logs implemented on the backend.
      const res = await fetchAuditLogs({ entity: 'Transaction', take: 100 });
      const filtered = res.auditLogs
        .filter((l) => l.itemId === id)
        .map((l) => {
          const beforeQty = l.changes?.before?.quantity as number | undefined;
          const afterQty = l.changes?.after?.quantity as number | undefined;
          const delta = beforeQty !== undefined && afterQty !== undefined ? afterQty - beforeQty : undefined;
          return { ...l, delta };
        });
      setAuditLogs(filtered);
    })()
      .catch(() => nav('/items'))
      .finally(() => setLoading(false));
  }, [id, nav]);

  const header = useMemo(() => {
    if (!item) return '';
    return item.name;
  }, [item]);

  return (
    <AppShell title={header || 'Товар'}>
      <div className="row" style={{ marginBottom: 12 }}>
        <Link to="/items" className="navLink">
          ← Назад к товарам
        </Link>
      </div>

      {loading || !item ? (
        <div className="subtle">Загрузка…</div>
      ) : (
        <>
          <div className="card">
            <div className="cardBody">
              <div className="grid2">
                <div className="stack">
                  <div>
                    <div className="subtle">Количество</div>
                    <div style={{ fontWeight: 900, fontSize: 22 }}>{item.quantity}</div>
                  </div>
                  <div>
                    <div className="subtle">Порог</div>
                    <div style={{ fontWeight: 850 }}>{item.threshold}</div>
                  </div>
                </div>

                <div className="stack">
                  <div>
                    <div className="subtle">Категория</div>
                    <div style={{ fontWeight: 800 }}>{item.category?.name ?? item.categoryId}</div>
                  </div>
                  <div>
                    <div className="subtle">Локация</div>
                    <div style={{ fontWeight: 800 }}>{item.location?.name ?? item.locationId}</div>
                  </div>
                  <div>
                    <div className="subtle">Владелец</div>
                    <div style={{ fontWeight: 800 }}>{item.owner?.email ?? item.ownerId ?? '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pageTitle" style={{ marginTop: 18 }}>
            <h3>Связанные операции (аудит)</h3>
            <span className="badge">Всего: {auditLogs.length}</span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="card">
              <div className="cardBody">
                <div className="subtle">По этому товару ещё нет записей аудита операций.</div>
              </div>
            </div>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {auditLogs.slice(0, 20).map((log) => {
                const type = log.action;
                const qty = log.changes?.request?.quantity as number | undefined;
                const delta = log.delta;
                const badge =
                  type === 'OUT'
                    ? 'badge badgeDanger'
                    : type === 'IN'
                      ? 'badge badgeOk'
                      : 'badge';
                return (
                  <div key={log.id} className="card" style={{ boxShadow: 'none', background: 'rgba(255,255,255,.04)' }}>
                    <div className="cardBody" style={{ padding: 12 }}>
                      <div className="row" style={{ alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span className={badge}>
                            {type}
                            {qty !== undefined ? ` (${qty})` : ''}
                          </span>
                          {delta !== undefined ? (
                            <span className={delta === 0 ? 'badge' : delta > 0 ? 'badge badgeOk' : 'badge badgeDanger'}>
                              изменение {delta > 0 ? '+' : ''}
                              {delta}
                            </span>
                          ) : null}
                        </div>
                        <div className="subtle">{formatDate(log.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

