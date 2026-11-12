import { useState } from 'react';
import { Receipt, VoidControl } from './Receipt.jsx';
import { LOW, money, dayKey, sum } from '../utils.js';
import { available, shortage } from '../inventory.js';

// Worker window: receipts (left), menu (centre), current order (right).
export default function Worker({ data, cart, setCart, onAccept, onDecline, onVoid, notify }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [declining, setDeclining] = useState(false);

  const cats = ['All'].concat(Array.from(new Set(data.menu.map((m) => m.cat))));
  const items = data.menu.filter(
    (m) =>
      (cat === 'All' || m.cat === cat) && m.name.toLowerCase().includes(q.trim().toLowerCase())
  );

  const qtyOf = (id) => {
    const c = cart.find((x) => x.id === id);
    return c ? c.qty : 0;
  };
  // The cart after adding one more of an item, used to check stock
  // (ingredients shared by several items in the cart are counted together).
  const withOneMore = (id, name, price) => {
    const f = cart.find((x) => x.id === id);
    if (f) return cart.map((x) => (x.id === id ? { ...x, qty: x.qty + 1 } : x));
    return cart.concat([{ id, name, price, qty: 1 }]);
  };

  const add = (m) => {
    const problem = shortage(data, withOneMore(m.id, m.name, m.price));
    if (problem) {
      notify(problem);
      return;
    }
    setCart((c) => {
      const f = c.find((x) => x.id === m.id);
      if (f) return c.map((x) => (x.id === m.id ? { ...x, qty: Math.min(99, x.qty + 1) } : x));
      return c.concat([{ id: m.id, name: m.name, price: m.price, qty: 1 }]);
    });
  };

  const change = (id, d) => {
    if (d > 0) {
      const x = cart.find((y) => y.id === id);
      const problem = x ? shortage(data, withOneMore(id, x.name, x.price)) : null;
      if (problem) {
        notify(problem);
        return;
      }
    }
    setCart((c) =>
      c.map((x) => (x.id === id ? { ...x, qty: Math.min(99, x.qty + d) } : x)).filter((x) => x.qty > 0)
    );
  };

  const total = sum(cart, (x) => x.price * x.qty);
  const pieces = sum(cart, (x) => x.qty);
  const today = dayKey(new Date());
  const todays = data.orders.filter((o) => dayKey(o.createdAt) === today).slice().reverse();

  const declineClick = () => {
    if (!declining) {
      setDeclining(true);
      setTimeout(() => setDeclining(false), 3000);
      return;
    }
    setDeclining(false);
    onDecline();
  };

  return (
    <div className="till">
      <section className="panel rec" aria-label="Today's receipts">
        <div className="panel-head">
          <h2>Receipts today</h2>
          <span className="eyebrow">{todays.length} issued</span>
        </div>
        <div className="scroll">
          {todays.length === 0 ? (
            <div className="empty">Accepted orders print a receipt here.</div>
          ) : (
            <div className="rlist">
              {todays.map((o) => (
                <Receipt key={o.id} o={o}>
                  <VoidControl o={o} onVoid={onVoid} />
                </Receipt>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="panel menu" aria-label="Menu">
        <div className="panel-head">
          <h2>Menu</h2>
          <span className="eyebrow">Tap an item to add it</span>
        </div>
        <div className="filters">
          <div>
            <label className="sr" htmlFor="search">
              Search menu
            </label>
            <input
              id="search"
              type="search"
              placeholder="Search items"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="chips">
            {cats.map((c) => (
              <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
        {items.length === 0 ? (
          <div className="empty">No items match. Try another search or category.</div>
        ) : (
          <div className="tiles">
            {items.map((m) => {
              const n = qtyOf(m.id);
              const left = available(data, m).servings;
              return (
                <button
                  key={m.id}
                  className={'tile' + (n > 0 ? ' in' : '')}
                  disabled={left <= 0}
                  onClick={() => add(m)}
                >
                  {n > 0 ? <span className="badge">{n}</span> : null}
                  <span className="name">{m.name}</span>
                  <span>
                    <span className="cat">{m.cat}</span>
                    <br />
                    <span className="price">{money(m.price)}</span>
                    {left <= LOW ? (
                      <>
                        <br />
                        <span className="left">{left <= 0 ? 'Out of stock' : left + ' left'}</span>
                      </>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel ord" aria-label="Current order">
        <div className="panel-head">
          <h2>Current order</h2>
          <span className="eyebrow">
            {pieces} {pieces === 1 ? 'item' : 'items'}
          </span>
        </div>
        <div className="scroll">
          {cart.length === 0 ? (
            <div className="empty">Pick items from the menu to start an order.</div>
          ) : (
            cart.map((x) => (
              <div className="line" key={x.id}>
                <div>
                  <div className="nm">{x.name}</div>
                  <div className="each">{money(x.price)} each</div>
                </div>
                <div className="amt">{money(x.price * x.qty)}</div>
                <div className="stepper">
                  <button aria-label={'Decrease ' + x.name} onClick={() => change(x.id, -1)}>
                    -
                  </button>
                  <span aria-live="polite">{x.qty}</span>
                  <button aria-label={'Increase ' + x.name} onClick={() => change(x.id, 1)}>
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="total-row">
          <span className="eyebrow">Total</span>
          <span className="v">{money(total)}</span>
        </div>
        <div className="actions">
          <button className="btn outline-danger" disabled={cart.length === 0} onClick={declineClick}>
            {declining ? 'Tap to discard' : 'Decline'}
          </button>
          <button className="btn primary" disabled={cart.length === 0} onClick={onAccept}>
            Accept order
          </button>
        </div>
      </section>
    </div>
  );
}
