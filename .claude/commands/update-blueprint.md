---
name: update-blueprint
description: Aktualisiert den Blueprint eines bestehenden Projekts mit neuen Informationen (Meeting-Notizen, E-Mails, PDFs, etc.) und pushed die Änderungen zu GitHub. Aufruf wenn Daniel neue Infos zu einem Projekt teilt.
---

Du aktualisierst den Blueprint eines bestehenden Build2Scale-Projekts.

## Kontext

Das Build2Scale-Repo liegt lokal unter:
`/Users/danielhofmann/Meine Ablage/Claude/Build2Scale/`

Es ist ein git-Repo, verknüpft mit `github.com/courzly/build2scale`.
GitHub Pages läuft unter `https://courzly.github.io/build2scale/`.

Projektstruktur:
- `mvp/{projekt-slug}/` — MVP-Projekte (Ideen-Validierung)
- `build/{projekt-slug}/` — Build-Projekte (digitale Produkte)

## Ablauf

### Schritt 1: Projekt identifizieren

Falls nicht aus $ARGUMENTS klar: Frage Daniel welches Projekt aktualisiert werden soll.
Lies das aktuelle `index.html` des Projekts um Typ (MVP/Build) und Stand zu verstehen.

**Wichtig:** Prüfe ob es ein MVP- oder Build-Projekt ist — das bestimmt welche Seiten existieren und welche Sektionen du updaten sollst.

### Schritt 2: Neue Informationen analysieren

Analysiere die neuen Informationen die Daniel bereitgestellt hat:
- Was ist neu? Was widerspricht dem bisherigen Stand?
- Welche Seiten sind betroffen?
- Gibt es neue offene Fragen oder geklärte Entscheidungen?

### Schritt 3: Richtige Seiten updaten

Lies die betroffenen HTML-Dateien **zuerst vollständig**, dann mach die gezielten Änderungen.

**Bei MVP-Projekten (`mvp/{slug}/`):**
- Ausgangslage, Fragestellung, Hypothesen → `index.html` (Sektionen A, F)
- Erfolgskriterien / KPIs geändert → `index.html` (Sektion E)
- Konzept oder Scope geändert → `konzept.html`
- User Stories oder MVP-Scope → `backlog.html`
- Offene Fragen → `offene-fragen.html`

**Bei Build-Projekten (`build/{slug}/`):**
- Neue Features oder Architektur → `konzept.html`
- Neue Anforderungen, DB-Änderungen, Flows → `anforderungen.html`
- Neue technische Entscheidungen, Dateistruktur → `technik.html`
- Projektkoordination, Timeline, Offene Fragen → `projektmanagement.html`
- User Stories / Backlog → `backlog.html` (oder `module.html`)
- Implementierungs-Details → `implementierung.html`

**Für beide Typen:**
- Ausgangslage hat sich geändert → `index.html` (Sektion A)
- Bestehenden Inhalt nicht einfach überschreiben — ergänzen und verfeinern
- Offene Fragen die geklärt wurden: als beantwortet markieren oder entfernen
- Neue offene Fragen hinzufügen
- Sektionsnummern konsistent halten

### Schritt 4: Commit & Push
```bash
cd "/Users/danielhofmann/Meine Ablage/Claude/Build2Scale"
git add {mvp|build}/{projekt-ordner}/
git commit -m "update: {projekt-name} — {kurze Beschreibung der Änderungen}"
git push
```

### Schritt 5: Zusammenfassung
Berichte Daniel kurz:
- Welche Seiten wurden geändert
- Was die wichtigsten inhaltlichen Updates sind
- Die Live-URL: `https://courzly.github.io/build2scale/{mvp|build}/{projekt-ordner}/`
