import { useState, useEffect } from 'react';
import Worker from './components/Worker.jsx';
import Owner from './components/Owner.jsx';
import { load, save, longDate, rno } from './utils.js';
import { placeOrder, voidInData, round2 } from './inventory.js';

export default function App() {
  const [data, setData] = useState(load);
  const [view, setView] = useState('worker');
  const [unlocked, setUnlocked] = useState(false);
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState('');

  // Save after every change.
  useEffect(() => {
    save(data);
  }, [data]);

  // Hide the toast after a moment.
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Accept: check stock, issue a receipt, take food items and ingredients out of stock.
  const accept = () => {
    if (cart.length === 0) return;
    const res = placeOrder(data, cart, new Date().toISOString());
    if (res.error) {
      setToast(res.error);
      return;
    }
    setData(res.data);
    setCart([]);
    setToast(
      'Receipt ' +
        rno(res.order.no) +
        ' issued' +
        (res.running.length ? '. Running low: ' + res.running.join(', ') : '')
    );
  };

  const decline = () => {
    setCart([]);
    setToast('Order declined');
  };

  // Void: keep the order on record, return its food items and ingredients to stock.
  const voidOrder = (id, reason) => {
    setData((d) => voidInData(d, id, reason, new Date().toISOString()));
    setToast('Receipt voided and kept on record. Stock returned.');
  };

  // Owner actions.
  const act = {
    deleteOrder: (id) => {
      setData((d) => ({ ...d, orders: d.orders.filter((o) => o.id !== id) }));
      setToast('Order deleted');
    },
    deleteOrders: (ids) => {
      const gone = new Set(ids);
      setData((d) => ({ ...d, orders: d.orders.filter((o) => !gone.has(o.id)) }));
      setToast(ids.length + (ids.length === 1 ? ' order' : ' orders') + ' deleted');
    },
    deleteVoided: (id) => {
      setData((d) => ({
        ...d,
        orders: d.orders.filter((o) => !(o.id === id && o.status === 'voided')),
      }));
      setToast('Voided order deleted');
    },
    addMenu: (name, price, cat, stock) => {
      setData((d) => ({
        ...d,
        menu: d.menu.concat([{ id: 'm' + Date.now(), name, price, cat, stock }]),
      }));
      setToast(name + ' added to the menu');
    },
    removeMenu: (id) =>
      setData((d) => ({
        ...d,
        menu: d.menu.filter((m) => m.id !== id),
        // ingredients stop listing a food item that is gone
        ingredients: d.ingredients.map((i) => ({ ...i, uses: i.uses.filter((u) => u.menuId !== id) })),
      })),
    addIngredient: (ing) => {
      setData((d) => ({
        ...d,
        ingredients: d.ingredients.concat([
          { ...ing, id: 'i' + Date.now() + Math.floor(Math.random() * 1000) },
        ]),
      }));
      setToast(ing.name + ' added to ingredients');
    },
    updateIngredient: (id, ing) => {
      setData((d) => ({
        ...d,
        ingredients: d.ingredients.map((i) => (i.id === id ? { ...ing, id } : i)),
      }));
      setToast(ing.name + ' updated');
    },
    removeIngredient: (id) =>
      setData((d) => ({ ...d, ingredients: d.ingredients.filter((i) => i.id !== id) })),
    // delta is in the base unit (pieces or grams); stock never goes below zero
    adjustIngredient: (id, delta) =>
      setData((d) => ({
        ...d,
        ingredients: d.ingredients.map((i) =>
          i.id === id ? { ...i, stock: Math.max(0, round2(i.stock + delta)) } : i
        ),
      })),
    setCat: (id, cat) =>
      setData((d) => ({ ...d, menu: d.menu.map((m) => (m.id === id ? { ...m, cat } : m)) })),
    setStock: (id, v) => {
      let n = parseInt(v, 10);
      if (isNaN(n) || n < 0) n = 0;
      n = Math.min(9999, n);
      setData((d) => ({
        ...d,
        menu: d.menu.map((m) => (m.id === id ? { ...m, stock: n } : m)),
      }));
    },
    setPassword: (pw) => setData((d) => ({ ...d, password: pw })),
  };

  // Leaving the owner window locks it again.
  const switchTo = (v) => {
    if (v !== 'owner') setUnlocked(false);
    setView(v);
  };

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">P</span>Counter POS
        </div>
        <div className="topright">
          <span className="today">{longDate(new Date())}</span>
          <div className="seg" role="group" aria-label="Window">
            <button aria-pressed={view === 'worker'} onClick={() => switchTo('worker')}>
              Worker window
            </button>
            <button aria-pressed={view === 'owner'} onClick={() => switchTo('owner')}>
              Owner window
            </button>
          </div>
        </div>
      </header>
      <main>
        {view === 'worker' ? (
          <Worker
            data={data}
            cart={cart}
            setCart={setCart}
            onAccept={accept}
            onDecline={decline}
            onVoid={voidOrder}
            notify={setToast}
          />
        ) : (
          <Owner data={data} unlocked={unlocked} setUnlocked={setUnlocked} act={act} />
        )}
      </main>
      <div className="toast" role="status" aria-live="polite" hidden={!toast}>
        {toast}
      </div>
    </div>
  );
}
