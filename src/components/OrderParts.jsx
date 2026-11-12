import { useState } from 'react';
import { money, timeStr, dateStr, rno } from '../utils.js';

// Plain list row used in the owner window.
export function OrderRow({ o, children }) {
  const voided = o.status === 'voided';
  return (
    <div className={'orow' + (voided ? ' voided' : '')}>
      <div className="o-no mono">{rno(o.no)}</div>
      <div className="o-when">
        <div>{timeStr(o.createdAt)}</div>
        <div className="hint">{dateStr(o.createdAt)}</div>
      </div>
      <div className="o-items">
        <div className="o-list">{o.items.map((i) => i.qty + ' x ' + i.name).join(', ')}</div>
        {voided ? (
          <div className="o-reason">
            Voided {timeStr(o.voidedAt)}
            {o.reason ? '. Reason: ' + o.reason : ''}
          </div>
        ) : null}
      </div>
      <div className="o-total mono">{money(o.total)}</div>
      <div className="o-status">
        <span className={'pill ' + (voided ? 'out' : 'ok')}>{voided ? 'Voided' : 'Accepted'}</span>
      </div>
      {children ? <div className="o-actions">{children}</div> : null}
    </div>
  );
}

// Delete one order (two-step).
export function DeleteControl({ o, onDelete }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button className="btn sm outline-danger" onClick={() => setOpen(true)}>
        Delete permanently
      </button>
    );
  }
  return (
    <div className="confirm">
      <p className="hint">
        This removes {rno(o.no)} from all totals and cannot be undone.
      </p>
      <div className="row">
        <button className="btn sm danger" onClick={() => onDelete(o.id)}>
          Yes, delete
        </button>
        <button className="btn sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// Delete every order in the current view (two-step).
export function DeleteAll({ count, scopeLabel, onConfirm }) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  if (!open) {
    return (
      <button className="btn sm outline-danger" onClick={() => setOpen(true)}>
        Delete all ({count})
      </button>
    );
  }
  return (
    <div className="confirm">
      <p className="hint">
        Delete all {count} {count === 1 ? 'order' : 'orders'} in {scopeLabel}? They come out of
        every total and this cannot be undone.
      </p>
      <div className="row">
        <button
          className="btn sm danger"
          onClick={() => {
            onConfirm();
            setOpen(false);
          }}
        >
          Yes, delete all
        </button>
        <button className="btn sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
