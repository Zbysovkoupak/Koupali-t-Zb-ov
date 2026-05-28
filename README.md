# 🏊 Koupaliště — Systém správy směn

Webová aplikace pro plánování směn, evidenci dostupnosti a výpočet podkladů pro výplaty zaměstnanců koupaliště.

---

## Rychlé spuštění (5 kroků)

### Krok 1: Supabase — spuštění databáze

1. Přejdi do **Supabase Dashboardu** → SQL Editor
2. Klikni **New query**
3. Zkopíruj celý obsah souboru `supabase-setup.sql` a vlož ho do editoru
4. Klikni **Run** (nebo Ctrl+Enter)
5. Měl bys vidět "Success" — tabulky jsou vytvořeny

### Krok 2: Vytvoření admin účtu

1. V Supabase → **Authentication → Users → Invite user**
2. Zadej e-mail admina (např. `vedouci@koupalistni.cz`)
3. Supabase pošle pozvánku na e-mail — admin si nastaví heslo
4. Po potvrzení zkopíruj UUID admina (klikni na uživatele → vidíš UUID)
5. V SQL Editoru spusť:

```sql
INSERT INTO admins (auth_user_id, name)
VALUES ('VLOZ-UUID-ADMINA', 'Vedoucí koupaliště');
```

### Krok 3: Nasazení aplikace na GitHub Pages

1. Vytvoř nový repository na GitHub (např. `koupalistni-system`)
2. Nahraj všechny soubory z této složky
3. GitHub → Repository Settings → Pages → Source: **Deploy from branch** → main → **/ (root)**
4. Za ~1 minutu bude web dostupný na `https://TVOJE-JMENO.github.io/koupalistni-system`

### Krok 4: Přidání zaměstnanců

V Supabase → Authentication → Users → Invite user  
Pro každého zaměstnance:
- Pozvání na e-mail (zaměstnanec si nastaví heslo)
- Po potvrzení: v SQL Editoru spusť:

```sql
INSERT INTO employees (auth_user_id, name, role, birth_date, is_minor, pin, email, is_active)
VALUES (
  'UUID-ZAMESTNANCE',   -- UUID z Auth → Users
  'Jan Novák',           -- jméno
  'lifeguard',           -- 'lifeguard' nebo 'cashier'
  '2000-03-15',          -- datum narození (nebo NULL)
  false,                 -- true pokud mladistvý (pod 18 let)
  '1234',                -- 4místný PIN (pro informaci)
  'jan.novak@email.cz',  -- e-mail
  true                   -- aktivní
);
```

Nebo přidej zaměstnance přes admin rozhraní v aplikaci (sekce Zaměstnanci → + Přidat).

### Krok 5: Nastavení sazeb

Přihlas se jako admin → Nastavení → uprav sazby pro plavčíky a pokladní.

---

## Struktura souborů

```
koupalistni-system/
├── index.html              ← Vstupní bod aplikace
├── styles.css              ← Všechny styly
├── supabase-setup.sql      ← SQL schema (spusť jednou v Supabase)
├── README.md               ← Tento soubor
└── js/
    ├── config.js           ← Supabase URL + klíč (zde nastavit)
    ├── holidays.js         ← České státní svátky + výpočet Velikonoc
    ├── db.js               ← Databázové operace (Supabase klient)
    ├── ui.js               ← Sdílené UI komponenty
    ├── export.js           ← Export do CSV a XLSX
    ├── views-employee.js   ← Obrazovky zaměstnance
    ├── views-admin.js      ← Obrazovky admina
    └── app.js              ← Hlavní aplikace, autentizace, routing
```

---

## Přihlašování

### Admin
- Záložka **Admin** na přihlašovací stránce
- E-mail + heslo (nastaveno přes Supabase Auth)

### Zaměstnanec
- Záložka **Zaměstnanec**
- E-mail + heslo (zaměstnanec si nastaví po přijetí pozvánky)

---

## Funkce systému

### Zaměstnanec
- ✅ Přehled nadcházejících směn
- ✅ Zadávání dostupnosti (Můžu / Nemůžu / Můžu od–do)
- ✅ Zobrazení vlastních směn a odpracovaných hodin
- ✅ Měsíční přehled hodin (bez výdělků)

### Admin
- ✅ Dashboard s přehledem celého provozu
- ✅ Správa zaměstnanců (přidat, upravit, deaktivovat)
- ✅ Plánování směn přes interaktivní kalendář
- ✅ Automatický výpočet hodin a výdělků
- ✅ Kontrola mladistvých (max. 8h směna)
- ✅ Měsíční přehled s filtry (role, měsíc)
- ✅ Export do CSV a Excel (.xlsx)
- ✅ Nastavení sazeb (plavčíci/pokladní, typ dne)

### Automatické funkce
- ✅ Rozlišení pracovní den / sobota / neděle / státní svátek
- ✅ Státní svátky ČR (pevné + Velikonoce automaticky)
- ✅ Sezóna do 30. září aktuálního roku

---

## Technický stack

| Vrstva | Technologie | Cena |
|--------|------------|------|
| Frontend | HTML5, CSS3, Vanilla JavaScript | Zdarma |
| Databáze + Auth | Supabase Free Tier | Zdarma |
| Hosting | GitHub Pages | Zdarma |
| Excel export | SheetJS (CDN) | Zdarma |

**Celkové provozní náklady: 0 Kč/měsíc**

---

## Konfigurace (config.js)

```js
const SUPABASE_URL     = 'https://xkmwrokcmcdrlnaqvybl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_...';
const SEASON_END       = new Date(new Date().getFullYear(), 8, 30); // 30. září
```

---

## Sazby (výchozí hodnoty)

| Role | Pracovní den | Víkend | Státní svátek |
|------|-------------|--------|---------------|
| Plavčík | 120 Kč/h | 150 Kč/h | 180 Kč/h |
| Pokladní | 110 Kč/h | 140 Kč/h | 170 Kč/h |

Sazby lze změnit v admin části (Nastavení) bez nutnosti editovat kód.

---

## Bezpečnost

- **Row Level Security (RLS)** — zaměstnanec fyzicky nemůže přistupovat k datům ostatních ani přes DevTools
- Admin role je ověřena na úrovni databáze (tabulka `admins`)
- Komunikace šifrována HTTPS (Supabase + GitHub Pages)

---

*Vyvinuto pro koupaliště Zbysov | 2026*
