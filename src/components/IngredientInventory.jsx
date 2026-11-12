import { useState } from 'react';
import {
  TYPES,
  linkLabel,
  ingStatus,
  fmtQty,
  fmtPacks,
  toBase,
  STATUS_LABEL,
} from '../inventory.js';

const UNIT_LABEL = { pcs: 'pcs', g: 'g', kg: 'kg', pack: 'packs' };

// One ingredient: stock in a readable unit, status, and quick restock / use controls.
function IngredientRow({ ing, menu, onAdjust }) {
  const [amt, setAmt] = useState('');
  const [unit, setUnit] = useState('');

  const units =
    ing.type === 'single' ? ['pcs'] : ing.packSize > 0 ? ['pack', 'kg', 'g'] : ['kg', 'g'];
  const eff = units.includes(unit) ? unit : units[0];

  const st = ingStatus(ing);
  const packs = fmtPacks(ing, ing.stock);
  const usedBy = ing.uses
    .map((u) => {
      const m = menu.find((x) => x.id === u.menuId);
      return m ? m.name + ' (' + fmtQty(ing, u.amount) + ')' : null;
    })
    .filter(Boolean);

  const change = (sign) => {
    const v = Number(amt);
    if (!(v > 0)) return;
    const base = toBase(v, eff, ing.packSize);
    if (base <= 0) return;
    onAdjust(ing.id, sign * base);
    setAmt('');
  };

  return (
    <div className="irow">
      <div className="iname">
        <div className="nm">{ing.name}</div>
        <div className="hint">
          {usedBy.length > 0 ? 'Used in ' + usedBy.join(', ') : 'Not linked to a food item yet'}
        </div>
      </div>
      <span className="pill info" title="Whether the ingredient is shared by many food items or used by one">
        Used by: {linkLabel(ing.link)}
      </span>
      <span className={'pill ' + st}>{STATUS_LABEL[st]}</span>
      <div className="istock">
        <div className="mono big">{fmtQty(ing, ing.stock)}</div>
        <div className="hint">
          {packs ? packs + ' · ' : ''}low at {fmtQty(ing, ing.low)}
        </div>
      </div>
      <div className="icontrols">
        <label className="sr" htmlFor={'adj-' + ing.id}>
          Amount for {ing.name}
        </label>
        <div className="qtyfield">
          <input
            id={'adj-' + ing.id}
            type="number"
            min="0"
            step="any"
            placeholder="Amount"
            value={amt}
            onChange={(e) => setAmt(e.target.value)}
          />
          <select
            aria-label={'Unit for ' + ing.name}
            value={eff}
            onChange={(e) => setUnit(e.target.value)}
          >
            {units.map((u) => (
              <option key={u} value={u}>
                {UNIT_LABEL[u]}
              </option>
            ))}
          </select>
        </div>
        <button className="btn sm" onClick={() => change(1)}>
          Add
        </button>
        <button className="btn sm outline-danger" onClick={() => change(-1)}>
          Remove
        </button>
      </div>
    </div>
  );
}

// Inventory 2: ingredients, grouped by type (single, mass, powder).
export default function IngredientInventory({ data, act }) {
  const list = data.ingredients;
  const low = list.filter((i) => ingStatus(i) === 'low').length;
  const out = list.filter((i) => ingStatus(i) === 'out').length;

  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="eyebrow">Ingredients</div>
          <div className="v">{list.length}</div>
          <div className="s">Across {new Set(list.map((i) => i.type)).size} types</div>
        </div>
        <div className="stat">
          <div className="eyebrow">Low stock</div>
          <div className="v">{low}</div>
          <div className="s">At or under their alert level</div>
        </div>
        <div className="stat dec">
          <div className="eyebrow">Out of stock</div>
          <div className="v">{out}</div>
          <div className="s">Food items using them are blocked</div>
        </div>
      </div>

      <p className="hint">
        Amounts convert automatically, so 250 g and 0.25 kg are the same. Orders take ingredients out
        for you. Use Add and Remove for deliveries, waste or a recount. Add new ingredients and link
        them to food items in Settings.
      </p>

      {list.length === 0 ? (
        <section className="panel" aria-label="Ingredients">
          <div className="empty">
            No ingredients yet. Add one in Settings, choose its type, and link it to the food items that
            use it.
          </div>
        </section>
      ) : (
        TYPES.map((t) => {
          const rows = list.filter((i) => i.type === t.id);
          if (rows.length === 0) return null;
          return (
            <section className="panel" key={t.id} aria-label={'Ingredients: ' + t.label}>
              <div className="panel-head">
                <div>
                  <h2>{t.label}</h2>
                  <p className="hint">{t.hint}</p>
                </div>
                <span className="eyebrow">
                  {rows.length} {rows.length === 1 ? 'ingredient' : 'ingredients'}
                </span>
              </div>
              {rows.map((ing) => (
                <IngredientRow key={ing.id} ing={ing} menu={data.menu} onAdjust={act.adjustIngredient} />
              ))}
            </section>
          );
        })
      )}
    </>
  );
}
