# Vorrat

Lebensmittel-Inventur und Einkaufsliste als installierbare Offline-Web-App (Angular-PWA).

- **Inventur:** pro Lagerort Bestände zählen, ½ = angebrochen
- **Einkauf:** fehlende Artikel nach Supermarkt-Gruppen in Laufreihenfolge, Abhaken bucht direkt in den Bestand
- **Kombis:** austauschbare Artikel mit gemeinsamer Zielmenge (z. B. Nudelsorten)
- Daten liegen nur im Browser des Geräts; Sicherung per JSON-Export unter „Mehr“

## Entwicklung

```bash
npm install
npm start
```

Der Service Worker ist nur im Produktions-Build aktiv (`npx ng build`).

## Deployment

Jeder Push auf `main` baut die App per GitHub Action und veröffentlicht sie auf GitHub Pages
(Repository → Settings → Pages → Source: „GitHub Actions“).
