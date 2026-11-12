import { useState } from 'react';
import { OrderRow, DeleteControl, DeleteAll } from './OrderParts.jsx';
import { money, pad, dayKey, longDate, monthName, compact, sum } from '../utils.js';

// Month calendar. Each day shows its total after voids; click a day to filter.
function Calendar({ view, setView, scope, setScope, byDay, maxNet }) {
  const todayKey = dayKey(new Date());
  const lead = new Date(view.y, view.m, 1).getDay();
  const dim = new Date(view.y, view.m + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < lead; i++) cells.push({ blank: true, k: 'b' + i });
  for (let d = 1; d <= dim; d++) {
    const key = view.y + '-' + pad(view.m + 1) + '-' + pad(d);
    cells.push({ d, key, info: byDay[key] });
  }

  const go = (delta) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const jumpToday = () => {
    const n = new Date();
    setView({ y: n.getFullYear(), m: n.getMonth() });
    setScope({ type: 'day', day: todayKey });
  };

  return (
    <section className="panel" aria-label="Purchase history calendar">
      <div className="cal-head">
        <button className="btn sm" aria-label="Previous month" onClick={() => go(-1)}>
          Prev
        </button>
        <h2>{monthName(view.y, view.m)}</h2>
        <button className="btn sm" aria-label="Next month" onClick={() => go(1)}>
          Next
        </button>
      </div>
      <div className="cal-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => (
          <div className="dow" key={w}>
            {w}
          </div>
        ))}
        {cells.map((c) => {
          if (c.blank) return <div className="day blank" key={c.k}></div>;
          const has = !!c.info;
          const heat = has && maxNet > 0 ? Math.max(0, c.info.net) / maxNet : 0;
          const cls = 'day' + (has ? ' has' : '') + (c.key === todayKey ? ' today' : '');
          return (
            <button
              key={c.key}
              className={cls}
              style={{ '--heat': heat }}
              aria-pressed={scope.type === 'day' && scope.day === c.key}
              aria-label={
                longDate(c.key + 'T12:00:00') +
                (has ? ', total ' + money(c.info.net) + ', ' + c.info.count + ' orders' : ', no orders')
              }
              onClick={() => setScope({ type: 'day', day: c.key })}
            >
              <span className="n">{c.d}</span>
              <span className="a">{has ? compact(c.info.net) : ''}</span>
            </button>
          );
        })}
      </div>
      <div className="scope">
        <button
          className="chip"
          aria-pressed={scope.type === 'day' && scope.day === todayKey}
          onClick={jumpToday}
        >
          Today
        </button>
        <button
          className="chip"
          aria-pressed={scope.type === 'month'}
          onClick={() => setScope({ type: 'month' })}
        >
          Whole month
        </button>
        <button
          className="chip"
          aria-pressed={scope.type === 'all'}
          onClick={() => setScope({ type: 'all' })}
        >
          All history
        </button>
      </div>
      <p className="hint" style={{ marginTop: '10px' }}>
        Each day shows its total after voids. Tap a day to see its orders.
      </p>
    </section>
  );
}

export default function Sales({ data, act }) {
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [scope, setScope] = useState({ type: 'day', day: dayKey(now) });

  const orders = data.orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Per-day totals for the calendar (voided orders are not counted in `net`).
  const byDay = {};
  orders.forEach((o) => {
    const k = dayKey(o.createdAt);
    const r = byDay[k] || (byDay[k] = { net: 0, count: 0 });
    r.count += 1;
    if (o.status === 'active') r.net += o.total;
  });
  const maxNet = Math.max(0, ...Object.keys(byDay).map((k) => byDay[k].net));

  const viewKey = view.y + '-' + pad(view.m + 1);
  const inScope = (o) => {
    const k = dayKey(o.createdAt);
    if (scope.type === 'all') return true;
    if (scope.type === 'month') return k.slice(0, 7) === viewKey;
    return k === scope.day;
  };

  const scoped = orders.filter(inScope);
  const gross = sum(scoped, (o) => o.total);
  const decrease = sum(scoped.filter((o) => o.status === 'voided'), (o) => o.total);
  const net = gross - decrease;
  const voidedN = scoped.filter((o) => o.status === 'voided').length;
  const activeN = scoped.length - voidedN;

  const label =
    scope.type === 'all'
      ? 'All history'
      : scope.type === 'month'
      ? monthName(view.y, view.m)
      : longDate(scope.day + 'T12:00:00');

  return (
    <div className="owner-grid">
      <Calendar
        view={view}
        setView={setView}
        scope={scope}
        setScope={setScope}
        byDay={byDay}
        maxNet={maxNet}
      />
      <div className="stack">
        <div>
          <div className="eyebrow">Showing</div>
          <h2 style={{ fontSize: '22px' }}>{label}</h2>
        </div>
        <div className="stats">
          <div className="stat">
            <div className="eyebrow">Total amount</div>
            <div className="v">{money(net)}</div>
            <div className="s">Before voids: {money(gross)}</div>
          </div>
          <div className="stat dec">
            <div className="eyebrow">Total decrease</div>
            <div className="v">{money(decrease)}</div>
            <div className="s">
              {voidedN} voided {voidedN === 1 ? 'order' : 'orders'}
            </div>
          </div>
          <div className="stat">
            <div className="eyebrow">Accepted orders</div>
            <div className="v">{activeN}</div>
            <div className="s">Still counted in the total</div>
          </div>
        </div>
        <section className="panel" aria-label="Receipts">
          <div className="panel-head">
            <h2>Receipts</h2>
            <div className="head-actions">
              <span className="eyebrow">{scoped.length} in this view</span>
              <DeleteAll
                count={scoped.length}
                scopeLabel={scope.type === 'all' ? 'all history' : label}
                onConfirm={() => act.deleteOrders(scoped.map((o) => o.id))}
              />
            </div>
          </div>
          {scoped.length === 0 ? (
            <div className="empty">
              No receipts for this period. Every accepted order shows up here the moment a worker
              issues it.
            </div>
          ) : (
            <div className="olist">
              {scoped.map((o) => (
                <OrderRow key={o.id} o={o}>
                  <DeleteControl o={o} onDelete={act.deleteOrder} />
                </OrderRow>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
