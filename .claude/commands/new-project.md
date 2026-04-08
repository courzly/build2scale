---
name: new-project
description: Legt ein neues Projekt im Build2Scale-Repo an — entweder als MVP-Blueprint (Ideen-Validierung) oder Build-Blueprint (digitales Produkt). Aufruf wenn Daniel ein neues Projekt blueprinten will das in Build2Scale verwaltet wird.
---

Du legst ein neues Projekt im Build2Scale-Repo an.

## Kontext

Das Build2Scale-Repo liegt lokal unter:
`/Users/danielhofmann/Meine Ablage/Claude/Build2Scale/`

Es ist ein git-Repo, verknüpft mit `github.com/courzly/build2scale`.
GitHub Pages: `https://courzly.github.io/build2scale/`

Projektstruktur:
- `mvp/` — MVP-Projekte (Ideen-Validierung)
- `build/` — Build-Projekte (digitale Produkte)

Bestehende Projekte als Referenz:
- `mvp/inner-circle/` — Inner Circle Club (MVP-Blueprint)
- `build/d2c-summit/` — D2C Summit Platform (Build-Blueprint)

## Ablauf

### Schritt 1: Blueprint-Typ bestimmen

Falls nicht aus $ARGUMENTS klar, frage Daniel:

> **Welcher Blueprint-Typ?**
>
> **MVP** — Wir wollen eine Idee validieren, bevor wir bauen. Der Blueprint fokussiert auf Ausgangslage, Fragestellung, Hypothesen und Erfolgskriterien (Go/No-Go).
>
> **Build** — Wir bauen ein digitales Produkt. Der Blueprint fokussiert auf Ausgangslage, Konzept, Architektur und Backlog.

### Schritt 2: Projektinfos sammeln

Falls nicht aus $ARGUMENTS klar, frage nach:
- Projektname (kurz, für Ordnernamen, z.B. `loyalty-shop`)
- Auftraggeber / Kunde
- Kurzbeschreibung des Ziels
- **Nur bei MVP:** Kernhypothese / Fragestellung, erste KPI-Ideen
- **Nur bei Build:** Repo-URL oder lokaler Pfad zur Codebase (falls vorhanden), Budget & Deadline
- Angebotsnummer (falls vorhanden)

### Schritt 3 (nur Build): Codebase lesen

Falls ein Repo vorhanden: Klone oder lies die Dateien.
Verschaffe dir Überblick über:
- Tech Stack, Frameworks, Architektur
- Datenbankschema
- Bestehende Module die für das neue Feature relevant sind
- Deployment-Setup

### Schritt 4: Projektordner anlegen

**Für MVP-Projekte:** Lege an: `/Users/danielhofmann/Meine Ablage/Claude/Build2Scale/mvp/{projekt-slug}/`

Erstelle diese HTML-Dateien:
- `index.html` — Übersicht mit MVP-Sektionen: Ausgangslage, Fragestellung, Erfolgskriterien/Go-No-Go, Projektkennzahlen, Blueprint-Dokumente
- `konzept.html` — Idee, Scope, was wir testen und warum, MVP-Features
- `backlog.html` — User Stories und Scope des MVP (was bauen wir, was nicht)
- ggf. weitere Seiten je nach Bedarf (z.B. offene-fragen.html)

**Für Build-Projekte:** Lege an: `/Users/danielhofmann/Meine Ablage/Claude/Build2Scale/build/{projekt-slug}/`

Erstelle diese HTML-Dateien:
- `index.html` — Übersicht mit Ausgangslage, Projektkennzahlen, Blueprint-Dokumente
- `konzept.html` — Architektur, Features (MVP + Post-MVP), Design, Abgrenzungen
- `backlog.html` — User Stories verteilt auf Module (stories.js als Single Source of Truth)
- `anforderungen.html` — Datenmodell, Feeds/Schnittstellen, Flows (falls relevant)
- `technik.html` — Dateistruktur, Coding-Konventionen, Bestehende Dateien (falls Codebase vorhanden)
- `offene-fragen.html` — Offene Fragen aus questions.json

**Design-Referenz für beide Typen:**
Schau dir `mvp/inner-circle/index.html` (MVP) oder `build/d2c-summit/index.html` (Build) an — gleiches CSS, gleiche Navbar-Struktur, gleiches Dark Theme. Passe Farben/Inhalte an das neue Projekt an.

Jede Datei braucht:
- Vollständiges CSS (identisch mit Referenzprojekt)
- Sticky Navbar mit Links zu allen Seiten (aktive Seite mit class="nav-link active")
- Footer mit Prev/Next Navigation

### Schritt 5: projects.json aktualisieren

Füge das neue Projekt in `/Users/danielhofmann/Meine Ablage/Claude/Build2Scale/projects.json` ein:
```json
{
  "id": "{projekt-slug}",
  "name": "{Projektname}",
  "type": "mvp",
  "description": "{Kurzbeschreibung}",
  "icon": "{passendes Emoji}",
  "path": "../mvp/{projekt-slug}/api/v1",
  "color": "{Hex-Farbe}"
}
```
Für Build-Projekte: `"type": "build"` und `"path": "../build/{projekt-slug}/api/v1"`.

### Schritt 6: Memory-Eintrag erstellen

Lege an:
`/Users/danielhofmann/.claude/projects/-Users-danielhofmann-Meine-Ablage-Claude-Build2Scale/memory/project_{projekt-slug}.md`

Format:
```markdown
---
name: {Projektname}
description: {Ein-Satz-Beschreibung}
type: project
---

**Typ:** {MVP / Build}
{Auftraggeber} beauftragt go2flow mit {Kurzbeschreibung}.

**Budget:** {Budget} | **Frist:** {Deadline}
**Blueprint:** /Users/danielhofmann/Meine Ablage/Claude/Build2Scale/{mvp|build}/{slug}/

**Why:** {Warum wird das gebaut?}

**How to apply:** {Wie soll Claude dieses Wissen nutzen?}
```

Aktualisiere auch:
`/Users/danielhofmann/.claude/projects/-Users-danielhofmann-Meine-Ablage-Claude-Build2Scale/memory/MEMORY.md`

### Schritt 7: Commit & Push
```bash
cd "/Users/danielhofmann/Meine Ablage/Claude/Build2Scale"
git add {mvp|build}/{projekt-slug}/ projects.json
git commit -m "feat: {projekt-name} Blueprint — {MVP|Build}"
git push
```

### Schritt 8: Zusammenfassung
Berichte Daniel:
- Blueprint-Typ: MVP oder Build
- Projektordner erstellt: `{pfad}`
- Live-URL: `https://courzly.github.io/build2scale/{mvp|build}/{slug}/`
- Memory-Eintrag erstellt
- Was noch offen ist (KPIs bei MVP, offene technische Fragen bei Build)
