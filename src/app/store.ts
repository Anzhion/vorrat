import { Injectable, computed, effect, signal } from '@angular/core';
import { Inventory, Item, ShoppingEntry, itemNeed, shoppingEntries } from './model';
import { seedInventory } from './seed';

const KEY = 'vorrat.inventory';

function load(): Inventory {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Inventory;
  } catch {
    // Kaputter oder gesperrter Speicher: mit Startdaten weitermachen
  }
  return seedInventory();
}

@Injectable({ providedIn: 'root' })
export class Store {
  readonly data = signal<Inventory>(load());
  readonly saveError = signal(false);

  readonly shopping = computed(() => shoppingEntries(this.data()));
  readonly itemsById = computed(() => new Map(this.data().items.map((i) => [i.id, i])));

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.data()));
        this.saveError.set(false);
      } catch {
        this.saveError.set(true);
      }
    });
    navigator.storage?.persist?.().catch(() => {});
  }

  update(fn: (d: Inventory) => void): void {
    const d = structuredClone(this.data());
    fn(d);
    d.updatedAt = Date.now();
    this.data.set(d);
  }

  updateItem(id: string, fn: (i: Item) => void): void {
    this.update((d) => {
      const item = d.items.find((i) => i.id === id);
      if (item) fn(item);
    });
  }

  need(item: Item): number {
    return itemNeed(item);
  }

  /** Legt einen Artikel in den Wagen und bucht ihn sofort in den Bestand. */
  buy(entry: ShoppingEntry, member?: Item): void {
    const target = member ?? entry.item;
    if (!target) return;
    this.update((d) => {
      const item = d.items.find((i) => i.id === target.id)!;
      item.amount += entry.qty;
      d.cart.push({ itemId: item.id, qty: entry.qty, wasExtra: !!item.extra });
      item.extra = false;
    });
  }

  unbuy(itemId: string): void {
    this.update((d) => {
      const idx = d.cart.findIndex((c) => c.itemId === itemId);
      if (idx < 0) return;
      const [entry] = d.cart.splice(idx, 1);
      const item = d.items.find((i) => i.id === itemId);
      if (item) {
        item.amount = Math.max(0, item.amount - entry.qty);
        item.extra = entry.wasExtra;
      }
    });
  }

  changeCartQty(itemId: string, delta: number): void {
    this.update((d) => {
      const entry = d.cart.find((c) => c.itemId === itemId);
      const item = d.items.find((i) => i.id === itemId);
      if (!entry || !item || entry.qty + delta < 1) return;
      entry.qty += delta;
      item.amount = Math.max(0, item.amount + delta);
    });
  }

  finishShopping(): void {
    this.update((d) => (d.cart = []));
  }

  replace(inv: Inventory): void {
    this.data.set({ ...inv, combos: inv.combos ?? [], cart: inv.cart ?? [], updatedAt: Date.now() });
  }
}
