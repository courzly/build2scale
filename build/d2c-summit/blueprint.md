# D2C Summit Platform — Blueprint

> Go 2 Flow Entwicklungsprojekt | Stand: März 2026
> Tech-Richtlinie: Nuxt 4 / Vue 3 / Tailwind CSS + Laravel (LTS) / MySQL

---

## 1. Projektziel & Scope

### Vision
Eine vollständige, wiederverwendbare **Event Management Platform** für den D2C Summit — jährlich durchführbar, ohne jedes Mal von vorne zu beginnen. Ein einziges Backend als "Single Source of Truth" für alle Frontends.

### In Scope (Phase I)
- Public Website (aus Backend gespeist, kein separates CMS)
- Admin-Backend (Event-Steuerung, Programm, Ticketing, Marketing)
- My Summit Mitgliederbereich (Ticket, Sessions, Badge, Materialien)
- Sponsor-Portal (Self-Service)
- Speaker-Portal (Self-Service)
- Ticket-System via Payrexx (inkl. Voucher + Direktlinks)
- Marketing Engine mit Mailtrap-Anbindung
- Statistics Dashboard
- Check-in Web-App (QR-Scanner, mobiloptimiert)
- Social Share Cards
- Badges & Attendance Certificates

### Out of Scope (Phase II)
- Native Mobile App (iOS/Android)
- Networking / QR-Kontaktaustausch zwischen Attendees
- Post-Event Replay / Video-Plattform
- 3D-Venue-Map

---

## 2. Architektur

### Leitprinzip: Single Source of Truth

```
┌─────────────────────────────────────────────────────────────┐
│                   LARAVEL API + MYSQL                        │
│                  (Single Source of Truth)                    │
│   Events · Programm · Speaker · Tickets · User · Sponsors   │
│   Marketing · Stats · Materialien · Badges · Voucher        │
└────┬──────────┬──────────────┬──────────────┬───────────────┘
     │          │              │              │
     ▼          ▼              ▼              ▼
┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│ PUBLIC  │ │MY SUMMIT │ │ SPONSOR  │ │    ADMIN     │
│ WEBSITE │ │(Members) │ │  PORTAL  │ │   BACKEND    │
└─────────┘ └──────────┘ └──────────┘ └──────────────┘
         ┌──────────┐   ┌──────────┐
         │ SPEAKER  │   │ CHECK-IN │
         │  PORTAL  │   │  WEB-APP │
         └──────────┘   └──────────┘
         Alle Frontends: Nuxt 4 / Vue 3 / Tailwind CSS
```

### Domain-Architektur
```
d2c-summit.ch           → Public Website
my.d2c-summit.ch        → My Summit (Attendee, Speaker, Sponsor)
admin.d2c-summit.ch     → Admin Backend
checkin.d2c-summit.ch   → Check-in App
```

---

## 3. Tech Stack

| Schicht | Technologie | Begründung |
|---------|-------------|------------|
| Backend API | Laravel (LTS) | Go 2 Flow Standard, robust für komplexe Datenmodelle |
| Datenbank | MySQL | Go 2 Flow Standard |
| Frontend | Nuxt 4 / Vue 3 | Go 2 Flow Standard, SSR für Public Website |
| Styling | Tailwind CSS (latest) | Go 2 Flow Pflicht, kein SCSS/CSS |
| State Management | Pinia | Vue 3 Standard |
| Auth | Laravel Sanctum | Token-basiert, einfach mit Nuxt |
| E-Mail | Mailtrap API | Transaktional + Marketing |
| Zahlung | Payrexx Whitelabel | bestehende Integration |
| File Storage | Laravel Storage + S3 | Logos, PDFs, Präsentationen |
| PDF-Generierung | Laravel + Browsershot/DomPDF | Tickets, Badges, Zertifikate |
| Tests | Pest (Laravel), Vitest (Nuxt) | Go 2 Flow Standard |
| CI/CD | GitHub Actions | Go 2 Flow Standard |

---

## 4. Module (detailliert)

### Modul 1: Event Engine
Jedes Jahr ein neues Event anlegen. Vergangene Events werden archiviert — Statistiken bleiben erhalten.

**Features:**
- Event erstellen: Name, Slug, Datum, Venue, Beschreibung, Status (draft/published/archived)
- Branding-Config pro Event: Primärfarbe, Logo, Hero-Image
- Stages/Räume definieren (Name, Kapazität)
- Event klonen (für Folgejahre als Ausgangspunkt)

---

### Modul 2: Programm-Manager (Single Source of Truth)
Einmal erfassen → überall anzeigen (Website, My Summit, Admin).

**Session-Typen:** Keynote / Masterclass / Panel / Break / Networking

**Features:**
- Session anlegen: Titel, Beschreibung, Typ, Stage, Start/End, Kapazität, buchbar (ja/nein)
- Speaker einer Session zuweisen (mehrere möglich)
- Session-Materialien hochladen (Präsentation, Ressourcen)
- Drag & Drop Programm-Reihenfolge im Admin
- Parallele Sessions sichtbar im Tagesplan

---

### Modul 3: Speaker-Management

**Features:**
- Speaker-Profil: Vorname, Nachname, Titel, Firma, Bio, Foto, LinkedIn, Twitter, Website
- Speaker einem Event zuweisen
- Speaker-Login: Eigenes Profil bearbeiten, Präsentationen hochladen
- Automatische Anzeige auf Public Website + My Summit

---

### Modul 4: Ticket-System via Payrexx

**Features:**
- Ticket-Kategorien pro Event: Name, Beschreibung, Preis, Kapazität, Verkaufszeitraum
- Persönliches Ticket: Vorname, Nachname, Firma, Funktion auf Ticket eingedruckt
- Checkout-Flow: Kategorie wählen → Daten eingeben → Payrexx-Weiterleitung → Bestätigung
- Order-Management: Bestellübersicht, Status, Rechnungsdownload (PDF)
- QR-Code pro Ticket (unique, fälschungssicher)
- Ticket-PDF generieren + per E-Mail senden
- Stornierung + Rückerstattung (manuell via Admin)

**Voucher-System:**
- Voucher-Codes: Prozent-Rabatt / Fixbetrag-Rabatt / 100% Gratis
- Max. Einlösungen pro Code definierbar
- Ablaufdatum
- Beschränkung auf bestimmte Ticket-Kategorie (optional)
- **Direktlink**: `d2c-summit.ch/tickets?voucher=CODE` → Benutzer landet direkt im Checkout mit vorausgefülltem Voucher
- Voucher-Statistiken: wer hat eingelöst, wie oft

---

### Modul 5: My Summit (Mitgliederbereich)

**Zugang:** Nach Registrierung / Ticketkauf

**Dashboard zeigt:**
- Mein Ticket (mit QR-Code, Download als PDF)
- Mein Tagesplan (gebuchte Sessions)
- Offene Masterclass-Buchungen
- Neue Materialien verfügbar

**Features:**
- **Ticket-Ansicht**: QR-Code, persönliche Daten, Kategorie, Rechnung
- **Programm & Buchung**: Vollständiges Programm, Masterclasses mit Platz-Anzeige buchen/stornieren
- **Warteliste**: Bei voller Masterclass automatisch auf Warteliste + Benachrichtigung bei freiem Platz
- **Materialien**: Präsentationen + Ressourcen der gebuchten/besuchten Sessions
- **Badge**: Personalisiertes Attendee-Badge generieren (PDF + PNG für LinkedIn)
- **Zertifikat**: Nach dem Event: Certificate of Attendance (PDF)
- **Profil**: Name, Firma, Funktion, LinkedIn bearbeiten
- **Rechnung**: Download der Bestellrechnung(en)

---

### Modul 6: Rollen & Rechte

| Rolle | Zugang |
|-------|--------|
| `super_admin` | Alles inkl. Events anlegen, Rollen vergeben |
| `organizer` | Event-Inhalte, Programm, Speaker, Tickets (kein Finanz-Admin) |
| `sponsor_manager` | Sponsor-Pakete + Sponsor-Zuweisungen |
| `speaker` | Eigenes Profil + Session-Materialien hochladen |
| `attendee` | My Summit (Ticket, Sessions, Badge, Materialien) |
| `sponsor` | Sponsor-Portal (Profil, Logo, Materialien downloaden) |
| `checkin` | Nur Check-in Scanner, kein anderer Zugang |

Rollen sind **per Event** vergeben (Daniel ist in Event 2025 Organizer, in Event 2026 auch).

---

### Modul 7: Sponsor-Portal

**Admin-Seite:**
- Sponsor-Pakete definieren: Platin / Gold / Silver / Bronze / Partner
- Leistungen pro Paket (JSON): Logo-Platz, Anzahl Tickets, Redner-Slot, etc.
- Sponsor einer Firma zuweisen, Paket zuordnen

**Sponsor Self-Service:**
- Logo hochladen (verschiedene Formate: PNG, SVG)
- Firmenbeschreibung, Website-URL, Ansprechpartner pflegen
- **Sponsor-Materialien** herunterladen: Toolkit, Design-Guidelines, Assets (vom Admin hinterlegt)
- Statistiken: Logo-Impressions auf Website, Klicks

**Public Website:**
- Automatische Anzeige nach Paket-Rang (Platin oben)
- Logo + Link + kurze Beschreibung

---

### Modul 8: Marketing Engine

**Kontakt-Management:**
- Kontakte importieren (CSV aus bestehendem Event)
- Kontakte aus Ticketkäufen automatisch hinzufügen
- Tags: Segmentierung (2025-Attendee, VIP, Speaker, Newsletter, etc.)
- Kontaktlisten (Segments) erstellen
- DSGVO: Unsubscribe-Link in jeder Mail, Consent-Flag

**Kampagnen via Mailtrap:**
- Kampagne anlegen: Name, Betreff, Absender, Template, Ziel-Liste
- HTML-Template-Editor (oder Template auswählen)
- Vorschau + Test-Mail senden
- Versand planen (scheduled) oder sofort senden
- **Mailtrap API**: Kampagnen-Versand + Statistiken zurückholen

**Automatisierte Sequenzen (Triggers):**
| Trigger | E-Mail |
|---------|--------|
| Ticket gekauft | Bestätigung + Ticket PDF |
| Masterclass gebucht | Buchungsbestätigung |
| Warteliste → Platz frei | Einladung zur Buchung |
| 7 Tage vor Event | "Dein Tagesplan" + praktische Infos |
| 1 Tag vor Event | Reminder + Programm-Highlight |
| Post-Event (Tag +1) | Danke + Präsentationen verfügbar |
| Session-Feedback | Bitte um Bewertung |

**E-Mail Templates:**
- Templates pro Kategorie (transaktional / marketing)
- Variablen: `{{first_name}}`, `{{event_name}}`, `{{ticket_url}}`, etc.
- Templates im Admin bearbeiten

**UTM-Tracking:**
- Pro Kampagne UTM-Parameter generieren
- Shortlink erstellen
- Klick-Tracking → welche Kampagne bringt die meisten Ticket-Käufe

---

### Modul 9: Statistics Dashboard

**Admin-Übersicht (Echtzeit):**
- Ticket-Verkäufe gesamt + nach Kategorie (Zahl + Chart)
- Umsatz gesamt
- Voucher-Einlösungen
- Registrierungen vs. Check-ins am Eventtag
- Session-Auslastung (welche Masterclasses sind voll/leer)

**Marketing-Stats:**
- Kampagnen: Sent / Delivered / Opened / Clicked / Bounced
- UTM-Conversions: Kampagne → Ticketkäufe

**Post-Event:**
- Check-in Rate gesamt + nach Ticket-Kategorie
- Session-Attendance
- Feedback-Ratings pro Session + Speaker
- Vorjahresvergleich (wenn Event 2025 vorhanden)

**Sponsor-Stats:**
- Logo-Impressions auf Website
- Klicks auf Sponsor-Links

---

### Modul 10: Check-in (Web-App)

**Zugang:** Rolle `checkin`, mobiloptimiert (iPhone/Android Browser)

**Features:**
- QR-Code Scanner (Browser-Kamera)
- Ticket validieren: Name, Firma, Foto (falls hinterlegt), Ticket-Kategorie, gebuchte Masterclasses anzeigen
- Check-in bestätigen → Ticket-Status wird auf `checked_in` gesetzt
- Fehlermeldung bei: ungültigem QR, bereits eingecheckt, stoniertem Ticket
- Offline-Fallback: lokaler Cache für Notfälle

---

### Modul 11: Public Website

Alle Inhalte kommen aus dem Laravel-Backend. Kein separates CMS.

**Pages:**
- `/` — Hero, Event-Info, Highlights, Early-Bird-Teaser, Sponsor-Logos
- `/programm` — Tagesplan (Timeline + Filter nach Stage/Typ)
- `/speaker` — Speaker-Grid mit Detailseite
- `/sponsoren` — Sponsor-Logos nach Paket, mit Link
- `/tickets` — Kategorien + Payrexx-Checkout-Button (+ Voucher-Feld)
- `/faq` — Statische Seite (via Admin pflegbar)
- `/[slug]` — Zusätzliche statische Seiten (z.B. About, Location)

**SEO:** SSR via Nuxt 4, Schema.org Event-Markup, OG-Tags pro Seite

---

### Modul 12: Social Share Cards

**Auto-generiert nach Ticketkauf:**
- Bild (1200x630px für LinkedIn/OG, 1080x1080px für Instagram)
- Inhalt: "Ich bin dabei! D2C Summit [Jahr] · [Datum] · [Ort]"
- Mit Branding: Event-Logo, Primärfarbe
- Name des Attendees optional einblendbar
- Downloadbar in My Summit
- Beim Ticketkauf direkt angeboten ("Share on LinkedIn")

---

### Modul 13: Attendee Badge

**Generiert in My Summit:**
- Design pro Ticket-Kategorie (VIP-Badge sieht anders aus)
- Inhalt: Name, Firma, Funktion, Kategorie (Attendee / Speaker / Sponsor / VIP), QR-Code
- Formate: PDF (Druck, A6) + PNG (LinkedIn-optimiert)
- Badge kann auch vor Ort ausgedruckt werden (Admin-Funktion)

---

### Modul 14: Session-Feedback

**Nach dem Event (via E-Mail-Trigger):**
- Attendee bewertet besuchte Sessions (1–5 Sterne + Kommentar)
- Speaker sieht eigenes Feedback in Speaker-Portal
- Admin sieht alles aggregiert in Statistics

---

## 5. Datenbankschema

### Events & Venues
```sql
events
  id, name, slug, tagline, description, date_start, date_end,
  venue_id, status (draft|published|archived), branding (JSON),
  created_at, updated_at

venues
  id, name, address, city, postal_code, country, maps_url
```

### Programm
```sql
stages
  id, event_id, name, capacity, sort_order

sessions
  id, event_id, stage_id, title, slug, description, type
  (keynote|masterclass|panel|break|networking),
  start_time, end_time, capacity, is_bookable,
  status (draft|published|cancelled), created_at, updated_at

session_speaker (pivot)
  session_id, speaker_id

session_materials
  id, session_id, title, file_url, file_size, type
  (presentation|recording|resource), uploaded_by_user_id,
  is_public, created_at

session_feedback
  id, session_id, user_id, rating (1-5), comment, created_at
```

### Speaker
```sql
speakers
  id, event_id, user_id (nullable), first_name, last_name,
  title, company, bio, photo_url, linkedin_url, twitter_url,
  website_url, is_published, sort_order, created_at, updated_at
```

### Tickets & Orders
```sql
ticket_categories
  id, event_id, name, description, price, currency (CHF),
  capacity, sold_count, sale_start, sale_end, is_active,
  payrexx_gateway_id, sort_order, created_at, updated_at

orders
  id, event_id, user_id, invoice_number, subtotal, discount,
  total, currency, status (pending|paid|refunded|cancelled),
  payrexx_transaction_id, voucher_id (nullable), created_at

order_items
  id, order_id, ticket_category_id, quantity, unit_price

tickets
  id, order_id, event_id, ticket_category_id, user_id,
  first_name, last_name, company, job_title,
  qr_code (unique), status (pending|confirmed|cancelled|checked_in),
  checked_in_at, checked_in_by_user_id, created_at

vouchers
  id, event_id, code (unique), name, type (percentage|fixed|free),
  discount_value, ticket_category_id (nullable), max_uses,
  used_count, expires_at, is_active, created_at
```

### Session-Buchungen
```sql
session_bookings
  id, session_id, ticket_id, user_id,
  status (confirmed|cancelled), created_at

session_waitlist
  id, session_id, user_id, position, notified_at, created_at
```

### Users & Rollen
```sql
users
  id, first_name, last_name, email, password,
  email_verified_at, company, job_title, phone,
  avatar_url, linkedin_url, created_at, updated_at

roles
  id, name (super_admin|organizer|sponsor_manager|
             speaker|attendee|sponsor|checkin)

role_user
  user_id, role_id, event_id
```

### Sponsoren
```sql
sponsor_packages
  id, event_id, name, level (platinum|gold|silver|bronze|partner),
  price, benefits (JSON), max_sponsors, sort_order, is_active

sponsors
  id, event_id, sponsor_package_id, user_id (nullable),
  company_name, logo_url, website_url, description,
  contact_name, contact_email, status (pending|active|inactive),
  logo_impressions, link_clicks, created_at, updated_at

sponsor_materials
  id, event_id, title, description, file_url, file_type,
  is_active, sort_order, created_at
```

### Marketing
```sql
contacts
  id, first_name, last_name, email, company, job_title,
  source (imported|registered|ticket_purchase),
  event_id (nullable), is_subscribed, unsubscribed_at,
  tags (JSON), mailtrap_contact_id, created_at, updated_at

contact_lists
  id, event_id, name, description, contact_count,
  mailtrap_list_id, created_at

contact_list_contact (pivot)
  contact_list_id, contact_id

email_templates
  id, name, subject, from_name, from_email, content_html,
  category (transactional|marketing), variables (JSON),
  created_at, updated_at

campaigns
  id, event_id, name, subject, from_name, from_email,
  email_template_id, contact_list_id, status
  (draft|scheduled|sending|sent|cancelled),
  scheduled_at, sent_at, mailtrap_campaign_id, created_at

campaign_stats
  id, campaign_id, sent, delivered, opened, clicked,
  bounced, unsubscribed, updated_at

utm_links
  id, campaign_id, original_url, short_code (unique),
  utm_source, utm_medium, utm_campaign, utm_content,
  click_count, created_at

automation_sequences
  id, event_id, name, trigger_type
  (ticket_purchased|session_booked|waitlist_promoted|
   pre_event_7d|pre_event_1d|post_event_1d|feedback_request),
  is_active, created_at

automation_steps
  id, sequence_id, email_template_id, delay_hours,
  sort_order, created_at
```

### Badge & Zertifikat
```sql
badge_templates
  id, event_id, role (attendee|speaker|sponsor|vip|checkin),
  template_config (JSON), preview_url, created_at, updated_at
```

---

## 6. Laravel Projektstruktur

```
app/
├── Domain/
│   ├── Events/
│   │   ├── Models/         Event.php, Venue.php, Stage.php
│   │   └── Services/       EventService.php
│   ├── Program/
│   │   ├── Models/         Session.php, Speaker.php, SessionMaterial.php
│   │   │                   SessionBooking.php, SessionWaitlist.php
│   │   └── Services/       ProgramService.php, BookingService.php
│   ├── Tickets/
│   │   ├── Models/         TicketCategory.php, Order.php, Ticket.php
│   │   │                   Voucher.php, OrderItem.php
│   │   └── Services/       TicketService.php, CheckoutService.php
│   │                       VoucherService.php, QrCodeService.php
│   ├── Users/
│   │   ├── Models/         User.php, Role.php
│   │   └── Services/       AuthService.php, RoleService.php
│   ├── Sponsors/
│   │   ├── Models/         Sponsor.php, SponsorPackage.php
│   │   │                   SponsorMaterial.php
│   │   └── Services/       SponsorService.php
│   ├── Marketing/
│   │   ├── Models/         Contact.php, ContactList.php, Campaign.php
│   │   │                   EmailTemplate.php, UtmLink.php
│   │   │                   AutomationSequence.php
│   │   └── Services/       CampaignService.php, ContactService.php
│   │                       AutomationService.php
│   └── Statistics/
│       └── Services/       StatisticsService.php
├── Http/
│   ├── Controllers/
│   │   └── Api/V1/
│   │       ├── Public/     EventController, ProgramController
│   │       │               SpeakerController, SponsorController
│   │       ├── Auth/       AuthController, PasswordController
│   │       ├── Member/     MyTicketController, MyScheduleController
│   │       │               BadgeController, CertificateController
│   │       │               MaterialController, FeedbackController
│   │       ├── Admin/      (alle Admin-Controller)
│   │       ├── Sponsor/    SponsorProfileController
│   │       ├── Speaker/    SpeakerProfileController
│   │       └── Checkin/    CheckinController
│   ├── Middleware/         RoleMiddleware, EventMiddleware
│   ├── Requests/           (Form Requests pro Modul)
│   └── Resources/          (API Resources/Transformers)
├── Integrations/
│   ├── Payrexx/            PayrexxClient.php, PayrexxWebhook.php
│   ├── Mailtrap/           MailtrapClient.php, MailtrapMarketing.php
│   └── Storage/            FileUploadService.php
└── Jobs/
    ├── SendTransactionalEmail.php
    ├── ProcessPayrexxWebhook.php
    ├── NotifyWaitlistPromotion.php
    └── GenerateTicketPdf.php

database/
├── migrations/
└── seeders/

routes/
├── api.php
└── web.php (Webhook-Endpoints)
```

---

## 7. Nuxt 4 Projektstruktur

```
pages/
├── index.vue                    Public: Home
├── programm.vue                 Public: Tagesplan
├── speaker/
│   ├── index.vue                Public: Speaker-Übersicht
│   └── [slug].vue               Public: Speaker-Detail
├── sponsoren.vue                Public: Sponsoren
├── tickets.vue                  Public: Ticket-Kauf
├── faq.vue                      Public: FAQ
├── my-summit/
│   ├── index.vue                Dashboard
│   ├── ticket.vue               Mein Ticket + QR
│   ├── programm.vue             Programm + Session-Buchung
│   ├── badge.vue                Badge Generator
│   ├── zertifikat.vue           Certificate of Attendance
│   ├── materialien.vue          Präsentationen + Ressourcen
│   └── profil.vue               Profil bearbeiten
├── admin/
│   ├── dashboard.vue
│   ├── events/                  Event CRUD
│   ├── programm/                Sessions, Speaker, Stages
│   ├── tickets/                 Kategorien, Orders, Vouchers
│   ├── sponsoren/               Pakete, Sponsor-Verwaltung
│   ├── marketing/               Kampagnen, Templates, Kontakte
│   ├── statistiken/             Dashboard
│   └── einstellungen/
├── sponsor/
│   ├── dashboard.vue
│   ├── profil.vue
│   └── materialien.vue
├── speaker/
│   ├── dashboard.vue            (separater Speaker-Bereich)
│   ├── profil.vue
│   └── sessions.vue
└── checkin/
    └── scan.vue

components/
├── public/                      Hero, ProgramTimeline, SpeakerCard, etc.
├── my-summit/                   TicketCard, SessionList, BadgePreview, etc.
├── admin/                       DataTable, StatCard, CampaignEditor, etc.
└── shared/                      Button, Modal, Form, Alert, etc.

composables/
├── useAuth.ts
├── useEvent.ts
├── useProgram.ts
└── useToast.ts

stores/
├── auth.ts
├── event.ts
├── cart.ts
└── program.ts

services/api/
├── events.ts
├── program.ts
├── tickets.ts
├── sponsors.ts
├── marketing.ts
└── admin.ts
```

---

## 8. API-Endpunkte (Auswahl)

### Public (kein Auth)
```
GET  /api/v1/events/{slug}
GET  /api/v1/events/{slug}/program
GET  /api/v1/events/{slug}/speakers
GET  /api/v1/events/{slug}/sponsors
GET  /api/v1/events/{slug}/ticket-categories
POST /api/v1/vouchers/validate          { code, event_id }
```

### Auth
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

### Checkout
```
POST /api/v1/checkout/initiate          { category_id, attendee_data, voucher_code? }
POST /api/v1/webhooks/payrexx           Payrexx Webhook
```

### My Summit (Auth: attendee)
```
GET  /api/v1/my/tickets
GET  /api/v1/my/tickets/{id}
GET  /api/v1/my/tickets/{id}/qr
GET  /api/v1/my/tickets/{id}/pdf
GET  /api/v1/my/tickets/{id}/badge      ?format=pdf|png
GET  /api/v1/my/certificate/{event_id}
GET  /api/v1/my/schedule
POST /api/v1/my/sessions/{id}/book
DEL  /api/v1/my/sessions/{id}/cancel
POST /api/v1/my/sessions/{id}/waitlist
GET  /api/v1/my/sessions/{id}/materials
POST /api/v1/my/sessions/{id}/feedback  { rating, comment }
GET  /api/v1/my/social-card             ?format=og|square
```

### Admin (Auth: organizer/super_admin)
```
# Events
GET|POST        /api/v1/admin/events
GET|PUT|DEL     /api/v1/admin/events/{id}
POST            /api/v1/admin/events/{id}/clone

# Program
GET|POST        /api/v1/admin/events/{id}/sessions
GET|PUT|DEL     /api/v1/admin/sessions/{id}
POST            /api/v1/admin/sessions/{id}/materials

# Tickets
GET|POST        /api/v1/admin/events/{id}/ticket-categories
GET             /api/v1/admin/events/{id}/orders
GET             /api/v1/admin/events/{id}/tickets
GET|POST        /api/v1/admin/events/{id}/vouchers

# Marketing
GET|POST        /api/v1/admin/contacts
POST            /api/v1/admin/contacts/import
GET|POST        /api/v1/admin/contact-lists
GET|POST        /api/v1/admin/campaigns
POST            /api/v1/admin/campaigns/{id}/send
POST            /api/v1/admin/campaigns/{id}/schedule
GET             /api/v1/admin/campaigns/{id}/stats

# Statistics
GET             /api/v1/admin/events/{id}/statistics
GET             /api/v1/admin/events/{id}/statistics/tickets
GET             /api/v1/admin/events/{id}/statistics/sessions
GET             /api/v1/admin/events/{id}/statistics/marketing
```

### Check-in (Auth: checkin)
```
POST /api/v1/checkin/scan    { qr_code }
GET  /api/v1/checkin/stats   Live-Zahlen für Einlass-Team
```

---

## 9. Mailtrap-Integration

### Transaktionsmails (Mailtrap SMTP/API)
Alle automatischen System-E-Mails laufen über Mailtrap Sending API:
- Ticket-Bestätigung (mit PDF-Anhang)
- Session-Buchungsbestätigung
- Wartelisten-Benachrichtigung
- Passwort-Reset

Laravel Mail-Config:
```env
MAIL_MAILER=mailtrap
MAILTRAP_API_TOKEN=xxx
MAILTRAP_INBOX_ID=xxx   # für Testing-Umgebung
```

### Marketing (Mailtrap Email Marketing API)
Kampagnen werden über Mailtrap Marketing API abgewickelt:
```
POST /api/send          → Kampagne versenden
GET  /api/campaigns     → Statistiken abholen
POST /api/contacts      → Kontakte synchronisieren
```

CampaignService ruft Mailtrap API auf, speichert `mailtrap_campaign_id`, holt Stats periodisch zurück (Laravel Scheduler).

---

## 10. Payrexx-Integration

### Checkout-Flow
1. User wählt Ticket-Kategorie + gibt Daten ein
2. `CheckoutService::initiate()` → erstellt Payrexx Gateway via API
3. User wird zu Payrexx Whitelabel-Checkout weitergeleitet
4. Payrexx sendet Webhook bei Zahlung
5. `PayrexxWebhook::handle()` → Order auf `paid`, Ticket generieren, E-Mail auslösen

### Voucher-Direktlink
```
d2c-summit.ch/tickets?voucher=SUMMER2026
→ Nuxt lädt Seite, validiert Voucher via API
→ Preis wird angepasst, Code vorbefüllt
→ Normaler Checkout-Flow
```

---

## 11. Implementierungsplan (Phase I)

### Woche 1–2: Foundation
- [ ] Laravel-Projekt aufsetzen (Auth, Sanctum, Roles, Event-Modell)
- [ ] MySQL-Schema: alle Migrations anlegen
- [ ] Nuxt 4 Projekt aufsetzen (Tailwind, Pinia, API-Layer, Auth-Store)
- [ ] Base-Layouts: Public, My Summit, Admin
- [ ] GitHub Repo + CI/CD Pipeline

### Woche 3–4: Event Engine + Programm
- [ ] Event CRUD (Admin)
- [ ] Stages + Sessions CRUD (Admin)
- [ ] Speaker CRUD (Admin + Speaker-Portal)
- [ ] Public Website: Home, Programm-Seite, Speaker-Seite (SSR)

### Woche 5–6: Ticket-System
- [ ] Ticket-Kategorien CRUD (Admin)
- [ ] Voucher-System (CRUD + Validierung + Direktlink)
- [ ] Payrexx-Integration (Gateway, Webhook, Order-Flow)
- [ ] Ticket-PDF Generierung
- [ ] Transaktions-E-Mails via Mailtrap (Bestätigung, Ticket)

### Woche 7–8: My Summit
- [ ] Registrierung + Login
- [ ] Ticket-Ansicht + QR + PDF-Download
- [ ] Session-Buchung + Warteliste
- [ ] Materialien-Bereich
- [ ] Badge-Generator (PDF + PNG)
- [ ] Social Share Card Generator

### Woche 9–10: Sponsor-Portal
- [ ] Sponsor-Pakete CRUD (Admin)
- [ ] Sponsor Self-Service (Profil, Logo-Upload)
- [ ] Sponsor-Materialien (Admin hinterlegt, Sponsor downloadet)
- [ ] Public Website: Sponsoren-Seite

### Woche 11–12: Marketing Engine
- [ ] Kontakt-Import (CSV)
- [ ] Kontaktlisten + Segmentierung
- [ ] E-Mail Template-Editor (Admin)
- [ ] Kampagnen-Erstellung + Mailtrap API Versand
- [ ] Automatisierte Sequenzen (Trigger-System)
- [ ] UTM-Link Generator

### Woche 13: Statistics
- [ ] Admin Statistics Dashboard
- [ ] Ticket-Verkaufs-Charts (real-time)
- [ ] Session-Auslastung
- [ ] Marketing-Stats (Kampagnen-Rückholung von Mailtrap)
- [ ] Check-in Stats

### Woche 14: Finalisierung
- [ ] Certificate of Attendance (PDF)
- [ ] Session-Feedback System
- [ ] Check-in Web-App (QR-Scanner)
- [ ] Badge-Vorlagen im Admin konfigurierbar machen

### Woche 15–16: QA + Deploy
- [ ] Pest Feature-Tests für alle kritischen Flows
- [ ] Vitest für Nuxt Services + Composables
- [ ] Security-Review (Auth, Validation, API-Schutz)
- [ ] Performance-Optimierung (DB-Indizes, Caching)
- [ ] Staging-Deployment + Abnahme
- [ ] Produktion

---

## 12. Offene Fragen

| # | Frage | Bereich |
|---|-------|---------|
| 1 | Payrexx: Welcher Account / Whitelabel-Subdomain? | Ticketing |
| 2 | Domain-Struktur: d2c-summit.ch + Subdomains bestätigen? | Hosting |
| 3 | Hosting: Forge + DigitalOcean / Hetzner / Vapor? | Infra |
| 4 | CI: Bestehendes GitHub-Org bei Go 2 Flow? | Dev |
| 5 | Branding: Primärfarbe, Logo, Fonts für den Summit? | Design |
| 6 | Badge-Design: Wer liefert die Design-Vorlage? | Design |
| 7 | Kontakt-Export aus Event 2025: welches Format? | Marketing |
| 8 | Mailtrap: Welcher Plan (API-Limits)? | Marketing |
| 9 | Multi-language: DE only oder DE/EN? | Content |
| 10 | Wer pflegt FAQ + statische Seiten? Braucht es eine einfache Page-Builder-Seite? | Admin |

---

## 13. Implementierungs-Prompt (für neue Session)

```
Du bist Senior Full-Stack Engineer bei Go 2 Flow.

Wir bauen die D2C Summit Platform — eine vollständige Event Management Platform
für den jährlich stattfindenden D2C Summit.

TECH STACK (Go 2 Flow Standard, keine Abweichungen):
- Backend: Laravel (LTS) + MySQL
- Frontend: Nuxt 4 / Vue 3
- Styling: Tailwind CSS (ausschließlich, kein SCSS/CSS)
- Auth: Laravel Sanctum
- Email: Mailtrap API (transaktional + marketing)
- Payment: Payrexx Whitelabel
- Storage: Laravel Storage (S3-kompatibel)
- Tests: Pest (Laravel), Vitest (Nuxt)

ARCHITEKTUR:
Single Source of Truth im Laravel Backend. Alle Frontends (Public Website,
My Summit, Admin, Sponsor-Portal, Speaker-Portal, Check-in) ziehen aus
derselben MySQL-Datenbank via REST API.

DOMAIN-STRUKTUR:
- d2c-summit.ch → Public Website
- my.d2c-summit.ch → My Summit + alle Portale
- admin.d2c-summit.ch → Admin Backend
- checkin.d2c-summit.ch → Check-in App

VOLLSTÄNDIGES DB-SCHEMA und DATEISTRUKTUR: siehe d2c-summit-blueprint.md

AKTUELLER STAND: Wir starten bei Woche [X]: [Task-Beschreibung]

Starte mit: [konkreter erster Task]
```

---

*Blueprint erstellt: März 2026 | Go 2 Flow × Daniel Hofmann*
