import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCategories, fetchItems, fetchLocations } from '../api/items';
import { Item } from '../types/inventory';

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
    <div style={{ padding: 16, maxWidth: 900 }}>
      <h2>Items</h2>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          placeholder="Search name/description"
          value={q}
          onChange={(e) => {
            setSkip(0);
            setQ(e.target.value);
          }}
        />

        <select
          value={categoryId}
          onChange={(e) => {
            setSkip(0);
            setCategoryId(e.target.value);
          }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={locationId}
          onChange={(e) => {
            setSkip(0);
            setLocationId(e.target.value);
          }}
        >
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : items.length === 0 ? (
        <div>No items found.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/items/${item.id}`}
              style={{
                textDecoration: 'none',
                border: '1px solid #e5e5e5',
                borderRadius: 8,
                padding: 12,
                background: isLowStock(item) ? '#fff7f0' : '#fff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontWeight: 600, color: '#111' }}>{item.name}</div>
                {isLowStock(item) ? (
                  <div style={{ color: '#b45309', fontWeight: 600 }}>LOW</div>
                ) : null}
              </div>
              <div style={{ marginTop: 8 }}>
                <b>Quantity:</b> {item.quantity}
              </div>
              <div>
                <b>Threshold:</b> {item.threshold}
              </div>
              <div style={{ marginTop: 8 }}>
                <b>Location:</b> {item.locationId}
              </div>
            </Link>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
        <button
          type="button"
          disabled={pageIndex <= 0 || loading}
          onClick={() => setSkip(Math.max(0, skip - take))}
        >
          Prev
        </button>
        <div>
          Page {pageIndex + 1} / {pageCount}
        </div>
        <button
          type="button"
          disabled={pageIndex >= pageCount - 1 || loading}
          onClick={() => setSkip(Math.min(total - take, skip + take))}
        >
          Next
        </button>
      </div>
    </div>
  );
}

