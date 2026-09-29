import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Inventory, Place, newId } from '../model';
import { seedInventory } from '../seed';
import { Store } from '../store';

type PlaceList = 'aisles' | 'locations';

@Component({
  selector: 'app-settings',
  imports: [DatePipe],
  template: `
    <header class="bar"><h1>Mehr</h1></header>

    <section>
      <h2>Supermarkt-Route</h2>
      <p class="muted small">In der Reihenfolge, in der du durch den Laden gehst. So ist die Einkaufsliste sortiert.</p>
      <div class="card">
        @for (a of store.data().aisles; track a.id; let first = $first; let last = $last) {
          <div class="row">
            <input class="grow inline" [value]="a.name" (change)="rename('aisles', a.id, $any($event.target).value)" />
            <span class="muted small">{{ count('aisleId', a.id) }}</span>
            <button class="icon" (click)="move('aisles', a.id, -1)" [disabled]="first" aria-label="Nach oben">↑</button>
            <button class="icon" (click)="move('aisles', a.id, 1)" [disabled]="last" aria-label="Nach unten">↓</button>
            <button class="icon" (click)="removePlace('aisles', a)" aria-label="Löschen">✕</button>
          </div>
        }
        <button class="row plain add-row" (click)="add('aisles')">+ Gruppe hinzufügen</button>
      </div>
    </section>

    <section>
      <h2>Lagerorte</h2>
      <div class="card">
        @for (l of store.data().locations; track l.id; let first = $first; let last = $last) {
          <div class="row">
            <input class="grow inline" [value]="l.name" (change)="rename('locations', l.id, $any($event.target).value)" />
            <span class="muted small">{{ count('locationId', l.id) }}</span>
            <button class="icon" (click)="move('locations', l.id, -1)" [disabled]="first" aria-label="Nach oben">↑</button>
            <button class="icon" (click)="move('locations', l.id, 1)" [disabled]="last" aria-label="Nach unten">↓</button>
            <button class="icon" (click)="removePlace('locations', l)" aria-label="Löschen">✕</button>
          </div>
        }
        <button class="row plain add-row" (click)="add('locations')">+ Lagerort hinzufügen</button>
      </div>
    </section>

    <section>
      <h2>Kombis</h2>
      <p class="muted small">Austauschbare Artikel, von denen zusammen eine Zielmenge da sein soll. Zuordnung beim Artikel.</p>
      <div class="card">
        @for (c of store.data().combos; track c.id) {
          <div class="row">
            <div class="grow">
              <input class="inline" [value]="c.name" (change)="renameCombo(c.id, $any($event.target).value)" />
              <div class="muted small">{{ comboMembers(c.id) }}</div>
            </div>
            <input class="inline num" type="number" min="1" [value]="c.target" (change)="setComboTarget(c.id, $any($event.target).value)" aria-label="Zielmenge" />
            <button class="icon" (click)="removeCombo(c.id)" aria-label="Löschen">✕</button>
          </div>
        }
        <button class="row plain add-row" (click)="addCombo()">+ Kombi hinzufügen</button>
      </div>
    </section>

    <section>
      <h2>Daten</h2>
      <div class="card pad">
        <p class="small">Die Daten liegen nur auf diesem Gerät. Zuletzt geändert: {{ store.data().updatedAt | date: 'dd.MM.yyyy HH:mm' }}</p>
        @if (store.saveError()) { <p class="error small">Speichern im Browser fehlgeschlagen. Bitte exportieren!</p> }
        <button class="primary wide" (click)="exportJson()">Sicherung exportieren</button>
        <label class="button wide">Sicherung importieren<input type="file" accept="application/json,.json" hidden (change)="importJson($event)" /></label>
        <button class="danger wide" (click)="reset()">Auf Startdaten zurücksetzen</button>
      </div>
    </section>
  `,
})
export class SettingsPage {
  protected readonly store = inject(Store);

  protected count(key: 'aisleId' | 'locationId', id: string): number {
    return this.store.data().items.filter((i) => i[key] === id).length;
  }

  protected rename(list: PlaceList, id: string, name: string): void {
    if (!name.trim()) return;
    this.store.update((d) => (d[list].find((p) => p.id === id)!.name = name.trim()));
  }

  protected move(list: PlaceList, id: string, dir: number): void {
    this.store.update((d) => {
      const arr = d[list];
      const i = arr.findIndex((p) => p.id === id);
      [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]];
    });
  }

  protected add(list: PlaceList): void {
    const name = prompt(list === 'aisles' ? 'Name der Gruppe' : 'Name des Lagerorts');
    if (name?.trim()) this.store.update((d) => d[list].push({ id: newId(), name: name.trim() }));
  }

  protected removePlace(list: PlaceList, place: Place): void {
    const n = this.count(list === 'aisles' ? 'aisleId' : 'locationId', place.id);
    if (n) {
      alert(`„${place.name}“ enthält noch ${n} Artikel. Bitte erst umsortieren.`);
      return;
    }
    if (confirm(`„${place.name}“ löschen?`)) this.store.update((d) => (d[list] = d[list].filter((p) => p.id !== place.id)));
  }

  protected comboMembers(id: string): string {
    return this.store.data().items.filter((i) => i.comboId === id).map((i) => i.name).join(', ') || 'noch keine Artikel';
  }

  protected renameCombo(id: string, name: string): void {
    if (name.trim()) this.store.update((d) => (d.combos.find((c) => c.id === id)!.name = name.trim()));
  }

  protected setComboTarget(id: string, value: string): void {
    this.store.update((d) => (d.combos.find((c) => c.id === id)!.target = Math.max(0, +value || 0)));
  }

  protected addCombo(): void {
    const name = prompt('Name der Kombi, z. B. „Nudeln“');
    if (name?.trim()) this.store.update((d) => d.combos.push({ id: newId(), name: name.trim(), target: 1 }));
  }

  protected removeCombo(id: string): void {
    if (!confirm('Kombi löschen? Die Artikel bleiben erhalten.')) return;
    this.store.update((d) => {
      d.combos = d.combos.filter((c) => c.id !== id);
      d.items.forEach((i) => i.comboId === id && delete i.comboId);
    });
  }

  protected exportJson(): void {
    const blob = new Blob([JSON.stringify(this.store.data(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vorrat-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  protected async importJson(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const inv = JSON.parse(await file.text()) as Inventory;
      if (!Array.isArray(inv.items) || !Array.isArray(inv.aisles) || !Array.isArray(inv.locations)) throw new Error();
      if (confirm(`${inv.items.length} Artikel importieren? Der aktuelle Stand wird ersetzt.`)) this.store.replace(inv);
    } catch {
      alert('Die Datei ist keine gültige Sicherung.');
    }
  }

  protected reset(): void {
    if (confirm('Alle Daten durch den Startbestand ersetzen?')) this.store.replace(seedInventory());
  }
}
