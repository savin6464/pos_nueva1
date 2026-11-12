import { useState } from 'react';
import Sales from './Sales.jsx';
import Voided from './Voided.jsx';
import Inventory from './Inventory.jsx';
import Settings from './Settings.jsx';
import { alerts } from '../inventory.js';

// Password screen shown before the owner window opens.
function Gate({ password, onOk }) {
  const [v, setV] = useState('');
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (v === password) {
      onOk();
    } else {
      setErr('That password is not right. Try again.');
      setV('');
    }
  };

  return (
    <form className="panel gate" onSubmit={submit}>
      <div className="eyebrow">Owner window</div>
      <h1>Enter the owner password</h1>
      <p className="muted">Sales history, voided orders and settings are locked.</p>
      <div>
        <label htmlFor="pw">Password</label>
        <input
          id="pw"
          type="password"
          autoComplete="off"
          autoFocus
          value={v}
          onChange={(e) => {
            setV(e.target.value);
            setErr('');
          }}
        />
      </div>
      {err ? (
        <p className="err" role="alert">
          {err}
        </p>
      ) : null}
      <button className="btn primary" type="submit">
        Unlock
      </button>
    </form>
  );
}

// Owner window: Sales | Voided orders | Inventory | Settings.
export default function Owner({ data, unlocked, setUnlocked, act }) {
  const [tab, setTab] = useState('sales');

  if (!unlocked) return <Gate password={data.password} onOk={() => setUnlocked(true)} />;

  const nVoid = data.orders.filter((o) => o.status === 'voided').length;
  const nAlert = alerts(data).count; // low or out-of-stock ingredients and food items

  return (
    <div>
      <div className="owner-bar">
        <div className="seg" role="group" aria-label="Owner sections">
          <button aria-pressed={tab === 'sales'} onClick={() => setTab('sales')}>
            Sales
          </button>
          <button aria-pressed={tab === 'voided'} onClick={() => setTab('voided')}>
            Voided orders {nVoid > 0 ? <span className="count">{nVoid}</span> : null}
          </button>
          <button aria-pressed={tab === 'inventory'} onClick={() => setTab('inventory')}>
            Inventory {nAlert > 0 ? <span className="count">{nAlert}</span> : null}
          </button>
          <button aria-pressed={tab === 'settings'} onClick={() => setTab('settings')}>
            Settings
          </button>
        </div>
      </div>
      {tab === 'sales' ? <Sales data={data} act={act} /> : null}
      {tab === 'voided' ? (
        <Voided data={data} onDelete={act.deleteVoided} onDeleteAll={act.deleteOrders} />
      ) : null}
      {tab === 'inventory' ? <Inventory data={data} act={act} /> : null}
      {tab === 'settings' ? <Settings data={data} act={act} /> : null}
    </div>
  );
}
