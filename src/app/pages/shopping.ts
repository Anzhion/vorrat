import { Component, computed, inject, signal } from '@angular/core';
import { ShoppingEntry } from '../model';
import { Store } from '../store';

@Component({
  selector: 'app-shopping',
  template: `
    <header class="bar">
      <h1>Einkauf</h1>
      <span class="count">{{ openCount() }} offen</span>
    </header>

    <div class="toolbar">
      <label class="switch">
        <input type="checkbox" [checked]="showOptional()" (change)="showOptional.set(!showOptional())" />
        Optionale zeigen
      </label>
      <button class="ghost" (click)="adding.set(!adding())">{{ adding() ? 'Fertig' : '+ Artikel' }}</button>
    </div>

    @if (adding()) {
      <div class="card add">
        <input type="search" placeholder="Artikel suchen …" [value]="query()" (input)="query.set($any($event.target).value)" autofocus />
        @for (item of addResults(); track item.id) {
          <button class="row plain" (click)="addExtra(item.id)">
            <span class="name">{{ item.name }}</span>
            <span class="muted">{{ aisleName(item.aisleId) }}</span>
          </button>
        } @empty {
          @if (query()) { <p class="muted pad">Nichts gefunden.</p> }
        }
      </div>
    }

    @for (group of groups(); track group.id) {
      <section>
        <h2>{{ group.name }}</h2>
        <div class="card">
          @for (e of group.entries; track e.key) {
            <div class="row" [class.optional]="e.optional">
              @if (e.members) {
                <div class="grow">
                  <div class="name">{{ e.name }}</div>
                  <div class="chips">
                    @for (m of e.members; track m.id) {
                      <button class="chip" (click)="store.buy(e, m)">{{ m.name }}</button>
                    }
                  </div>
                </div>
              } @else {
                <button class="check" (click)="store.buy(e)" aria-label="In den Wagen"></button>
                <div class="grow" (click)="store.buy(e)">
                  <div class="name">{{ e.name }}</div>
                  @if (meta(e); as m) {
                    <div class="muted small">{{ m }}</div>
                  }
                </div>
              }
              <span class="qty">{{ e.qty }}×</span>
            </div>
          }
        </div>
      </section>
    } @empty {
      <p class="empty">Alles da. Nichts zu kaufen 🎉</p>
    }

    @if (cart().length) {
      <section>
        <h2>Im Wagen ({{ cart().length }})</h2>
        <div class="card">
          @for (c of cart(); track c.itemId) {
            <div class="row done">
              <button class="check on" (click)="store.unbuy(c.itemId)" aria-label="Zurücklegen">✓</button>
              <div class="grow name">{{ c.name }}</div>
              <div class="stepper">
                <button (click)="store.changeCartQty(c.itemId, -1)" [disabled]="c.qty <= 1">−</button>
                <span>{{ c.qty }}</span>
                <button (click)="store.changeCartQty(c.itemId, 1)">+</button>
              </div>
            </div>
          }
        </div>
        <button class="primary wide" (click)="finish()">Einkauf abschließen</button>
        <p class="muted small center">Gekaufte Mengen sind schon im Bestand gebucht.</p>
      </section>
    }
  `,
})
export class ShoppingPage {
  protected readonly store = inject(Store);
  protected readonly showOptional = signal(true);
  protected readonly adding = signal(false);
  protected readonly query = signal('');

  protected readonly visible = computed(() =>
    this.store.shopping().filter((e) => this.showOptional() || !e.optional),
  );

  protected readonly openCount = computed(() => this.store.shopping().filter((e) => !e.optional).length);

  protected readonly groups = computed(() => {
    const entries = this.visible();
    const aisles = this.store.data().aisles;
    const known = new Set(aisles.map((a) => a.id));
    const groups = aisles.map((a) => ({
      id: a.id,
      name: a.name,
      entries: entries.filter((e) => e.aisleId === a.id).sort(byOptional),
    }));
    groups.push({ id: '?', name: 'Ohne Gruppe', entries: entries.filter((e) => !known.has(e.aisleId)) });
    return groups.filter((g) => g.entries.length);
  });

  protected readonly cart = computed(() => {
    const byId = this.store.itemsById();
    return this.store
      .data()
      .cart.map((c) => ({ ...c, name: byId.get(c.itemId)?.name ?? '?' }))
      .reverse();
  });

  protected readonly addResults = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return [];
    const onList = new Set(this.store.shopping().flatMap((e) => (e.item ? [e.item.id] : [])));
    return this.store
      .data()
      .items.filter((i) => i.name.toLowerCase().includes(q) && !onList.has(i.id))
      .slice(0, 8);
  });

  protected meta(e: ShoppingEntry): string {
    return [e.unit, e.note, e.optional ? 'optional' : ''].filter(Boolean).join(' · ');
  }

  protected aisleName(id: string): string {
    return this.store.data().aisles.find((a) => a.id === id)?.name ?? '';
  }

  protected addExtra(id: string): void {
    this.store.updateItem(id, (i) => (i.extra = true));
    this.query.set('');
  }

  protected finish(): void {
    this.store.finishShopping();
  }
}

function byOptional(a: ShoppingEntry, b: ShoppingEntry): number {
  return Number(a.optional) - Number(b.optional);
}
