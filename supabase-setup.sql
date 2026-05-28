-- ============================================================
-- KOUPALIŠTĚ — Supabase databázové schema
-- Spusť celý tento soubor v Supabase SQL Editoru
-- Dashboard → SQL Editor → New Query → vlož → Run
-- ============================================================

-- ─── TYPY (ENUMS) ────────────────────────────────────────────

CREATE TYPE employee_role AS ENUM ('lifeguard', 'cashier');
CREATE TYPE day_type AS ENUM ('weekday', 'saturday', 'sunday', 'holiday');
CREATE TYPE availability_status AS ENUM ('available', 'unavailable', 'partial');

-- ─── TABULKA: admins ─────────────────────────────────────────
-- Propojení Supabase Auth uživatele s rolí admin

CREATE TABLE admins (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name          TEXT NOT NULL DEFAULT 'Administrator',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── TABULKA: employees ──────────────────────────────────────

CREATE TABLE employees (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE,
  name          TEXT NOT NULL,
  role          employee_role NOT NULL,
  is_minor      BOOLEAN NOT NULL DEFAULT false,
  birth_date    DATE,
  pin           TEXT,                   -- uloženo jako prostý text (PIN není bezpečnostní klíč)
  email         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_employees_role     ON employees(role);
CREATE INDEX idx_employees_active   ON employees(is_active);
CREATE INDEX idx_employees_auth     ON employees(auth_user_id);

-- ─── TABULKA: availability ───────────────────────────────────

CREATE TABLE availability (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  date          DATE NOT NULL,
  status        availability_status NOT NULL,
  from_time     TIME,
  to_time       TIME,
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (employee_id, date)
);

CREATE INDEX idx_availability_employee ON availability(employee_id);
CREATE INDEX idx_availability_date     ON availability(date);

-- ─── TABULKA: shifts ─────────────────────────────────────────

CREATE TABLE shifts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  date          DATE NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  hours         NUMERIC(5,2) NOT NULL,
  day_type      day_type NOT NULL,
  rate_applied  NUMERIC(8,2) NOT NULL,
  earnings      NUMERIC(10,2) NOT NULL,
  note          TEXT,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shifts_employee ON shifts(employee_id);
CREATE INDEX idx_shifts_date     ON shifts(date);
CREATE INDEX idx_shifts_emp_date ON shifts(employee_id, date);

-- ─── TABULKA: rates ──────────────────────────────────────────

CREATE TABLE rates (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role          employee_role NOT NULL,
  day_type      TEXT NOT NULL CHECK (day_type IN ('weekday', 'weekend', 'holiday')),
  rate_per_hour NUMERIC(8,2) NOT NULL,
  valid_from    DATE DEFAULT CURRENT_DATE,
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (role, day_type)
);

-- Výchozí sazby (uprav dle potřeby)
INSERT INTO rates (role, day_type, rate_per_hour) VALUES
  ('lifeguard', 'weekday', 120),
  ('lifeguard', 'weekend', 150),
  ('lifeguard', 'holiday', 180),
  ('cashier',   'weekday', 110),
  ('cashier',   'weekend', 140),
  ('cashier',   'holiday', 170);

-- ─── TRIGGER: updated_at ─────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_availability_updated_at
  BEFORE UPDATE ON availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_shifts_updated_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Každý zaměstnanec vidí jen svá vlastní data
-- ============================================================

ALTER TABLE admins     ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees  ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rates      ENABLE ROW LEVEL SECURITY;

-- ─── HELPER FUNKCE: je aktuální uživatel admin? ──────────────

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins WHERE auth_user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── POLITIKY: admins ────────────────────────────────────────

CREATE POLICY "Admin vidí vlastní záznam"
  ON admins FOR SELECT
  USING (auth_user_id = auth.uid());

-- ─── POLITIKY: employees ─────────────────────────────────────

-- Admin vidí všechny zaměstnance
CREATE POLICY "Admin čte všechny zaměstnance"
  ON employees FOR SELECT
  USING (is_admin());

-- Zaměstnanec vidí jen svůj profil
CREATE POLICY "Zaměstnanec čte svůj profil"
  ON employees FOR SELECT
  USING (auth_user_id = auth.uid());

-- Pouze admin může vkládat/upravovat zaměstnance
CREATE POLICY "Admin spravuje zaměstnance"
  ON employees FOR ALL
  USING (is_admin());

-- ─── POLITIKY: availability ──────────────────────────────────

-- Admin vidí vše
CREATE POLICY "Admin čte dostupnost"
  ON availability FOR SELECT
  USING (is_admin());

-- Zaměstnanec vidí jen svoji
CREATE POLICY "Zaměstnanec čte vlastní dostupnost"
  ON availability FOR SELECT
  USING (
    employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  );

-- Zaměstnanec může editovat vlastní dostupnost
CREATE POLICY "Zaměstnanec edituje vlastní dostupnost"
  ON availability FOR INSERT
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Zaměstnanec aktualizuje vlastní dostupnost"
  ON availability FOR UPDATE
  USING (
    employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  );

-- Admin může vše
CREATE POLICY "Admin spravuje dostupnost"
  ON availability FOR ALL
  USING (is_admin());

-- ─── POLITIKY: shifts ────────────────────────────────────────

-- Admin vidí a spravuje vše
CREATE POLICY "Admin spravuje směny"
  ON shifts FOR ALL
  USING (is_admin());

-- Zaměstnanec vidí jen své směny (bez možnosti editace)
CREATE POLICY "Zaměstnanec čte vlastní směny"
  ON shifts FOR SELECT
  USING (
    employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  );

-- ─── POLITIKY: rates ─────────────────────────────────────────

-- Sazby vidí všichni přihlášení (jen pro zobrazení v náhledu)
CREATE POLICY "Všichni čtou sazby"
  ON rates FOR SELECT
  USING (auth.role() = 'authenticated');

-- Editovat může jen admin
CREATE POLICY "Admin spravuje sazby"
  ON rates FOR ALL
  USING (is_admin());

-- ============================================================
-- JAK PŘIDAT PRVNÍHO ADMINA
-- 1. Zaregistruj admina přes Supabase Auth (Authentication → Users → Invite)
--    nebo přes přihlašovací stránku aplikace
-- 2. Zkopíruj UUID nového uživatele z Authentication → Users
-- 3. Vlož ho do tabulky admins tímto SQL:
--
--    INSERT INTO admins (auth_user_id, name)
--    VALUES ('UUID-ADMINA-SEM', 'Admin Koupaliště');
--
-- ============================================================
