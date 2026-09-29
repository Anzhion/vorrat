import { Routes } from '@angular/router';
import { InventoryPage } from './pages/inventory';
import { ItemEditPage, ItemsPage } from './pages/items';
import { SettingsPage } from './pages/settings';
import { ShoppingPage } from './pages/shopping';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'einkauf' },
  { path: 'einkauf', component: ShoppingPage, title: 'Einkauf' },
  { path: 'inventur', component: InventoryPage, title: 'Inventur' },
  { path: 'artikel', component: ItemsPage, title: 'Artikel' },
  { path: 'artikel/:id', component: ItemEditPage, title: 'Artikel' },
  { path: 'mehr', component: SettingsPage, title: 'Mehr' },
  { path: '**', redirectTo: 'einkauf' },
];
