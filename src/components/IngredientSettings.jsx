import { useState } from 'react';
import {
  TYPES,
  LINKS,
  isWeight,
  toBase,
  splitQty,
  fmtQty,
  fmtPacks,
  typeLabel,
  linkLabel,
} from '../inventory.js';

const UNIT_LABEL = { pcs: 'pcs', g: 'g', kg: 'kg', pack: 'packs' };
const DEFAULT_LOW = { single: 10, weight: 1000 }; // pieces, or grams

// Form values are kept in the units the person types; they are converted when saving.
function startState(ing) {
  if (!ing) {
    return {
      type: null, link: null, name: '',
      stockVal: '', stockUnit: '', packVal: '', packUnit: '',
      lowVal: '', lowUnit: '', uses: {},
    };
  }
  const pack = ing.packSize > 0 ? splitQty('mass', ing.packSize) : { val: '', unit: '' };
  const stock = splitQty(ing.type, ing.stock, ing.packSize, true);
  const low = splitQty(ing.type, ing.low);
  const uses = {};
  ing.uses.forEach((u) => {
    const s = splitQty(ing.type, u.amount);
    uses[u.menuId] = { val: s.val, unit: s.unit };
  });
  return {
    type: ing.type, link: ing.link, name: ing.name,
    stockVal: stock.val, stockUnit: stock.unit,
    packVal: pack.val, packUnit: pack.unit,
    lowVal: low.val, lowUnit: low.unit, uses,
  };
}

const pick = (u, list) => (list.includes(u) ? u : list[0]);

// Add or edit one ingredient. It asks the type first, then how many food items use it.
function IngredientForm({ data, ing, onSave, onCancel }) {
  const [f, setF] = useState(() => startState(ing));
  const [err, setErr] = useState('');
  const uid = 'ing-' + (ing ? ing.id : 'new');

  const set = (patch) => {
    setF((p) => ({ ...p, ...patch }));
    setErr('');
  };

  const weight = isWeight(f.type);
  const packBase = weight && Number(f.packVal) > 0 ? toBase(f.packVal, f.packUnit || 'kg') : 0;
  const stockUnits = weight ? (packBase > 0 ? ['pack', 'kg', 'g'] : ['kg', 'g']) : ['pcs'];
  const lowUnits = weight ? ['kg', 'g'] : ['pcs'];
  const useUnits = weight ? ['g', 'kg'] : ['pcs'];

  // Changing between whole pieces and weight has no sensible conversion (40 pcs is not 40 kg),
  // so the amounts are cleared and must be entered again. Mass and powder are both weights, so they keep theirs.
  const setType = (t) => {
    setF((p) => {
      if (p.type && isWeight(p.type) !== isWeight(t)) {
        const uses = {};
        Object.keys(p.uses).forEach((id) => {
          uses[id] = { val: '', unit: '' };
        });
        return {
          ...p, type: t, uses,
          stockVal: '', stockUnit: '', packVal: '', packUnit: '', lowVal: '', lowUnit: '',
        };
      }
      return { ...p, type: t };
    });
    setErr('');
  };

  // "Single" means one food item at most, so extra links are dropped when switching to it.
  const setLink = (link) => {
    setF((p) => {
      let uses = p.uses;
      const ids = Object.keys(uses);
      if (link === 'single' && ids.length > 1) uses = { [ids[0]]: uses[ids[0]] };
      return { ...p, link, uses };
    });
    setErr('');
  };

  const toggleUse = (id) => {
    setF((p) => {
      let uses = { ...p.uses };
      if (uses[id]) {
        delete uses[id];
      } else {
        if (p.link === 'single') uses = {};
        uses[id] = { val: '', unit: '' };
      }
      return { ...p, uses };
    });
    setErr('');
  };

  const setUse = (id, patch) => set({ uses: { ...f.uses, [id]: { ...f.uses[id], ...patch } } });

  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return setErr('Give the ingredient a name.');

    const sUnit = pick(f.stockUnit, stockUnits);
    const stockNum = f.stockVal === '' ? 0 : Number(f.stockVal);
    if (!(stockNum >= 0)) return setErr('Stock must be zero or more.');
    if (sUnit === 'pack' && !(packBase > 0)) return setErr('Enter the pack size to count stock in packs.');
    const stock = toBase(stockNum, sUnit, packBase);

    const low =
      f.lowVal === ''
        ? weight ? DEFAULT_LOW.weight : DEFAULT_LOW.single
        : toBase(f.lowVal, pick(f.lowUnit, lowUnits));

    const uses = [];
    for (const id of Object.keys(f.uses)) {
      const u = f.uses[id];
      const amount = toBase(u.val, pick(u.unit, useUnits));
      if (!(amount > 0)) {
        const m = data.menu.find((x) => x.id === id);
        return setErr(
          'Enter how much ' + (m ? m.name : 'the food item') + ' uses per serving' +
            (weight ? '.' : ' (a whole number).')
        );
      }
      uses.push({ menuId: id, amount });
    }

    return onSave({
      type: f.type, link: f.link, name: f.name.trim(),
      stock, packSize: weight ? packBase : 0, low, uses,
    });
  };

  const ready = f.type && f.link;

  return (
    <form className="ingform" onSubmit={submit}>
      <div className="step-label">1. What type of ingredient is it?</div>
      <div className="choices" role="group" aria-label="Ingredient type">
        {TYPES.map((t) => (
          <button
            type="button"
            key={t.id}
            className="choice"
            aria-pressed={f.type === t.id}
            onClick={() => setType(t.id)}
          >
            <span className="t">{t.label}</span>
            <span className="d">{t.hint}</span>
          </button>
        ))}
      </div>
      {ing && isWeight(f.type) !== isWeight(ing.type) ? (
        <p className="hint">
          Switching between whole pieces and weight clears the amounts below. Enter them again.
        </p>
      ) : null}

      <div className="step-label">2. Is it used by many food items or a single food item?</div>
      <div className="choices" role="group" aria-label="Used by">
        {LINKS.map((l) => (
          <button
            type="button"
            key={l.id}
            className="choice"
            aria-pressed={f.link === l.id}
            onClick={() => setLink(l.id)}
          >
            <span className="t">{l.label}</span>
            <span className="d">{l.hint}</span>
          </button>
        ))}
      </div>

      {!ready ? (
        <p className="hint" style={{ marginTop: '12px' }}>
          Choose both to continue.
        </p>
      ) : (
        <>
          <div className="step-label">3. Details</div>
          <div className="formgrid">
            <div>
              <label htmlFor={uid + '-name'}>Name</label>
              <input
                id={uid + '-name'}
                value={f.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder={weight ? 'Curly fries' : 'Chicken nuggets'}
              />
            </div>

            {weight ? (
              <div>
                <label htmlFor={uid + '-pack'}>
                  Pack size{f.type === 'powder' ? '' : ' (optional)'}
                </label>
                <div className="qtyfield">
                  <input
                    id={uid + '-pack'}
                    type="number"
                    min="0"
                    step="any"
                    value={f.packVal}
                    onChange={(e) => set({ packVal: e.target.value })}
                    placeholder="1"
                  />
                  <select
                    aria-label="Pack size unit"
                    value={f.packUnit || 'kg'}
                    onChange={(e) => set({ packUnit: e.target.value })}
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                  </select>
                </div>
                <p className="hint">Weight of one pack, like 1 kg or 5 kg.</p>
              </div>
            ) : null}

            <div>
              <label htmlFor={uid + '-stock'}>Stock on hand</label>
              <div className="qtyfield">
                <input
                  id={uid + '-stock'}
                  type="number"
                  min="0"
                  step="any"
                  value={f.stockVal}
                  onChange={(e) => set({ stockVal: e.target.value })}
                  placeholder="0"
                />
                <select
                  aria-label="Stock unit"
                  value={pick(f.stockUnit, stockUnits)}
                  onChange={(e) => set({ stockUnit: e.target.value })}
                >
                  {stockUnits.map((u) => (
                    <option key={u} value={u}>
                      {UNIT_LABEL[u]}
                    </option>
                  ))}
                </select>
              </div>
              {weight ? <p className="hint">Packs, kg and grams convert automatically.</p> : null}
            </div>

            <div>
              <label htmlFor={uid + '-low'}>Low-stock alert at</label>
              <div className="qtyfield">
                <input
                  id={uid + '-low'}
                  type="number"
                  min="0"
                  step="any"
                  value={f.lowVal}
                  onChange={(e) => set({ lowVal: e.target.value })}
                  placeholder={weight ? '1' : String(DEFAULT_LOW.single)}
                />
                <select
                  aria-label="Low-stock unit"
                  value={pick(f.lowUnit, lowUnits)}
                  onChange={(e) => set({ lowUnit: e.target.value })}
                >
                  {lowUnits.map((u) => (
                    <option key={u} value={u}>
                      {UNIT_LABEL[u]}
                    </option>
                  ))}
                </select>
              </div>
              <p className="hint">Leave blank for {weight ? '1 kg' : DEFAULT_LOW.single + ' pcs'}.</p>
            </div>
          </div>

          <div className="step-label">
            {f.link === 'single'
              ? '4. Which food item uses it, and how much per serving?'
              : '4. Which food items use it, and how much per serving?'}
          </div>
          <div className="uses-list">
            {data.menu.map((m) => {
              const u = f.uses[m.id];
              return (
                <div className="use-row" key={m.id}>
                  <label className="use-pick">
                    <input
                      type={f.link === 'single' ? 'radio' : 'checkbox'}
                      name={uid + '-uses'}
                      checked={!!u}
                      onChange={() => toggleUse(m.id)}
                    />
                    <span>
                      {m.name} <span className="hint">{m.cat}</span>
                    </span>
                  </label>
                  {u ? (
                    <div className="qtyfield">
                      <input
                        type="number"
                        min="0"
                        step={weight ? 'any' : '1'}
                        aria-label={'Amount of ' + (f.name || 'ingredient') + ' per ' + m.name}
                        placeholder="Per serving"
                        value={u.val}
                        onChange={(e) => setUse(m.id, { val: e.target.value })}
                      />
                      <select
                        aria-label={'Unit for ' + m.name}
                        value={pick(u.unit, useUnits)}
                        onChange={(e) => setUse(m.id, { unit: e.target.value })}
                      >
                        {useUnits.map((x) => (
                          <option key={x} value={x}>
                            {UNIT_LABEL[x]}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <p className="hint">
            When a linked food item is ordered, this amount comes out of stock. If there is not
            enough, the food item shows out of stock.
          </p>

          {err ? (
            <p className="err" role="alert" style={{ marginTop: '10px' }}>
              {err}
            </p>
          ) : null}
          <div className="row form-actions">
            <button className="btn primary" type="submit">
              {ing ? 'Save changes' : 'Add ingredient'}
            </button>
            {onCancel ? (
              <button className="btn" type="button" onClick={onCancel}>
                Cancel
              </button>
            ) : null}
          </div>
        </>
      )}
      {!ready && onCancel ? (
        <div className="row form-actions">
          <button className="btn" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      ) : null}
    </form>
  );
}

// One saved ingredient in the Settings list.
function IngredientItem({ data, ing, editing, onEdit, onCancel, onSave, onRemove }) {
  const [confirm, setConfirm] = useState(false);

  if (editing) {
    return (
      <div className="ing-item editing">
        <h3>Edit {ing.name}</h3>
        <IngredientForm key={ing.id} data={data} ing={ing} onSave={onSave} onCancel={onCancel} />
      </div>
    );
  }

  const usedBy = ing.uses
    .map((u) => {
      const m = data.menu.find((x) => x.id === u.menuId);
      return m ? m.name + ' (' + fmtQty(ing, u.amount) + ')' : null;
    })
    .filter(Boolean);
  const packs = fmtPacks(ing, ing.stock);

  return (
    <div className="ing-item">
      <div className="ing-main">
        <div className="nm">{ing.name}</div>
        <div className="ghead-pills">
          <span className="pill info">{typeLabel(ing.type)}</span>
          <span className="pill info">Used by: {linkLabel(ing.link)}</span>
        </div>
        <div className="hint">
          {fmtQty(ing, ing.stock)}
          {packs ? ' (' + packs + ')' : ''}, low at {fmtQty(ing, ing.low)}.{' '}
          {usedBy.length > 0 ? 'Used in ' + usedBy.join(', ') + '.' : 'Not linked to a food item yet.'}
        </div>
      </div>
      <div className="ing-actions">
        <button className="btn sm" onClick={onEdit}>
          Edit
        </button>
        {confirm ? (
          <>
            <button className="btn sm danger" onClick={onRemove}>
              Confirm remove
            </button>
            <button className="btn sm" onClick={() => setConfirm(false)}>
              Keep
            </button>
          </>
        ) : (
          <button className="btn sm outline-danger" onClick={() => setConfirm(true)}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

// Settings panel for ingredients: add one, edit its type and links, or remove it.
export default function IngredientSettings({ data, act }) {
  const [editing, setEditing] = useState(null);
  const [formKey, setFormKey] = useState(0);

  return (
    <section className="panel" aria-label="Ingredients">
      <div className="panel-head">
        <div>
          <h2>Ingredients</h2>
          <p className="hint">
            These make up Inventory 2. Link each one to the food items it goes into. The sample
            ingredients can be edited or removed.
          </p>
        </div>
        <span className="eyebrow">{data.ingredients.length} ingredients</span>
      </div>

      <div className="ing-add">
        <h3>Add an ingredient</h3>
        <IngredientForm
          key={formKey}
          data={data}
          ing={null}
          onSave={(v) => {
            act.addIngredient(v);
            setFormKey((k) => k + 1);
          }}
        />
      </div>

      {data.ingredients.length > 0 ? (
        <div className="ing-list">
          {data.ingredients.map((ing) => (
            <IngredientItem
              key={ing.id}
              data={data}
              ing={ing}
              editing={editing === ing.id}
              onEdit={() => setEditing(ing.id)}
              onCancel={() => setEditing(null)}
              onSave={(v) => {
                act.updateIngredient(ing.id, v);
                setEditing(null);
              }}
              onRemove={() => act.removeIngredient(ing.id)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
