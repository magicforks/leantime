# Pferdesimulationsspiel — Anforderungsdokumentation

## 1. Projektübersicht

**Name:** Pferdesimulation (Arbeitstitel)
**URL:** `horseriding.steden.me`
**Repo:** `magic141/horseriding`
**Entwicklungs-Repo:** `magicforks/leantime`, Branch `claude/horse-simulation-game-71uota`, Ordner `horse-game/`
**Vorbild:** Star Stable Online (isometrische Reitsimulation)

---

## 2. Technische Anforderungen

### 2.1 Laufzeitumgebung

- Reines **Browser-Spiel** — kein Backend, kein Server-State
- **ES6 Modules** (`type="module"`) — erfordert einen HTTP-Server (kein `file://`-Protokoll)
- Rendering über **HTML5 Canvas**, 2D isometrisch
- Kein Framework, kein Bundler, kein Build-Step — Vanilla JavaScript

### 2.2 Modulstruktur

```
horse-game/
├── index.html              ← Einstiegspunkt, CSS, DOM-Struktur
└── js/
    ├── main.js             ← Initialisierung, window.* Bindings, VERSION-Anzeige
    ├── constants.js        ← TILE, ISO_W, ISO_H, WORLD_W/H, CANVAS_W/H, T{}, SOLID, VERSION
    ├── camera.js           ← camAngle, camPitchH, camZoom, tileToScreen(), worldToScreen()
    ├── game.js             ← Haupt-Game-Loop, Render-Pipeline, Proximity-Detection
    ├── world.js            ← Kartengenerierung, alle Zonen, Shop-Layout
    ├── economy.js          ← Geld, Kauf-/Verkauf-Logik
    ├── input.js            ← Tastatur, Maus (Kamera-Drag, Klick, Kontextmenü)
    ├── ui.js               ← Notifications, Panel, Inventar-Tabs, Status-Bar, Minimap
    ├── draw-entities.js    ← drawHorse(), drawRider(), drawShopkeeper()
    ├── draw-tiles.js       ← isoPath(), drawTile(), getCachedTile(), Tile-Cache
    ├── data/
    │   ├── breeds.js       ← BREEDS[10], EQUIPMENT_ITEMS
    │   └── slots.js        ← SHOP_HORSE_SLOTS, SHOP_EQUIP_SLOTS, STALL_SLOTS
    ├── entities/
    │   ├── horse.js
    │   ├── player.js
    │   └── npc.js
    └── systems/
        ├── training.js
        ├── trail.js
        └── tournament.js
```

### 2.3 Isometrische Projektion

- Kachelgröße: `TILE = 48px`, Diamond `ISO_W = 96 × ISO_H = 48`
- Kamera: leicht erhöhte Vogelperspektive, angelehnt an Star Stable Online
- Alle Objekte werden nach Screen-Y depth-sortiert vor dem Zeichnen
- Statische Tiles werden einmalig in Off-Screen-Canvas vorgerendert (Tile-Cache)
- Tiles mit 1px-Expansion in `isoPath()` um sichtbare Seams zu vermeiden

### 2.4 Kamera-Steuerung

| Eingabe | Aktion |
|---|---|
| Rechtsklick + Ziehen (horizontal) | Kamera rotieren (beliebiger Winkel) |
| Rechtsklick + Ziehen (vertikal) | Kamera-Neigung anpassen (flach bis steil) |
| Scrollrad | Zoom (0.4× – 2.5×) |
| Q | 90° links drehen |
| R | 90° rechts drehen |
| C | Kamera auf Standardansicht zurücksetzen |

Der Spieler ist immer bildschirmmittig.

### 2.5 Versionierung

- `VERSION`-Konstante in `js/constants.js`, Format `YYYY.MM.N`
- Wird permanent unten rechts im Browser angezeigt
- Version wird bei jedem Git-Push automatisch hochgezählt

---

## 3. Spielwelt

### 3.1 Karte

- Größe: `70 × 70` Kacheln
- Kacheltypen: GRASS, FLOWER, DIRT, STABLE_FLOOR, STALL, WALL, FENCE, TREE, WATER, ARENA, PATH, PADDOCK
- Feste (solid) Kacheln, durch die nicht gelaufen werden kann: WALL, FENCE, TREE, STALL

### 3.2 Zonen

| Zone | Beschreibung |
|---|---|
| Stall | Stallgebäude mit Boxen für eigene Pferde, Paddock, Tore |
| Arena | Reitplatz mit Arena-Boden |
| Shop | Physisch begehbares Gebäude (siehe Abschnitt 4.4) |
| Pfade | Verbindende Wege zwischen allen Zonen |
| Wegweiser | Hinweisschilder im World-Space (z. B. „SHOP →") |

---

## 4. Funktionale Anforderungen

### 4.1 Spieler-Charakter

- Bewegt sich zu Fuß (animierter Walker) oder reitend auf einem Pferd
- Bewegung mit WASD / Pfeiltasten, immer relativ zur aktuellen Kameraausrichtung
- Interaktion mit **E**-Taste bei Nähe zu Objekten oder NPCs
- **L**-Taste: Pferd an der Leihleine führen
- Outfit des Spielers anpassbar: Helm, Jacke, Hose, Stiefel (jeweils Farbauswahl)

### 4.2 Pferde

- **10 verschiedene Rassen** sind kaufbar, jede mit eigenem Preis, Farbe und Stats (Geschwindigkeit, Ausdauer, Sprungkraft)
- Pferde können **benannt** und **umbenannt** werden
- **Fellfarbe** ist anpassbar (Farbpalette)
- Jedes Pferd hat **Ausrüstungsslots**: Sattel, Trense, Decke
- **Kontextmenü** per Linksklick auf ein Pferd: Reiten | Führen | Freilassen | Umbenennen | Farbe ändern
- Pferd kann in eine Stallbox eingestellt werden
- Mehrere Pferde gleichzeitig besitzbar

### 4.3 Ausrüstung

- **Drei Kategorien:** Sättel, Trensen, Decken
- Je Kategorie mehrere Items mit unterschiedlichen Preisen und Stat-Boni
- Kauf im Shop, Anlegen über das Inventar

### 4.4 Shop (physisch in der Spielwelt)

- Eigenständiges, begehbares Gebäude auf der Karte
- **Maria** (NPC-Shopkeeperin) steht sichtbar hinter einer Theke; die Theke ist durch solid-Kacheln (STALL) physisch unpassierbar
- **10 Pferde** stehen physisch in Boxen im Shop und sind als 3D-World-Objekte gerendert
- **Ausrüstungsgegenstände** (Sättel, Trensen, Decken) hängen an der rechten Wand und sind als World-Objekte gerendert
- Kauf durch **Annähern** (< 80px Euklidischer Abstand) + **E**-Taste
- **Kein Popup-Panel** — der Shop ist vollständig in der Spielwelt integriert

### 4.5 Wirtschaft

- Startvermögen: **500 Münzen**
- Geldanzeige permanent oben rechts sichtbar
- **Einnahmen** durch: Turnierteilnahme, Trail Rides
- **Ausgaben** für: Pferde kaufen, Ausrüstung kaufen

### 4.6 Training (3 Phasen)

| Phase | Beschreibung |
|---|---|
| 1 — Galopp-Rhythmus | Taste im richtigen Takt drücken |
| 2 — Acht-Figur | Checkpoints in einer Acht-Form abfahren |
| 3 — Springen | Hindernisse auf der Trainingsstrecke überwinden |

- Fortschrittsbalken während des Trainings sichtbar
- Abbruch jederzeit mit **ESC**
- Belohnung nach erfolgreichem Abschluss

### 4.7 Trail Ride

- Strecke mit einsammelbaren Münzen und Hindernissen
- Zielflagge am Streckenende
- Geldbelohnung nach Abschluss

### 4.8 Turnier

- Zwei Modi:
  - **Dressur:** Buchstabenmarker in vorgegebener Reihenfolge abfahren
  - **Springen:** Hindernisse der Reihe nach überwinden
- Geldprämie nach Abschluss

### 4.9 NPCs

- Mehrere NPC-Reiter roamen die Welt
- Jeder NPC hat einen Namen
- Gerendert wie der Spieler (Pferd + Reiter)

### 4.10 UI-Elemente

| Element | Beschreibung |
|---|---|
| Geldanzeige | Oben rechts, permanent sichtbar |
| Minimap | Oben links mit Spielerposition und rotierendem Nordpfeil |
| Interaktionshinweis | Unten mittig, erscheint bei Nähe zu interagierbaren Objekten |
| Notifications | Unterhalb der Mitte, automatisches Ausblenden nach ~2s |
| Kamera-Hinweis | Ganz unten, zeigt Steuerungstasten |
| Versionsnummer | Unten rechts, Format `vYYYY.MM.N` |
| **ESC** | Panel schließen / laufende Aktivität abbrechen |
| **TAB** | Inventar öffnen / schließen |

### 4.11 Inventar

- Tab-Navigation: **Pferde** | **Ausrüstung** | **Outfit**
- Pferd auswählen und aktivieren
- Ausrüstung auf ausgewähltes Pferd anlegen
- Outfit des Spielers einfärben

---

## 5. Deployment

- **Ziel-Domain:** `horseriding.steden.me`
- **Ziel-Repo:** `magic141/horseriding` (Branch `main`)
- Der Inhalt von `horse-game/` landet direkt im Root von `magic141/horseriding`
- Aktueller Entwicklungsstand liegt in `magicforks/leantime`, Branch `claude/horse-simulation-game-71uota`, Unterordner `horse-game/`
