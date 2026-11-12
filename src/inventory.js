// Ingredient inventory logic: unit conversion, recipes, stock checks, placing and voiding orders.
//
// Amounts are stored in one base unit so conversion is automatic:
//   single  -> pieces
//   mass    -> grams
//   powder  -> grams (optionally counted in packs of a fixed weight)
//
// Inventory 1 = food items (data.menu). Inventory 2 = ingredients (data.ingredients).
// A food item is "made from ingredients" when at least one ingredient lists it in `uses`.
// Those food items are limited by their ingredients; the rest use their own stock count.

import { LOW, sum } from './utils.js';

export const TYPES = [
  { id: 'single', label: 'Single', hint: 'Whole pieces, like hotdogs, nuggets, cheese sticks' },
  { id: 'mass', label: 'Mass', hint: 'Weighed in kg or grams, like fries, curly fries' },
  { id: 'powder', label: 'Powder', hint: 'Weighed, often bought in packs, like 1 pack (1 kg) or 1 pack (5 kg)' },
];

export const LINKS = [
  { id: 'many', label: 'Many', hint: 'Shared by several food items, like fries for regular and large' },
  { id: 'single', label: 'Single', hint: 'Used by one food item only, like a hotdog for the hotdog on bun' },
];

export const typeLabel = (t) => (TYPES.find((x) => x.id === t) || TYPES[0]).label;
export const linkLabel = (l) => (l === 'many' ? 'Many' : 'Single');
export const isWeight = (t) => t === 'mass' || t === 'powder';

export const round2 = (n) => Math.round(n * 100) / 100;
const trim = (n, d) => String(parseFloat(Number(n).toFixed(d)));

/* ---------- unit conversion ---------- */

// Turn a typed amount and unit (pcs, g, kg, pack) into the base unit.
export function toBase(value, unit, packSize = 0) {
  const v = Number(value);
  if (!isFinite(v) || v < 0) return 0;
  if (unit === 'kg') return round2(v * 1000);
  if (unit === 'pack') return round2(v * packSize);
  if (unit === 'g') return round2(v);
  return Math.floor(v); // whole pieces
}

// Grams -> "750 g" or "1.5 kg".
export function fmtWeight(g) {
  const n = round2(g);
  if (n >= 1000) return trim(n / 1000, 3) + ' kg';
  return trim(n, 2) + ' g';
}

// Any base amount of an ingredient -> readable text.
export function fmtQty(ing, base) {
  if (ing.type === 'single') return base + (base === 1 ? ' pc' : ' pcs');
  return fmtWeight(base);
}

// "4 packs + 750 g" when the ingredient has a pack size and at least one full pack is left.
export function fmtPacks(ing, base) {
  if (ing.type === 'single' || !(ing.packSize > 0)) return '';
  const packs = Math.floor(base / ing.packSize + 1e-9);
  if (packs <= 0) return '';
  const rem = round2(base - packs * ing.packSize);
  const parts = [packs + (packs === 1 ? ' pack' : ' packs')];
  if (rem > 0) parts.push(fmtWeight(rem));
  return parts.join(' + ');
}

// Base amount -> the value and unit to show in a form field.
export function splitQty(type, base, packSize = 0, allowPack = false) {
  if (type === 'single') return { val: String(base), unit: 'pcs' };
  if (allowPack && packSize > 0 && base > 0) {
    const packs = base / packSize;
    if (Math.abs(packs - Math.round(packs)) < 1e-9) return { val: String(Math.round(packs)), unit: 'pack' };
  }
  if (base >= 1000) return { val: trim(base / 1000, 3), unit: 'kg' };
  return { val: trim(base, 2), unit: 'g' };
}

/* ---------- recipes and availability ---------- */

// Ingredients (and amounts per serving) that a food item is made from.
export function recipeOf(data, menuId) {
  const out = [];
  (data.ingredients || []).forEach((ing) => {
    const u = ing.uses.find((x) => x.menuId === menuId);
    if (u && u.amount > 0) out.push({ ing, amount: u.amount });
  });
  return out;
}

// How many servings of a food item can be sold right now.
export function available(data, m) {
  const r = recipeOf(data, m.id);
  if (r.length === 0) return { servings: m.stock, recipe: false, limiter: null };
  let min = Infinity;
  let limiter = null;
  r.forEach(({ ing, amount }) => {
    const n = Math.floor((ing.stock + 1e-6) / amount);
    if (n < min) {
      min = n;
      limiter = ing;
    }
  });
  return { servings: min === Infinity ? 0 : min, recipe: true, limiter };
}

// Total stock a cart would use, split into food-item stock and ingredient stock.
export function needs(data, cart) {
  const menu = {};
  const ing = {};
  cart.forEach((x) => {
    const r = recipeOf(data, x.id);
    if (r.length > 0) {
      r.forEach(({ ing: i, amount }) => {
        ing[i.id] = round2((ing[i.id] || 0) + amount * x.qty);
      });
    } else {
      menu[x.id] = (menu[x.id] || 0) + x.qty;
    }
  });
  return { menu, ing };
}

// Returns a message if the cart cannot be filled, otherwise null.
// Ingredients shared by several items in the cart are counted together.
export function shortage(data, cart) {
  const n = needs(data, cart);
  for (const x of cart) {
    const m = data.menu.find((y) => y.id === x.id);
    if (!m) return x.name + ' is no longer on the menu';
    const r = recipeOf(data, x.id);
    if (r.length > 0) {
      const bad = r.find(({ ing }) => (n.ing[ing.id] || 0) > ing.stock + 1e-6);
      if (bad) return 'Out of stock: not enough ' + bad.ing.name + ' for ' + x.name;
    } else if ((n.menu[x.id] || 0) > m.stock) {
      return m.stock <= 0 ? x.name + ' is out of stock' : 'Only ' + m.stock + ' of ' + x.name + ' left in stock';
    }
  }
  return null;
}

/* ---------- low stock ---------- */

export const STATUS_LABEL = { out: 'Out of stock', low: 'Low stock', ok: 'In stock' };

export const ingStatus = (ing) => (ing.stock <= 0 ? 'out' : ing.stock <= ing.low ? 'low' : 'ok');

export function foodStatus(data, m) {
  const a = available(data, m);
  return a.servings <= 0 ? 'out' : a.servings <= LOW ? 'low' : 'ok';
}

// Things that need restocking. Food items made from ingredients are left out
// because restocking their ingredients fixes them.
export function alerts(data) {
  const ings = (data.ingredients || [])
    .map((ing) => ({ ing, status: ingStatus(ing) }))
    .filter((x) => x.status !== 'ok');
  const foods = data.menu
    .map((m) => ({ m, a: available(data, m), status: foodStatus(data, m) }))
    .filter((x) => !x.a.recipe && x.status !== 'ok');
  return { ings, foods, count: ings.length + foods.length };
}

/* ---------- placing and voiding orders ---------- */

// Accept an order: check stock, issue the receipt and take stock out.
// Returns { error } or { data, order, running } where `running` lists items that just ran low.
export function placeOrder(data, cart, nowIso) {
  const problem = shortage(data, cart);
  if (problem) return { error: problem };

  const used = needs(data, cart);
  const order = {
    id: 'o' + Date.now() + Math.floor(Math.random() * 1000),
    no: data.seq,
    createdAt: nowIso,
    items: cart.map((x) => ({ id: x.id, name: x.name, price: x.price, qty: x.qty })),
    total: sum(cart, (x) => x.price * x.qty),
    status: 'active',
    deducted: used, // remembered so a void can put exactly this back
  };

  const running = []
    .concat(
      (data.ingredients || [])
        .filter((i) => used.ing[i.id] && i.stock > i.low && i.stock - used.ing[i.id] <= i.low)
        .map((i) => i.name)
    )
    .concat(
      data.menu
        .filter((m) => used.menu[m.id] && m.stock > LOW && m.stock - used.menu[m.id] <= LOW)
        .map((m) => m.name)
    );

  const next = {
    ...data,
    orders: data.orders.concat([order]),
    seq: data.seq + 1,
    menu: data.menu.map((m) =>
      used.menu[m.id] ? { ...m, stock: Math.max(0, m.stock - used.menu[m.id]) } : m
    ),
    ingredients: (data.ingredients || []).map((i) =>
      used.ing[i.id] ? { ...i, stock: Math.max(0, round2(i.stock - used.ing[i.id])) } : i
    ),
  };
  return { data: next, order, running };
}

// Void an accepted order: keep it on record and return what it used to stock.
export function voidInData(data, id, reason, nowIso) {
  const target = data.orders.find((o) => o.id === id && o.status === 'active');
  if (!target) return data;
  const dd = target.deducted;
  // Orders placed before ingredients existed have no `deducted`; they used food-item stock only.
  const menuBack = dd ? dd.menu : Object.fromEntries(target.items.map((i) => [i.id, i.qty]));
  const ingBack = dd ? dd.ing : {};
  return {
    ...data,
    orders: data.orders.map((o) =>
      o.id === id ? { ...o, status: 'voided', voidedAt: nowIso, reason } : o
    ),
    menu: data.menu.map((m) => (menuBack[m.id] ? { ...m, stock: m.stock + menuBack[m.id] } : m)),
    ingredients: (data.ingredients || []).map((i) =>
      ingBack[i.id] ? { ...i, stock: round2(i.stock + ingBack[i.id]) } : i
    ),
  };
}
