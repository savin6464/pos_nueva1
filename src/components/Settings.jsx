import { useState } from 'react';
import IngredientSettings from './IngredientSettings.jsx';
import { money } from '../utils.js';

// Owner-only settings: menu items and the owner password.
export default function Settings({ data, act }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cat, setCat] = useState('');
  const [stock, setStock] = useState('');
  const [menuErr, setMenuErr] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [pMsg, setPMsg] = useState(null);

  const cats = Array.from(new Set(data.menu.map((m) => m.cat)));

  const addItem = (e) => {
    e.preventDefault();
    const pr = Math.round(parseFloat(price) * 100) / 100;
    if (!name.trim()) {
      setMenuErr('Give the item a name.');
      return;
    }
    if (!(pr > 0)) {
      setMenuErr('Enter a price above zero.');
      return;
    }
    let st = parseInt(stock, 10);
    if (isNaN(st) || st < 0) st = 0;
    act.addMenu(name.trim(), pr, cat.trim() || 'Other', Math.min(9999, st));
    setName('');
    setPrice('');
    setStock('');
    setMenuErr('');
  };

  const changePw = (e) => {
    e.preventDefault();
    if (p1.length < 4) {
      setPMsg({ err: true, t: 'Use at least 4 characters.' });
      return;
    }
    if (p1 !== p2) {
      setPMsg({ err: true, t: 'The two entries do not match.' });
      return;
    }
    act.setPassword(p1);
    setP1('');
    setP2('');
    setPMsg({ err: false, t: 'Password changed.' });
  };

  return (
    <div className="stack">
    <div className="two">
      <section className="panel" aria-label="Menu items">
        <div className="panel-head">
          <h2>Menu items</h2>
          <span className="eyebrow">{data.menu.length} items</span>
        </div>
        <form onSubmit={addItem} style={{ marginBottom: '14px' }}>
          <div className="formrow">
            <div>
              <label htmlFor="mi-name">Name</label>
              <input
                id="mi-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Siopao asado"
              />
            </div>
            <div>
              <label htmlFor="mi-price">Price (PHP)</label>
              <input
                id="mi-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="45"
              />
            </div>
            <div>
              <label htmlFor="mi-cat">Category</label>
              <input
                id="mi-cat"
                list="cat-list"
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                placeholder="Snacks"
              />
              <datalist id="cat-list">
                {cats.map((c) => (
                  <option key={c} value={c}></option>
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="mi-stock">Starting stock</label>
              <input
                id="mi-stock"
                type="number"
                min="0"
                step="1"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
              />
            </div>
            <button className="btn primary" type="submit">
              Add item
            </button>
          </div>
          {menuErr ? (
            <p className="err" role="alert" style={{ marginTop: '8px' }}>
              {menuErr}
            </p>
          ) : null}
        </form>
        <div>
          {data.menu.map((m) => (
            <div className="mrow" key={m.id}>
              <div>
                <div className="nm">{m.name}</div>
                <div className="hint">{m.cat}</div>
              </div>
              <span className="mono">{money(m.price)}</span>
              <button
                className="btn sm outline-danger"
                aria-label={'Remove ' + m.name}
                onClick={() => act.removeMenu(m.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="panel" aria-label="Owner password">
        <div className="panel-head">
          <h2>Owner password</h2>
        </div>
        <form
          onSubmit={changePw}
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <div>
            <label htmlFor="np1">New password</label>
            <input
              id="np1"
              type="password"
              autoComplete="new-password"
              value={p1}
              onChange={(e) => {
                setP1(e.target.value);
                setPMsg(null);
              }}
            />
          </div>
          <div>
            <label htmlFor="np2">Repeat new password</label>
            <input
              id="np2"
              type="password"
              autoComplete="new-password"
              value={p2}
              onChange={(e) => {
                setP2(e.target.value);
                setPMsg(null);
              }}
            />
          </div>
          {pMsg ? (
            <p className={pMsg.err ? 'err' : 'ok'} role="status">
              {pMsg.t}
            </p>
          ) : null}
          <div>
            <button className="btn primary" type="submit">
              Change password
            </button>
          </div>
        </form>
        <p className="hint" style={{ marginTop: '12px' }}>
          Data is saved in this browser only. Use the same device and browser for the worker and
          owner windows.
        </p>
      </section>
    </div>
    <IngredientSettings data={data} act={act} />
    </div>
  );
}
