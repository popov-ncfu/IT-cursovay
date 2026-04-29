import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCategories, fetchItems, fetchLocations } from '../api/items';
import { Item } from '../types/inventory';
import AppShell from '../layout/AppShell';

function isLowStock(item: Item) {
  return item.threshold > 0 && item.quantity < item.threshold;
}

export default function ItemsList() {
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [skip, setSkip] = useState(0);
  const take = 10;

  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    void (async () => {
      const [cats, locs] = await Promise.all([
        fetchCategories(),
        fetchLocations(),
      ]);
      setCategories(cats);
      setLocations(locs);
    })();
  }, []);

  const params = useMemo(() => {
    return {
      q: q || undefined,
      categoryId: categoryId || undefined,
      locationId: locationId || undefined,
      skip,
      take,
    };
  }, [q, categoryId, locationId, skip]);

  useEffect(() => {
    setLoading(true);
    void fetchItems(params)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [params]);

  const pageCount = Math.max(1, Math.ceil(total / take));
  const pageIndex = Math.floor(skip / take);

  return (
    <AppShell title="Товары">
      <div className="card">
        <div className="cardBody">
          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 2, minWidth: 220 }}>
              <label>
                Поиск
                <input
                  placeholder="Название или описание…"
                  value={q}
                  onChange={(e) => {
                    setSkip(0);
                    setQ(e.target.value);
                  }}
                />
              </label>
            </div>

            <div style={{ flex: 1, minWidth: 180 }}>
              <label>
                Категория
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setSkip(0);
                    setCategoryId(e.target.value);
                  }}
                >
                  <option value="">Все</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ flex: 1, minWidth: 180 }}>
              <label>
                Локация
                <select
                  value={locationId}
                  onChange={(e) => {
                    setSkip(0);
                    setLocationId(e.target.value);
                  }}
                >
                  <option value="">Все</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="divider" />

          <div className="row">
            <span className="subtle">
              Показано {items.length} из {total}
            </span>
            <div className="pageTitleRight">
              <button
                className="btn btnSm"
                type="button"
                disabled={pageIndex <= 0 || loading}
                onClick={() => setSkip(Math.max(0, skip - take))}
              >
                Назад
              </button>
              <span className="badge">
                Страница {pageIndex + 1} / {pageCount}
              </span>
              <button
                className="btn btnSm"
                type="button"
                disabled={pageIndex >= pageCount - 1 || loading}
                onClick={() => setSkip(Math.min(total - take, skip + take))}
              >
                Вперёд
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {loading ? (
          <div className="subtle">Загрузка…</div>
        ) : items.length === 0 ? (
          <div className="card">
            <div className="cardBody">
              <div className="cardTitle">Ничего не найдено</div>
              <div className="subtle" style={{ marginTop: 6 }}>
                Попробуйте изменить фильтры или запрос.
              </div>
            </div>
          </div>
        ) : (
          <div className="grid2">
            {items.map((item) => (
              <Link key={item.id} to={`/items/${item.id}`} className="card" style={{ padding: 0 }}>
                <div className="cardBody">
                  <div className="row">
                    <div style={{ fontWeight: 850, color: 'var(--text)' }}>{item.name}</div>
                    {isLowStock(item) ? (
                      <span className="badge badgeWarn">МАЛО</span>
                    ) : (
                      <span className="badge badgeOk">ОК</span>
                    )}
                  </div>
                  <div className="divider" />
                  <div className="row" style={{ justifyContent: 'flex-start', gap: 10 }}>
                    <span className="badge">Кол-во {item.quantity}</span>
                    <span className="badge">Порог {item.threshold}</span>
                    <span className="badge">Локация {item.locationId}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

