import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchAuditLogs } from '../api/audit';
import { fetchItem } from '../api/items';
import { AuditLog, Item } from '../types/inventory';

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
    <div style={{ padding: 16, maxWidth: 900 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 16 }}>
        <Link to="/items">Back to items</Link>
        <h2 style={{ margin: 0 }}>{header || 'Item'}</h2>
      </div>

      {loading || !item ? (
        <div>Loading...</div>
      ) : (
        <>
          <div style={{ border: '1px solid #e5e5e5', borderRadius: 10, padding: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <b>Quantity:</b> {item.quantity}
            </div>
            <div style={{ marginBottom: 8 }}>
              <b>Threshold:</b> {item.threshold}
            </div>
            <div style={{ marginBottom: 8 }}>
              <b>Category:</b> {item.category?.name ?? item.categoryId}
            </div>
            <div style={{ marginBottom: 8 }}>
              <b>Location:</b> {item.location?.name ?? item.locationId}
            </div>
            <div>
              <b>Owner:</b> {item.owner?.email ?? item.ownerId ?? '—'}
            </div>
          </div>

          <h3 style={{ marginTop: 24 }}>Related transactions (audit)</h3>
          {auditLogs.length === 0 ? (
            <div>No transaction audit logs for this item yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {auditLogs.slice(0, 20).map((log) => {
                const type = log.action;
                const qty = log.changes?.request?.quantity as number | undefined;
                const delta = log.delta;
                return (
                  <div
                    key={log.id}
                    style={{
                      border: '1px solid #e5e5e5',
                      borderRadius: 10,
                      padding: 12,
                      background: type === 'OUT' ? '#fff7f0' : '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ fontWeight: 700 }}>
                        {type}
                        {qty !== undefined ? ` (${qty})` : ''}
                      </div>
                      <div style={{ color: '#666' }}>{formatDate(log.createdAt)}</div>
                    </div>
                    <div style={{ marginTop: 6, color: '#333' }}>
                      {delta !== undefined
                        ? `Quantity delta: ${delta > 0 ? '+' : ''}${delta}`
                        : 'Quantity delta: —'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

