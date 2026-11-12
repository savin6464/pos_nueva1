# Counter POS

A point-of-sale app built with React and Vite. It has two windows:

- **Worker window:** pick menu items, change quantities, accept or decline the order. Accepted orders print a receipt on the left. Workers can void a receipt, but it is never removed.
- **Owner window (password):** sales totals with a calendar, voided orders, inventory, and settings (menu items, ingredients and password). The owner can delete a single order or delete all orders in the current view.

## Run it

You need Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173).

To make a production build:

```bash
npm run build      # output goes to dist/
npm run preview    # try the build locally
```

## Inventory and ingredients

Owner window > Inventory has two lists:

- **Inventory 1: Food items.** The menu, grouped by category, with stock counts.
- **Inventory 2: Ingredients.** What the food items are made from, grouped by type.

Add ingredients in Owner window > Settings > Ingredients. The form asks in this order:

1. **Type** (you can change it later with Edit)
   - **Single:** whole pieces, like hotdogs, nuggets, cheese sticks.
   - **Mass:** weighed in kg or grams, like fries, curly fries.
   - **Powder:** weighed, often bought in packs, like 1 pack (1 kg) or 1 pack (5 kg).
2. **Used by:** **Many** (shared by several food items, like fries for regular and large) or **Single** (used by one food item only).
3. **Details:** name, pack size (for weights), stock, and a low-stock alert level.
4. **Food items that use it**, with the amount per serving, like 250 g of fries for one regular fries.

How it behaves:

- Ordering a food item that has ingredients takes those amounts out of Inventory 2. If any ingredient is short, the food item shows **Out of stock** and cannot be added.
- Ingredients shared by several items in one order are counted together.
- Food items with no ingredients keep using their own stock count in Inventory 1.
- **Automatic conversion:** stock is stored in grams (or pieces) and shown in the friendliest unit. 4,750 g shows as 4.75 kg and as 4 packs + 750 g. You can type amounts in g, kg or packs.
- **Low stock:** each ingredient has its own alert level. Items at or under it show **Low stock**, the Inventory tab shows a count, a "Needs restocking" bar lists them, and the worker window shows "n left" on food items running low. A toast also appears when an order pushes something under its alert level.
- A voided order puts back exactly the ingredients it used. Deleting an order does not change stock.
- Switching an ingredient between pieces and weight clears its amounts, since 40 pieces is not 40 kg. Enter them again.
- Sample ingredients (fries, fries seasoning, hotdog, cheese sticks, milk tea powder) are included on a fresh start. Edit or remove them in Settings.

## Good to know

- **Default owner password:** `owner123`. Change it in Owner window > Settings.
- **Where data lives:** everything is saved in the browser's localStorage on the device you use. Clearing site data erases it. Use the same browser for both windows.
- **Stock:** each accepted order takes its food items, or their ingredients, out of stock. A voided order puts them back. Deleting an order does not change stock.
- **Totals:** Total amount excludes voided orders. Total decrease is the sum of voided orders.
- The owner password is checked inside the page, so it is a casual lock and not real security.

## Files

```
index.html                  page shell and fonts
package.json                dependencies and scripts
vite.config.js              Vite + React plugin
src/main.jsx                mounts the app
src/App.jsx                 state, order accept / void / delete, window switch
src/utils.js                saved-data loading, default menu and ingredients, formatting helpers
src/inventory.js            ingredient types, unit conversion, stock checks, place and void orders
src/styles.css              all styling (light and dark themes)
src/components/Worker.jsx       worker window: receipts, menu, current order
src/components/Receipt.jsx      paper receipt and worker void control
src/components/Owner.jsx        password gate and owner tabs
src/components/Sales.jsx        calendar, totals, order list
src/components/Voided.jsx       voided orders list
src/components/Inventory.jsx    Inventory 1 (food items) and the low-stock bar
src/components/IngredientInventory.jsx  Inventory 2 (ingredients)
src/components/Settings.jsx     menu items and password
src/components/IngredientSettings.jsx   add and edit ingredients
src/components/OrderParts.jsx   owner list row and delete controls
```
