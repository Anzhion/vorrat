import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Item, formatAmount, itemNeed } from '../model';
import { Store } from '../store';

@Component({
  selector: 'app-inventory',
  imports: [RouterLink],
  template: `
    <header class="bar">
      <h1>Inventur</h1>
      <span class="count">{{ totalNeed() }} fehlen</span>
    </header>

    <nav class="tabs">
      @for (loc of store.data().locations; track loc.id) {
        <button class="chip" [class.active]="loc.id === locationId() && !query()" (click)="select(loc.id)">
          {{ loc.name }}
          @if (needByLocation().get(loc.id); as n) {
            <span class="dot">{{ n }}</span>
          }
        </button>
      }
    </nav>

    <input type="search" class="search" placeholder="In allen Lagerorten suchen …" [value]="query()" (input)="query.set($any($event.target).value)" />

    <div class="card">
      @for (item of items(); track item.id) {
        <div class="row" [class.missing]="need(item) > 0" [class.inactive]="!item.target && !item.comboId">
          <a class="grow" [routerLink]="['/artikel', item.id]">
            <div class="name">
              {{ item.name }}
              @if (item.extra) { <span class="tag">auf Liste</span> }
            </div>
            <div class="muted small">
              Ziel {{ item.comboId ? comboLabel(item) : item.target }}
              @if (item.unit) { · {{ item.unit }} }
              @if (query()) { · {{ locationName(item.locationId) }} }
            </div>
          </a>
          <div class="stepper">
            <button (click)="step(item, -1)" [disabled]="item.amount <= 0" aria-label="Weniger">−</button>
            <button class="amount" (click)="toggleHalf(item)" title="Tippen: angebrochen">{{ fmt(item.amount) }}</button>
            <button (click)="step(item, 1)" aria-label="Mehr">+</button>
          </div>
        </div>
      } @empty {
        <p class="muted pad">Keine Artikel.</p>
      }
    </div>
    <p class="muted small center">Auf die Zahl tippen, um „angebrochen“ (½) zu setzen oder zu entfernen.</p>
  `,
})
export class InventoryPage {
  protected readonly store = inject(Store);
  protected readonly locationId = signal(this.store.data().locations[0]?.id ?? '');
  protected readonly query = signal('');

  protected readonly items = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.store.data().items;
    return q ? all.filter((i) => i.name.toLowerCase().includes(q)) : all.filter((i) => i.locationId === this.locationId());
  });

  protected readonly needByLocation = computed(() => {
    const m = new Map<string, number>();
    for (const i of this.store.data().items) {
      if (itemNeed(i) > 0 && !i.optional && !i.comboId) m.set(i.locationId, (m.get(i.locationId) ?? 0) + 1);
    }
    return m;
  });

  protected readonly totalNeed = computed(() => [...this.needByLocation().values()].reduce((a, b) => a + b, 0));

  protected readonly fmt = formatAmount;
  protected readonly need = itemNeed;

  protected select(id: string): void {
    this.locationId.set(id);
    this.query.set('');
  }

  protected step(item: Item, dir: 1 | -1): void {
    this.store.updateItem(item.id, (i) => {
      const next = i.amount + dir;
      i.amount = next < 0.5 ? 0 : next;
    });
  }

  protected toggleHalf(item: Item): void {
    this.store.updateItem(item.id, (i) => {
      // Voll → eins davon angebrochen → wieder voll; aus 0 wird ein Rest
      if (i.amount % 1) i.amount = Math.ceil(i.amount);
      else i.amount = i.amount ? i.amount - 0.5 : 0.5;
    });
  }

  protected comboLabel(item: Item): string {
    const c = this.store.data().combos.find((c) => c.id === item.comboId);
    return c ? `${c.target} (Kombi)` : '–';
  }

  protected locationName(id: string): string {
    return this.store.data().locations.find((l) => l.id === id)?.name ?? '';
  }
}
