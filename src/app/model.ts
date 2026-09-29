export interface Place {
  id: string;
  name: string;
}

/** Eine Gruppe von Artikeln, von denen zusammen `target` Stück da sein sollen (z. B. Nudelsorten). */
export interface Combo {
  id: string;
  name: string;
  target: number;
}

export interface Item {
  id: string;
  name: string;
  /** Lagerort zuhause */
  locationId: string;
  /** Gruppe im Supermarkt */
  aisleId: string;
  amount: number;
  target: number;
  unit?: string;
  note?: string;
  /** Nur bei Lust oder Angebot kaufen */
  optional?: boolean;
  comboId?: string;
  /** Von Hand auf die Einkaufsliste gesetzt, unabhängig vom Bedarf */
  extra?: boolean;
}

export interface CartEntry {
  itemId: string;
  qty: number;
  wasExtra: boolean;
}

export interface Inventory {
  version: 1;
  locations: Place[];
  /** In Laufreihenfolge durch den Supermarkt */
  aisles: Place[];
  combos: Combo[];
  items: Item[];
  cart: CartEntry[];
  updatedAt: number;
}

export interface ShoppingEntry {
  key: string;
  name: string;
  qty: number;
  aisleId: string;
  optional: boolean;
  unit?: string;
  note?: string;
  item?: Item;
  combo?: Combo;
  members?: Item[];
}

export function itemNeed(item: Item): number {
  return Math.max(0, Math.ceil(item.target - item.amount));
}

export function shoppingEntries(inv: Inventory): ShoppingEntry[] {
  const entries: ShoppingEntry[] = [];
  const inCart = new Set(inv.cart.map((c) => c.itemId));

  for (const combo of inv.combos) {
    const members = inv.items.filter((i) => i.comboId === combo.id);
    if (!members.length) continue;
    const have = members.reduce((sum, i) => sum + i.amount, 0);
    const qty = Math.max(0, Math.ceil(combo.target - have));
    if (qty > 0) {
      entries.push({
        key: 'c:' + combo.id,
        name: combo.name,
        qty,
        aisleId: members[0].aisleId,
        optional: members.every((m) => m.optional),
        combo,
        members,
      });
    }
  }

  for (const item of inv.items) {
    if (inCart.has(item.id)) continue;
    const need = item.comboId ? 0 : itemNeed(item);
    const qty = item.extra ? Math.max(need, 1) : need;
    if (qty > 0) {
      entries.push({
        key: 'i:' + item.id,
        name: item.name,
        qty,
        aisleId: item.aisleId,
        optional: !!item.optional && !item.extra,
        unit: item.unit,
        note: item.note,
        item,
      });
    }
  }
  return entries;
}

export function formatAmount(n: number): string {
  const whole = Math.floor(n);
  const frac = Math.round((n - whole) * 100) / 100;
  if (frac === 0) return String(whole);
  if (frac === 0.5) return whole ? `${whole}½` : '½';
  return n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}
