# Inner Circle Club — MVP Blueprint

**Auftraggeber:** Fortuneglobe GmbH
**Umsetzer:** go2flow AG (Daniel Hofmann + Olivier Gachnang)
**Budget:** EUR 10.000 netto | **Timeline:** 4 Wochen
**Repo:** https://github.com/Go2Flow/inner-circle
**Tech-Stack:** PHP 8.0, IceHawk Framework, CQRS, Twig, React/Redux, MySQL, Redis
**Namespace:** `Fortuneglobe\Shops\PierreCardin\`

---

## 1. Architektur-Übersicht

Der Inner Circle ergänzt den bestehenden Pierre-Cardin-Shop um eine neue **Schicht** — er verändert nichts an Checkout, ERP-Export oder Payments. Alle neuen Komponenten leben im eigenen Modul `InnerCircle` und greifen über definierte Schnittstellen in die bestehende Infrastruktur ein.

```
┌─────────────────────────────────────────────────────┐
│              INNER CIRCLE CLUB (NEU)                │
│  Gated Entry · Invitation · Members · Club Prices   │
└────────────────────┬────────────────────────────────┘
                     │ nutzt bestehende Infrastruktur
┌────────────────────▼────────────────────────────────┐
│           FORTUNEGLOBE SHOP (BESTEHEND)             │
│  Produkte · Warenkorb · Checkout · Payments · ERP   │
└─────────────────────────────────────────────────────┘
```

**Integrationspunkte:**
- `IceHawkDelegate.php` → Route Guard einbauen
- `Dependencies.php` → neue Services registrieren
- `config/ReadRoutes.php` + `WriteRoutes.php` → neue Routen
- Twig-Templates (Produktliste, Produktdetail, Cart) → Club-Preisanzeige

---

## 2. Datenbankmodell (neue Tabellen)

### `inner_circle_companies`
Partnerunternehmen / Gruppen mit eigener Rabattstufe.

```sql
CREATE TABLE `inner_circle_companies` (
  `id`           int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `companyId`    char(36)         NOT NULL COMMENT 'UUID',
  `name`         varchar(255)     NOT NULL COMMENT 'Firmenname',
  `discountRate` decimal(4,2)     NOT NULL DEFAULT 20.00 COMMENT 'Rabatt in % (z.B. 30.00)',
  `status`       varchar(50)      NOT NULL DEFAULT 'active' COMMENT 'active|inactive',
  `createdAt`    datetime         NOT NULL,
  `updatedAt`    datetime         NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_companyId` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Inner Circle Partnerunternehmen';
```

### `inner_circle_members`
Verknüpft bestehenden Account mit Club-Mitgliedschaft.

```sql
CREATE TABLE `inner_circle_members` (
  `id`          int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `memberId`    char(36)         NOT NULL COMMENT 'UUID',
  `accountId`   char(36)         NOT NULL COMMENT 'FK → accounts.accountId',
  `companyId`   char(36)     DEFAULT NULL COMMENT 'FK → inner_circle_companies.companyId',
  `status`      varchar(50)      NOT NULL DEFAULT 'active' COMMENT 'active|suspended',
  `joinedAt`    datetime         NOT NULL,
  `createdAt`   datetime         NOT NULL,
  `updatedAt`   datetime         NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_memberId` (`memberId`),
  UNIQUE KEY `uq_accountId` (`accountId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Inner Circle Mitglieder';
```

### `inner_circle_invitations`
Token-basiertes Einladungssystem.

```sql
CREATE TABLE `inner_circle_invitations` (
  `id`          int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `invitationId` char(36)        NOT NULL COMMENT 'UUID',
  `token`       varchar(64)      NOT NULL COMMENT 'Sicherer Einladungs-Token (SHA256)',
  `email`       varchar(255)     NOT NULL COMMENT 'E-Mail des Eingeladenen',
  `companyId`   char(36)     DEFAULT NULL COMMENT 'Vorausgefüllte Firma',
  `invitedBy`   char(36)         NOT NULL COMMENT 'FK → admins.adminId',
  `status`      varchar(50)      NOT NULL DEFAULT 'pending' COMMENT 'pending|accepted|expired',
  `expiresAt`   datetime         NOT NULL COMMENT 'Token-Ablauf (7 Tage)',
  `acceptedAt`  datetime     DEFAULT NULL,
  `createdAt`   datetime         NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_token` (`token`),
  UNIQUE KEY `uq_invitationId` (`invitationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Inner Circle Einladungen';
```

---

## 3. Neue Dateien — Verzeichnisstruktur

```
src/Application/Web/InnerCircle/
├── Auth/
│   ├── Read/
│   │   └── ShowClubLoginRequestHandler.php          # Splash + Login-Page
│   ├── Write/
│   │   ├── DoLoginRequestHandler.php                # Login-Verarbeitung
│   │   └── DoLogoutRequestHandler.php               # Logout
│   └── Validators/
│       └── LoginFormValidator.php
│
├── Invitation/
│   ├── Read/
│   │   └── ShowInvitationRegistrationRequestHandler.php  # /invite/{token}
│   ├── Write/
│   │   └── AcceptInvitationRequestHandler.php            # Passwort setzen
│   └── Emails/
│       └── InvitationEmail.php                           # E-Mail mit Token-Link
│
├── Members/
│   ├── Read/
│   │   └── ShowMemberManagementRequestHandler.php    # Admin: Mitgliederliste
│   └── Write/
│       ├── SendInvitationRequestHandler.php          # Admin: Einladung senden
│       ├── UpdateMemberStatusRequestHandler.php      # Admin: Status ändern
│       └── UpdateMemberCompanyRequestHandler.php     # Admin: Firma zuweisen
│
└── Prices/
    └── ClubPriceModifier.php                        # Club-Preis-Berechnungsservice

src/Infrastructure/InnerCircle/
├── ClubAuthMiddleware.php                           # Route Guard
├── Repositories/
│   ├── MemberRepository.php
│   ├── CompanyRepository.php
│   └── InvitationRepository.php
└── Services/
    ├── InvitationService.php                        # Token-Generierung & Versand
    └── ClubMembershipService.php                    # Mitgliedschaft prüfen

locales/de_de/InnerCircle.php                       # Übersetzungen
locales/en_de/InnerCircle.php

templates/inner-circle/
├── login.twig                                       # Splash + Login
├── invite-registration.twig                         # Passwort setzen
├── admin/
│   ├── members.twig                                 # Mitgliederverwaltung
│   └── invite-form.twig                             # Einladungsformular

env/db/scripts/
└── {timestamp}_createsInnerCircleTables.sql
```

---

## 4. Bestehende Dateien — Änderungen

| Datei | Änderung |
|-------|----------|
| `src/IceHawkDelegate.php` | `ClubAuthMiddleware` einbinden — prüft bei jeder Request ob Member eingeloggt |
| `src/Dependencies.php` | `MemberRepository`, `CompanyRepository`, `InvitationRepository`, `InvitationService`, `ClubMembershipService`, `ClubPriceModifier` registrieren |
| `config/ReadRoutes.php` | Neue Club-Routen hinzufügen |
| `config/WriteRoutes.php` | Neue Club-Write-Routen hinzufügen |
| Twig-Templates (Produktliste, Produktdetail, Cart, Checkout) | Club-Preis-Block: `<s>{{ product.originalPrice }}</s> {{ product.clubPrice }}` |

---

## 5. Neue Routen

### Read Routes
```php
// Inner Circle Auth
'/inner-circle/login/?$'                              => ShowClubLoginRequestHandler::class,

// Inner Circle Invitation
'/inner-circle/invite/(?<token>[a-zA-Z0-9]+)/?$'     => ShowInvitationRegistrationRequestHandler::class,

// Inner Circle Admin (nur für eingeloggte Admins)
'/inner-circle/admin/members/?$'                     => ShowMemberManagementRequestHandler::class,
```

### Write Routes
```php
// Inner Circle Auth
'/inner-circle/login/?$'                             => DoLoginRequestHandler::class,
'/inner-circle/logout/?$'                            => DoLogoutRequestHandler::class,

// Inner Circle Invitation
'/inner-circle/invite/(?<token>[a-zA-Z0-9]+)/?$'    => AcceptInvitationRequestHandler::class,

// Inner Circle Admin
'/inner-circle/admin/invite/?$'                      => SendInvitationRequestHandler::class,
'/inner-circle/admin/members/status/?$'              => UpdateMemberStatusRequestHandler::class,
'/inner-circle/admin/members/company/?$'             => UpdateMemberCompanyRequestHandler::class,
```

---

## 6. ClubAuthMiddleware — Kernlogik

```php
// Pseudocode — Implementierung in IceHawkDelegate::handleRequest()
function handleRequest(Request $request): void {
    $publicRoutes = [
        '/inner-circle/login',
        '/inner-circle/invite/',
        '/error/',
    ];

    if (!isPublicRoute($request->getUri(), $publicRoutes)) {
        if (!$this->clubMembershipService->isLoggedInMember($session)) {
            redirect('/inner-circle/login');
            return;
        }

        if ($this->clubMembershipService->getMemberStatus($session) === 'suspended') {
            redirect('/inner-circle/login?error=suspended');
            return;
        }
    }

    // Request normal verarbeiten
}
```

---

## 7. ClubPriceModifier — Kernlogik

```php
class ClubPriceModifier {
    public function getClubPrice(Money $originalPrice, string $companyId): Money {
        $discountRate = $this->companyRepository->getDiscountRate($companyId);
        $multiplier   = 1 - ($discountRate / 100); // z.B. 0.70 bei 30%
        return $originalPrice->multiply($multiplier);
    }

    public function getDisplayData(Money $originalPrice, string $companyId): array {
        return [
            'originalPrice' => $originalPrice,
            'clubPrice'     => $this->getClubPrice($originalPrice, $companyId),
            'discountRate'  => $this->companyRepository->getDiscountRate($companyId),
        ];
    }
}
```

Der `ClubPriceModifier` wird in alle Request Handler injiziert, die Preise anzeigen:
- `ShowProductRequestHandler`
- `ShowGalleryRequestHandler`
- `ShowFullCartRequestHandler`
- `ShowMultiStepCheckoutConfirmRequestHandler`

---

## 8. Invitation Flow — Sequenz

```
Admin                    System                  Eingeladener
  │                         │                         │
  │── POST /admin/invite ──►│                         │
  │   {email, companyId}    │                         │
  │                         │── Token generieren      │
  │                         │   (SHA256, 64 Zeichen)  │
  │                         │── DB: invitation INSERT  │
  │                         │── E-Mail senden ────────►│
  │◄── 200 OK ──────────────│   {token-link, 7 Tage}  │
  │                         │                         │
  │                         │     ◄── GET /invite/{token}
  │                         │── Token validieren      │
  │                         │   (exists + not expired │
  │                         │    + status=pending)    │
  │                         │──────────────────────── ►│
  │                         │   Registrierungsformular │
  │                         │                         │
  │                         │     ◄── POST /invite/{token}
  │                         │   {password, firstname, │
  │                         │    lastname, salutation} │
  │                         │── Account anlegen       │
  │                         │── Member anlegen        │
  │                         │── Invitation: accepted  │
  │                         │── Auto-Login + Redirect │
  │                         │──────────────────────── ►│
  │                         │   /de_de/ (Club-Home)   │
```

---

## 9. Session-Konzept für Club-Login

Der Club nutzt das **bestehende Session-System** von IceHawk. Beim Login wird die Session um Club-spezifische Daten erweitert:

```php
// Wird in die Session geschrieben nach erfolgreichem Club-Login:
$session->set('inner_circle_member_id', $memberId);
$session->set('inner_circle_account_id', $accountId);
$session->set('inner_circle_company_id', $companyId);
$session->set('inner_circle_discount_rate', $discountRate);
```

Der `ClubMembershipService` liest diese Werte und stellt sie der gesamten Applikation zur Verfügung.

---

## 10. Admin-Interface

Das Admin-Panel für die Mitgliederverwaltung wird in das **bestehende Marketing-Tool** (`/marketing-tool/`) integriert — React/Redux, gleiche Patterns wie Coupon-Verwaltung.

**Neue Admin-Screens:**
1. **Member-Liste** — Tabelle mit Name, E-Mail, Firma, Status, Eingeladener-von, Datum. Filter nach Firma/Status. Aktionen: Status ändern, Firma ändern.
2. **Einladung senden** — Formular: E-Mail, Firma zuweisen (Dropdown), optional Vorname/Nachname. Bestätigung mit Token-Link-Preview.
3. **Firmen-Verwaltung** (optional Phase 2) — Firmen anlegen, Rabattstufe anpassen.

---

## 11. 4-Wochen-Plan (detailliert)

### Woche 1 — Setup & Konzeption
- [ ] Dev-Umgebung aufsetzen, Docker lokal lauffähig
- [ ] Fortuneglobe: Feed-Zugänge + Staging-Umgebung klären
- [ ] DB-Migration schreiben (`inner_circle_companies`, `inner_circle_members`, `inner_circle_invitations`)
- [ ] Fixtures: 1 Test-Company, 1 Test-Admin
- [ ] `ClubMembershipService` Interface definieren
- [ ] Branching-Strategie: `feature/inner-circle-*` → `develop` → `main`

### Woche 2 — Backend: Auth, Invitation, Members
- [ ] `ClubAuthMiddleware` implementieren + in `IceHawkDelegate` einbauen
- [ ] `ShowClubLoginRequestHandler` + `DoLoginRequestHandler` + `DoLogoutRequestHandler`
- [ ] `InvitationRepository` + `MemberRepository` + `CompanyRepository`
- [ ] `InvitationService`: Token-Generierung, E-Mail-Versand
- [ ] `AcceptInvitationRequestHandler`: Token validieren, Account + Member anlegen
- [ ] Admin-Write-Handler: `SendInvitationRequestHandler`, `UpdateMemberStatusRequestHandler`
- [ ] Unit Tests für Invitation-Flow und Auth-Middleware

### Woche 3 — Frontend: Club-Oberfläche & Preislogik
- [ ] `ClubPriceModifier` implementieren
- [ ] Twig-Templates: `login.twig`, `invite-registration.twig`
- [ ] Club-Preisanzeige in Produktliste, Produktdetail, Cart (Twig-Partials anpassen)
- [ ] React-Admin: Member-Liste + Einladungsformular (analog Coupon-Verwaltung)
- [ ] Club-Splash-Seite: Branding, "Nur für Mitglieder"-Claim

### Woche 4 — Checkout, Tests & Übergabe
- [ ] Club-Preise im Checkout durchziehen (Warenkorb-Summe, Bestätigungsseite)
- [ ] E2E-Tests: Invitation → Registrierung → Login → Warenkorb → Checkout
- [ ] Bugfixes + Edge Cases (abgelaufener Token, gesperrtes Mitglied, etc.)
- [ ] Dokumentation: Neues DB-Schema, neue Routen, Admin-Anleitung
- [ ] Deployment-Vorbereitung: Staging-Übergabe an Fortuneglobe

---

## 12. Offene Fragen (vor Projektstart klären)

| # | Frage | Wer | Prio |
|---|-------|-----|------|
| 1 | Gibt es bereits Zugänge zur Dev/Staging-Umgebung von Fortuneglobe? | Fortuneglobe | 🔴 |
| 2 | Sollen neue Tabellen in dieselbe DB (`pierrecardin_shop`) oder separate DB? | Fortuneglobe | 🔴 |
| 3 | Wird das Admin-Interface in `/marketing-tool` integriert oder als separates Panel? | go2flow + Fortuneglobe | 🟡 |
| 4 | Gibt es ein CI/Design für den Inner Circle Club (Logo, Farben, Claim)? | Fortuneglobe | 🟡 |
| 5 | Welche Sprache primär: `de_de` only oder auch `en_de`? | Fortuneglobe | 🟡 |
| 6 | Rabattstufen: Fix pro Firma oder auch pro Mitglied konfigurierbar? | Fortuneglobe | 🟢 |

---

## 13. Implementierungs-Prompt

Folgender Prompt dient als Basis für die KI-gestützte Umsetzung:

---

```
Du arbeitest an einem PHP-Projekt: dem Inner Circle Club, einer geschlossenen
Mitglieder-Plattform auf Basis eines bestehenden E-Commerce-Shops.

TECHNISCHER KONTEXT:
- Framework: IceHawk (PHP Micro-Framework mit CQRS-Pattern)
- Namespace: Fortuneglobe\Shops\PierreCardin\
- PHP-Version: 8.0
- Template-Engine: Twig 3.x
- Frontend: React 16.8 + Redux (nur Admin-Interface)
- Datenbank: MySQL (UTF8MB4)
- Session: Session-basierte Authentifizierung (bestehend)
- Routing: ReadRoutes.php (GET) und WriteRoutes.php (POST) in /config/
- Dependency Injection: Dependencies.php in /src/
- Bestehende Auth: fortuneglobe/authentication-service

BESTEHENDE STRUKTUR (nicht ändern):
- src/Application/Web/Account/ → bestehender Account-Bereich
- src/Application/Web/Checkout/ → bestehender Checkout
- src/Application/Web/Shoppingcart/ → bestehende Warenkorb-Logik
- config/Paypal.php, Saferpay.php, AmazonPay.php, KlarnaPayment.php → Payments

WAS DU BAUST (Inner Circle Club Layer):
Baue ausschliesslich im Kontext des Inner Circle Clubs — verändere keine
bestehende Business-Logik. Neue Komponenten leben in:
- src/Application/Web/InnerCircle/ (Handler, Validators, Emails)
- src/Infrastructure/InnerCircle/ (Repositories, Services, Middleware)

FEATURE 1 — GATED ENTRY:
Implementiere ClubAuthMiddleware in src/Infrastructure/InnerCircle/ClubAuthMiddleware.php.
Binde sie in src/IceHawkDelegate.php ein (handleRequest-Methode).
Alle Routen ausser ['/inner-circle/login', '/inner-circle/invite/', '/error/']
erfordern einen eingeloggten Inner Circle Member in der Session.
Session-Keys: inner_circle_member_id, inner_circle_account_id, inner_circle_company_id, inner_circle_discount_rate.
Nicht eingeloggte User werden zu /de_de/inner-circle/login redirected.

FEATURE 2 — INVITATION SYSTEM:
Token: SHA256, 64 Zeichen, einmalig verwendbar, 7 Tage gültig.
Tabellen: inner_circle_invitations (siehe Blueprint-Schema).
InvitationService: generateToken(), sendInvitationEmail(), validateToken().
AcceptInvitationRequestHandler: Token prüfen → Account anlegen (bestehende
accounts-Tabelle) → Member anlegen (inner_circle_members) → Auto-Login →
Redirect auf Club-Home.

FEATURE 3 — CLUB-PREISLOGIK:
ClubPriceModifier liest discount_rate aus inner_circle_companies.
Methode: getDisplayData(Money $originalPrice, string $companyId): array
Injiziere in: ShowProductRequestHandler, ShowGalleryRequestHandler,
ShowFullCartRequestHandler, ShowMultiStepCheckoutConfirmRequestHandler.
Twig: {{ priceData.originalPrice }} durchgestrichen, {{ priceData.clubPrice }} prominent.
Discount-Rate kommt aus Session (inner_circle_discount_rate) — kein DB-Call pro Request.

FEATURE 4 — MITGLIEDERVERWALTUNG (Admin):
Handler in src/Application/Web/InnerCircle/Members/
React-Admin-Interface analog zu bestehender Coupon-Verwaltung in
src/AppBuilder/scripts/src/pwa-common/
Screens: Member-Liste (filter by company/status) + Einladungsformular.
Admin-Auth: bestehende Admin-Session (/marketing-api/admin/state/).

FEATURE 5 — CLUB LOGIN PAGE:
Twig-Template: templates/inner-circle/login.twig
Splash-Seite: "Exklusiv. Nur für Mitglieder." + Login-Formular (E-Mail + Passwort)
+ Passwort-Vergessen-Link (nutzt bestehenden Account-Reset-Flow).

CODING-KONVENTIONEN (aus bestehender Codebase):
- Alle Handler implementieren ReadRequestHandlerInterface oder WriteRequestHandlerInterface
- Read-Handler: responds() gibt ResponseInterface zurück
- Write-Handler: handle() gibt RedirectResponse zurück
- Repositories: reine DB-Zugriffe, kein Business-Logic
- Services: Business-Logic, orchestrieren Repositories
- Validators: eigene Klassen, geben ValidationResult zurück
- PHPUnit-Tests für alle Services und Validators

DATENBANK:
Alle neuen Tabellen als Liquibase-Migration in env/db/scripts/{timestamp}_{name}.sql
Nutze UUID() für alle *Id-Felder (CHAR 36).

STARTE MIT:
1. DB-Migration: inner_circle_companies, inner_circle_members, inner_circle_invitations
2. ClubAuthMiddleware + IceHawkDelegate Integration
3. ShowClubLoginRequestHandler + DoLoginRequestHandler
4. InvitationService + AcceptInvitationRequestHandler
```

---

*Blueprint erstellt: 2026-03-24 | go2flow AG*
