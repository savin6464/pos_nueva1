import { OrderRow, DeleteControl, DeleteAll } from './OrderParts.jsx';
import { money, sum } from '../utils.js';

// Owner-only list of voided orders, with delete.
export default function Voided({ data, onDelete, onDeleteAll }) {
  const list = data.orders
    .filter((o) => o.status === 'voided')
    .sort((a, b) => (b.voidedAt || '').localeCompare(a.voidedAt || ''));
  const total = sum(list, (o) => o.total);

  return (
    <section className="panel" aria-label="Voided orders">
      <div className="panel-head">
        <div>
          <h2>Voided orders</h2>
          <p className="hint">
            Workers can void a receipt but never remove it. Only you can delete it here.
          </p>
        </div>
        <div className="head-actions">
          <span className="eyebrow">
            {list.length} voided, {money(total)}
          </span>
          <DeleteAll
            count={list.length}
            scopeLabel="voided orders"
            onConfirm={() => onDeleteAll(list.map((o) => o.id))}
          />
        </div>
      </div>
      {list.length === 0 ? (
        <div className="empty">Nothing has been voided.</div>
      ) : (
        <div className="olist">
          {list.map((o) => (
            <OrderRow key={o.id} o={o}>
              <DeleteControl o={o} onDelete={onDelete} />
            </OrderRow>
          ))}
        </div>
      )}
    </section>
  );
}
