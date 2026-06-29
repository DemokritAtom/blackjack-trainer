# Blackjack Trainer

Minimalistische, dunkle PWA zum Trainieren von **Basisstrategie** und **Hi-Lo Card Counting**. Offline-fähig, installierbar, optimiert für Mobile.

## Modi

**Strategie** — Dealer-Karte + zufällige 2-Karten-Hand. Aktion über ein radiales Drag-Menü wählen (Hub unten rechts gedrückt halten, in Richtung der Aktion ziehen, loslassen). Vergleich gegen eine geprüfte Basisstrategie-Tabelle.

**Counting (Hi-Lo)** — Karten einzeln durchgehen, per Wisch mitzählen (rechts +1, links −1, Tap = neutral), danach Running Count und True Count abfragen.

## Konfiguration der Strategie

S17 (Dealer steht auf weicher 17), 4–8 Decks, Double After Split (DAS), Late Surrender — die weltweit gängigste Casino-Konfiguration.

## Tests

```bash
node test.js
```

Prüft 35 bekannte Standard-Entscheidungen aus öffentlichen S17-Charts gegen die eigene Engine.

## Lokal starten

```bash
python3 -m http.server 8138
# http://127.0.0.1:8138
```

## Icons neu erzeugen

```bash
python3 tools/gen_icons.py
```
