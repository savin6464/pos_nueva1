import { useState } from 'react';
import { money, timeStr, dateStr, rno } from '../utils.js';

// Paper-style receipt. Used in the worker window.
export function Receipt({ o, children }) {
  const voided = o.status === 'voided';
  return (
    <div className="rcpt">
      <div className={'paper' + (voided ? ' voided' : '')}>
        <div className="p-head">
          <strong>RECEIPT {rno(o.no)}</strong>
          <span>{timeStr(o.createdAt)}</span>
        </div>
        <div className="p-sub">{dateStr(o.createdAt)}</div>
        <div className="p-rule"></div>
        <div className="p-body">
          {o.items.map((i) => (
            <div className="p-row" key={i.id}>
              <span className="nm">
                {i.qty} x {i.name}
              </span>
              <span>{money(i.price * i.qty)}</span>
            </div>
          ))}
        </div>
        <div className="p-rule"></div>
        <div className="p-row p-total">
          <span>TOTAL</span>
          <span>{money(o.total)}</span>
        </div>
        {voided ? (
          <div className="p-void-note">
            Voided {timeStr(o.voidedAt)}.{o.reason ? ' Reason: ' + o.reason : ''}
          </div>
        ) : null}
        {voided ? <div className="stamp">VOID</div> : null}
      </div>
      {children}
    </div>
  );
}

// Worker-side void: asks for an optional reason, then keeps the receipt on record.
export function VoidControl({ o, onVoid }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  if (o.status === 'voided') return null;
  if (!open) {
    return (
      <button className="btn sm outline-danger" onClick={() => setOpen(true)}>
        Void receipt
      </button>
    );
  }
  return (
    <div className="confirm">
      <label className="sr" htmlFor={'reason-' + o.id}>
        Reason for voiding
      </label>
      <input
        id={'reason-' + o.id}
        placeholder="Reason (optional)"
        maxLength="80"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="row">
        <button className="btn sm danger" onClick={() => onVoid(o.id, reason.trim())}>
          Confirm void
        </button>
        <button className="btn sm" onClick={() => setOpen(false)}>
          Keep receipt
        </button>
      </div>
      <p className="hint">The receipt stays on record for the owner.</p>
    </div>
  );
}
