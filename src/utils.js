// Shared constants, saved-data loading and formatting helpers.

export const KEY = 'counterpos:v1';
export const LOW = 5; // stock at or below this counts as "low"

export const DEFAULT_MENU = [
  { id: 'm1', name: 'Pandesal (6 pcs)', price: 30, cat: 'Bakery' },
  { id: 'm2', name: 'Ensaymada', price: 45, cat: 'Bakery' },
  { id: 'm3', name: 'Pan de coco', price: 20, cat: 'Bakery' },
  { id: 'm4', name: 'Brewed coffee', price: 60, cat: 'Drinks' },
  { id: 'm5', name: 'Iced coffee', price: 85, cat: 'Drinks' },
  { id: 'm6', name: 'Calamansi juice', price: 55, cat: 'Drinks' },
  { id: 'm7', name: 'Milk tea', price: 90, cat: 'Drinks' },
  { id: 'm8', name: 'Tapsilog', price: 140, cat: 'Meals' },
  { id: 'm9', name: 'Longsilog', price: 120, cat: 'Meals' },
  { id: 'm10', name: 'Chicken adobo rice', price: 130, cat: 'Meals' },
  { id: 'm11', name: 'Pancit canton', price: 95, cat: 'Meals' },
  { id: 'm12', name: 'Turon (2 pcs)', price: 40, cat: 'Snacks' },
  { id: 'm13', name: 'Banana cue', price: 35, cat: 'Snacks' },
  { id: 'm14', name: 'Halo-halo', price: 110, cat: 'Snacks' },
  { id: 'm15', name: 'Regular fries', price: 65, cat: 'Snacks' },
  { id: 'm16', name: 'Large fries', price: 95, cat: 'Snacks' },
  { id: 'm17', name: 'Hotdog on bun', price: 70, cat: 'Snacks' },
  { id: 'm18', name: 'Cheese sticks (4 pcs)', price: 60, cat: 'Snacks' },
];

// Sample ingredients (amounts are stored in the base unit: pieces, or grams for weights).
// "type": single = whole pieces, mass = weighed, powder = sold in packs.
// "link": many = shared by several food items, single = used by one food item.
export const DEFAULT_INGREDIENTS = [
  {
    id: 'i1', name: 'Fries', type: 'mass', link: 'many',
    stock: 5000, packSize: 1000, low: 1000,
    uses: [{ menuId: 'm15', amount: 250 }, { menuId: 'm16', amount: 400 }],
  },
  {
    id: 'i2', name: 'Fries seasoning', type: 'powder', link: 'many',
    stock: 3000, packSize: 1000, low: 500,
    uses: [{ menuId: 'm15', amount: 5 }, { menuId: 'm16', amount: 8 }],
  },
  {
    id: 'i3', name: 'Hotdog', type: 'single', link: 'single',
    stock: 24, packSize: 0, low: 6,
    uses: [{ menuId: 'm17', amount: 1 }],
  },
  {
    id: 'i4', name: 'Cheese sticks', type: 'single', link: 'single',
    stock: 40, packSize: 0, low: 8,
    uses: [{ menuId: 'm18', amount: 4 }],
  },
  {
    id: 'i5', name: 'Milk tea powder', type: 'powder', link: 'single',
    stock: 10000, packSize: 5000, low: 1000,
    uses: [{ menuId: 'm7', amount: 40 }],
  },
];

// Everything is kept in the browser's localStorage under KEY.
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.orders) && Array.isArray(s.menu) && typeof s.password === 'string') {
        s.menu = s.menu.map((m) => (typeof m.stock === 'number' ? m : { ...m, stock: 40 }));
        s.ingredients = Array.isArray(s.ingredients) ? s.ingredients : [];
        return s;
      }
    }
  } catch (e) {
    /* fall through to defaults */
  }
  return {
    menu: DEFAULT_MENU.map((m) => ({ ...m, stock: 40 })),
    ingredients: DEFAULT_INGREDIENTS.map((i) => ({ ...i, uses: i.uses.map((u) => ({ ...u })) })),
    orders: [],
    seq: 1,
    password: 'owner123',
  };
}

export function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    /* storage unavailable */
  }
}

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
export const money = (n) => peso.format(n);
export const pad = (n) => String(n).padStart(2, '0');

export const dayKey = (d) => {
  const x = new Date(d);
  return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate());
};
export const timeStr = (d) =>
  new Date(d).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
export const dateStr = (d) =>
  new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
export const longDate = (d) =>
  new Date(d).toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
export const monthName = (y, m) =>
  new Date(y, m, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
export const rno = (n) => '#' + String(n).padStart(4, '0');
export const compact = (n) => (n >= 1000 ? Math.round(n / 100) / 10 + 'k' : String(Math.round(n)));
export const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
