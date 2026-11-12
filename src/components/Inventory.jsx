import { useState } from 'react';
import IngredientInventory from './IngredientInventory.jsx';
import { LOW, money, dayKey, sum } from '../utils.js';
import { alerts, available, foodStatus, fmtQty, recipeOf, STATUS_LABEL } from '../inventory.js';

// Owner-only inventory. Two lists:
//   Inventory 1: food items (the menu), grouped by category
//   Inventory 2: ingredients, which food items can be made from
export default function Inventory({ data, act }) {
  const [sub, setSub] = useState('food');
  const al = alerts(data);

  return (
    <div className="stack">
      <div className="seg" role="group" aria-label="Inventory lists" style={{ alignSelf: 'flex-start' }}>
        <button aria-pressed={sub === 'food'} onClick={() => setSub('food')}>
          Inventory 1 · Food items
        </button>
        <button aria-pressed={sub === 'ingredients'} onClick={() => setSub('ingredients')}>
          Inventory 2 · Ingredients
        </button>
      </div>

      {al.count > 0 ? (
        <section className="panel alertbar" aria-label="Low stock alerts" role="status">
          <div className="panel-head">
            <h2>Needs restocking</h2>
            <span className="eyebrow">
              {al.count} {al.count === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="ghead-pills">
            {al.ings.map(({ ing, status }) => (
              <span className={'pill ' + status} key={ing.id}>
                {ing.name}: {status === 'out' ? 'out of stock' : fmtQty(ing, ing.stock) + ' left'}
              </span>
            ))}
            {al.foods.map(({ m, a, status }) => (
              <span className={'pill ' + status} key={m.id}>
                {m.name}: {status === 'out' ? 'out of stock' : a.servings + ' left'}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {sub === 'food' ? (
        <FoodInventory data={data} act={act} />
      ) : (
        <IngredientInventory data={data} act={act} />
      )}
    </div>
  );
}

// Inventory 1: food items grouped by category.
// A food item made from ingredients gets its count from Inventory 2.
function FoodInventory({ data, act }) {
  const today = dayKey(new Date());

  const soldToday = {};
  data.orders.forEach((o) => {
    if (o.status === 'active' && dayKey(o.createdAt) === today) {
      o.items.forEach((i) => {
        soldToday[i.id] = (soldToday[i.id] || 0) + i.qty;
      });
    }
  });

  const groups = [];
  data.menu.forEach((m) => {
    let g = groups.find((x) => x.name === m.cat);
    if (!g) {
      g = { name: m.cat, items: [] };
      groups.push(g);
    }
    g.items.push(m);
  });
  const cats = groups.map((g) => g.name);

  const madeFrom = data.menu.filter((m) => recipeOf(data, m.id).length > 0).length;
  const low = data.menu.filter((m) => foodStatus(data, m) === 'low').length;
  const out = data.menu.filter((m) => foodStatus(data, m) === 'out').length;

  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="eyebrow">Menu items</div>
          <div className="v">{data.menu.length}</div>
          <div className="s">
            {groups.length} {groups.length === 1 ? 'group' : 'groups'}
          </div>
        </div>
        <div className="stat">
          <div className="eyebrow">Made from ingredients</div>
          <div className="v">{madeFrom}</div>
          <div className="s">Counted from Inventory 2</div>
        </div>
        <div className="stat">
          <div className="eyebrow">Low stock</div>
          <div className="v">{low}</div>
          <div className="s">{LOW} or fewer left</div>
        </div>
        <div className="stat dec">
          <div className="eyebrow">Out of stock</div>
          <div className="v">{out}</div>
          <div className="s">Hidden from ordering</div>
        </div>
      </div>

      <p className="hint">
        Food items are grouped by category. A food item linked to ingredients takes them from
        Inventory 2 with every order and shows out of stock when an ingredient runs out. Other
        items use their own count. A voided order puts everything back.
      </p>

      {data.menu.length === 0 ? (
        <section className="panel" aria-label="Inventory">
          <div className="empty">No menu items yet. Add some in Settings and they appear here.</div>
        </section>
      ) : (
        groups.map((g) => {
          const states = g.items.map((m) => ({ m, a: available(data, m), st: foodStatus(data, m) }));
          const gLow = states.filter((x) => x.st === 'low').length;
          const gOut = states.filter((x) => x.st === 'out').length;
          const gUnits = sum(
            states.filter((x) => !x.a.recipe),
            (x) => x.m.stock
          );
          return (
            <section className="panel" key={g.name} aria-label={'Inventory group ' + g.name}>
              <div className="panel-head">
                <div>
                  <h2>{g.name}</h2>
                  <span className="eyebrow">
                    {g.items.length} {g.items.length === 1 ? 'item' : 'items'}, {gUnits} counted units
                  </span>
                </div>
                <div className="ghead-pills">
                  {gLow > 0 ? <span className="pill low">{gLow} low</span> : null}
                  {gOut > 0 ? <span className="pill out">{gOut} out of stock</span> : null}
                </div>
              </div>
              {states.map(({ m, a, st }) => {
                const rec = recipeOf(data, m.id);
                return (
                  <div className="irow" key={m.id}>
                    <div className="iname">
                      <div className="nm">{m.name}</div>
                      <div className="hint">{money(m.price)}</div>
                    </div>
                    <span className={'pill ' + st}>{STATUS_LABEL[st]}</span>
                    <div className="isold">
                      <div className="eyebrow">Sold today</div>
                      <div className="mono">{soldToday[m.id] || 0}</div>
                    </div>
                    <div className="igroup">
                      <label className="sr" htmlFor={'grp-' + m.id}>
                        Group for {m.name}
                      </label>
                      <select
                        id={'grp-' + m.id}
                        value={m.cat}
                        onChange={(e) => act.setCat(m.id, e.target.value)}
                      >
                        {cats.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    {a.recipe ? (
                      <div className="icontrols">
                        <div className="servings">
                          <div className="mono">{a.servings}</div>
                          <div className="hint">{a.servings === 1 ? 'serving' : 'servings'}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="icontrols">
                        <div className="stepper">
                          <button
                            aria-label={'Remove one ' + m.name + ' from stock'}
                            onClick={() => act.setStock(m.id, m.stock - 1)}
                          >
                            -
                          </button>
                          <input
                            className="stock-in"
                            type="number"
                            min="0"
                            step="1"
                            aria-label={'Stock of ' + m.name}
                            value={m.stock}
                            onChange={(e) => act.setStock(m.id, e.target.value)}
                          />
                          <button
                            aria-label={'Add one ' + m.name + ' to stock'}
                            onClick={() => act.setStock(m.id, m.stock + 1)}
                          >
                            +
                          </button>
                        </div>
                        <button
                          className="btn sm"
                          aria-label={'Add 10 to ' + m.name}
                          onClick={() => act.setStock(m.id, m.stock + 10)}
                        >
                          +10
                        </button>
                      </div>
                    )}
                    {a.recipe ? (
                      <div className="idetail">
                        Made from {rec.map((r) => fmtQty(r.ing, r.amount) + ' ' + r.ing.name).join(', ')}{' '}
                        per serving.
                        {a.servings <= 0
                          ? ' Restock ' + a.limiter.name + ' in Inventory 2.'
                          : ' Limited by ' + a.limiter.name + '.'}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </section>
          );
        })
      )}
    </>
  );
}
