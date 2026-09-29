import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Item, newId } from '../model';
import { Store } from '../store';

@Component({
  selector: 'app-items',
  imports: [RouterLink],
  template: `
    <header class="bar">
      <h1>Artikel</h1>
      <a class="ghost" routerLink="/artikel/neu">+ Neu</a>
    </header>

    <div class="toolbar">
      <label class="switch">
        <input type="checkbox" [checked]="byAisle()" (change)="byAisle.set(!byAisle())" />
        Nach Supermarkt gruppieren
      </label>
    </div>
    <input type="search" class="search" placeholder="Suchen …" [value]="query()" (input)="query.set($any($event.target).value)" />

    @for (g of groups(); track g.id) {
      <section>
        <h2>{{ g.name }}</h2>
        <div class="card">
          @for (item of g.items; track item.id) {
            <a class="row plain" [routerLink]="['/artikel', item.id]">
              <span class="grow name">{{ item.name }}</span>
              <span class="muted small">{{ otherName(item) }}</span>
            </a>
          }
        </div>
      </section>
    }
  `,
})
export class ItemsPage {
  protected readonly store = inject(Store);
  protected readonly byAisle = signal(false);
  protected readonly query = signal('');

  protected readonly groups = computed(() => {
    const d = this.store.data();
    const q = this.query().trim().toLowerCase();
    const items = q ? d.items.filter((i) => i.name.toLowerCase().includes(q)) : d.items;
    const places = this.byAisle() ? d.aisles : d.locations;
    const key: keyof Item = this.byAisle() ? 'aisleId' : 'locationId';
    return places
      .map((p) => ({ ...p, items: items.filter((i) => i[key] === p.id) }))
      .filter((g) => g.items.length);
  });

  protected otherName(item: Item): string {
    const d = this.store.data();
    return this.byAisle()
      ? (d.locations.find((l) => l.id === item.locationId)?.name ?? '')
      : (d.aisles.find((a) => a.id === item.aisleId)?.name ?? '');
  }
}

@Component({
  selector: 'app-item-edit',
  imports: [FormsModule],
  template: `
    <header class="bar">
      <button class="ghost" (click)="back()">‹ Zurück</button>
      <h1>{{ isNew ? 'Neuer Artikel' : 'Bearbeiten' }}</h1>
    </header>

    @if (draft) {
      <form class="card form" (ngSubmit)="save()">
        <label>Name <input name="name" [(ngModel)]="draft.name" required /></label>
        <label>Lagerort
          <select name="loc" [(ngModel)]="draft.locationId">
            @for (l of store.data().locations; track l.id) { <option [value]="l.id">{{ l.name }}</option> }
          </select>
        </label>
        <label>Gruppe im Supermarkt
          <select name="aisle" [(ngModel)]="draft.aisleId">
            @for (a of store.data().aisles; track a.id) { <option [value]="a.id">{{ a.name }}</option> }
          </select>
        </label>
        <div class="pair">
          <label>Bestand <input name="amount" type="number" step="0.5" min="0" [(ngModel)]="draft.amount" /></label>
          <label>Zielmenge <input name="target" type="number" step="1" min="0" [(ngModel)]="draft.target" [disabled]="!!draft.comboId" /></label>
        </div>
        <label>Packungsgröße <input name="unit" [(ngModel)]="draft.unit" placeholder="z. B. 400 g" /></label>
        <label>Notiz <input name="note" [(ngModel)]="draft.note" /></label>
        <label>Kombi
          <select name="combo" [(ngModel)]="draft.comboId">
            <option [ngValue]="undefined">– keine –</option>
            @for (c of store.data().combos; track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
          </select>
        </label>
        <label class="switch"><input type="checkbox" name="optional" [(ngModel)]="draft.optional" /> Optional (nur bei Lust oder Angebot)</label>
        <label class="switch"><input type="checkbox" name="extra" [(ngModel)]="draft.extra" /> Beim nächsten Einkauf auf jeden Fall mitnehmen</label>
        <button class="primary wide" type="submit" [disabled]="!draft.name.trim()">Speichern</button>
        @if (!isNew) {
          <button class="danger wide" type="button" (click)="remove()">Löschen</button>
        }
      </form>
    } @else {
      <p class="empty">Artikel nicht gefunden.</p>
    }
  `,
})
export class ItemEditPage {
  protected readonly store = inject(Store);
  private readonly router = inject(Router);
  readonly id = input.required<string>();

  protected draft?: Item;
  protected isNew = false;

  ngOnInit(): void {
    const d = this.store.data();
    this.isNew = this.id() === 'neu';
    const found = d.items.find((i) => i.id === this.id());
    this.draft = this.isNew
      ? { id: newId(), name: '', locationId: d.locations[0]?.id, aisleId: d.aisles[0]?.id, amount: 0, target: 1 }
      : found && structuredClone(found);
  }

  protected save(): void {
    const draft = { ...this.draft!, name: this.draft!.name.trim(), amount: +this.draft!.amount || 0, target: +this.draft!.target || 0 };
    this.store.update((d) => {
      const idx = d.items.findIndex((i) => i.id === draft.id);
      if (idx >= 0) d.items[idx] = draft;
      else d.items.push(draft);
    });
    this.back();
  }

  protected remove(): void {
    if (!confirm(`„${this.draft!.name}“ löschen?`)) return;
    this.store.update((d) => {
      d.items = d.items.filter((i) => i.id !== this.draft!.id);
      d.cart = d.cart.filter((c) => c.itemId !== this.draft!.id);
    });
    this.back();
  }

  protected back(): void {
    history.length > 1 ? history.back() : this.router.navigate(['/artikel']);
  }
}
