import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../state/auth';
import { fetchItems, fetchLocations } from '../api/items';
import { createTransaction } from '../api/transactions';
import { CreateTransactionPayload } from '../types/transactions';
import { Item } from '../types/inventory';
import { Location } from '../types/inventory';
import AppShell from '../layout/AppShell';

type TransactionFormType = CreateTransactionPayload['type'];

const transactionTypes: TransactionFormType[] = ['IN', 'OUT', 'MOVE'];

export default function Transactions() {
  const { user } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [type, setType] = useState<TransactionFormType>('IN');
  const [itemId, setItemId] = useState<string>('');
  const [toLocationId, setToLocationId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    void (async () => {
      const [itemsRes, locationsRes] = await Promise.all([
        fetchItems({ take: 200, skip: 0 }),
        fetchLocations(),
      ]);
      setItems(itemsRes.items);
      setLocations(locationsRes);
    })();
  }, []);

  const selectedItem = useMemo(() => items.find((i) => i.id === itemId) ?? null, [items, itemId]);

  useEffect(() => {
    if (!selectedItem) return;

    if (type === 'MOVE') {
      // Backend requires MOVE quantity to equal current item.quantity.
      setQuantity(selectedItem.quantity);
      setToLocationId('');
    } else if (type === 'OUT') {
      setQuantity(Math.min(1, selectedItem.quantity));
      setToLocationId(''); // OUT must not carry location metadata
    } else {
      // IN can optionally carry toLocationId; keep quantity default.
      setQuantity(1);
      setToLocationId('');
    }
  }, [type, selectedItem]);

  useEffect(() => {
    if (!selectedItem) return;

    if (type === 'OUT') {
      setQuantity((q) => Math.min(q, selectedItem.quantity));
    }
    if (type === 'MOVE') {
      setQuantity(selectedItem.quantity);
    }
  }, [selectedItem, type]);

  const canSubmit = useMemo(() => {
    if (!selectedItem) return false;
    if (type === 'MOVE' && !toLocationId) return false;
    if (!quantity || quantity <= 0) return false;
    if (type === 'OUT' && quantity > selectedItem.quantity) return false;
    return true;
  }, [selectedItem, type, toLocationId, quantity]);

  const submit = async () => {
    if (!selectedItem) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const base: CreateTransactionPayload = {
        type,
        quantity,
        itemId: selectedItem.id,
      };

      if (type === 'MOVE') {
        const payload: CreateTransactionPayload = {
          ...base,
          quantity: selectedItem.quantity,
          toLocationId,
        };
        const res = await createTransaction(payload);
        setResult(res);
      } else if (type === 'OUT') {
        const res = await createTransaction({ ...base });
        setResult(res);
      } else {
        const payload: CreateTransactionPayload = {
          ...base,
          // Optional relocation for IN.
          ...(toLocationId ? { toLocationId } : {}),
        };
        const res = await createTransaction(payload);
        setResult(res);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Не удалось выполнить операцию');
    } finally {
      setLoading(false);
    }
  };

  if (!user)
    return (
      <AppShell title="Операции">
        <div className="subtle">Загрузка…</div>
      </AppShell>
    );
  if (user.role === 'VIEWER')
    return (
      <AppShell title="Операции">
        <div className="card">
          <div className="cardBody">
            <div className="cardTitle">Доступ только для чтения</div>
            <div className="subtle" style={{ marginTop: 6 }}>
              Роль VIEWER не может создавать операции.
            </div>
          </div>
        </div>
      </AppShell>
    );

  return (
    <AppShell title="Операции">
      <div className="grid2">
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">Создать операцию</div>
            <span className="badge">{type}</span>
          </div>
          <div className="cardBody">
            <div className="stack" style={{ maxWidth: 560 }}>
              <label>
                Тип
                <select value={type} onChange={(e) => setType(e.target.value as TransactionFormType)}>
                  {transactionTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Товар
                <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
                  <option value="">Выберите товар</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} (qty {it.quantity})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Количество
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  min={0}
                  disabled={type === 'MOVE'}
                />
              </label>

              {type !== 'OUT' ? (
                <label>
                  В локацию
                  <select value={toLocationId} onChange={(e) => setToLocationId(e.target.value)}>
                    <option value="">{type === 'MOVE' ? 'Выберите локацию' : 'Оставить текущую'}</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {selectedItem ? (
                <div className="row" style={{ justifyContent: 'flex-start', gap: 10 }}>
                  <span className="badge">Остаток {selectedItem.quantity}</span>
                  {type === 'MOVE' ? <span className="badge">MOVE переносит весь остаток</span> : null}
                  {type === 'OUT' ? <span className="badge badgeWarn">OUT не может превышать остаток</span> : null}
                </div>
              ) : null}

              {error ? <div className="error">{error}</div> : null}

              <button className="btn btnPrimary" type="button" disabled={!canSubmit || loading} onClick={() => void submit()}>
                {loading ? 'Отправляем…' : 'Создать операцию'}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">Результат</div>
            <span className="badge">Ответ API</span>
          </div>
          <div className="cardBody">
            {result ? (
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            ) : (
              <div className="subtle">Создайте операцию — результат появится здесь.</div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

