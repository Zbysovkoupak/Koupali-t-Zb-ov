// =============================================================
// KONFIGURACE SUPABASE
// Po vytvoření projektu v Supabase sem vlož URL a anon key
// Najdeš je v: Supabase Dashboard → Project Settings → API
// =============================================================

const SUPABASE_URL = 'https://xkmwrokcmcdrlnaqvybl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VW4S0HteMDKm8y3YWuKXrg_boPzbjGQ';

// Make.com webhook pro emailové notifikace zaměstnancům
const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/qh35r9sg285uh091plrtfj1mb52bhnlt';

// Sezóna — systém generuje kalendář od dnes do tohoto data
const SEASON_END = new Date(new Date().getFullYear(), 8, 30); // 30. září aktuálního roku

// Výchozí sazby (Kč/hod) — admin může změnit v nastavení
const DEFAULT_RATES = {
  lifeguard:   { weekday: 120, weekend: 150, holiday: 180 },
  cashier:     { weekday: 110, weekend: 140, holiday: 170 },
  maintenance: { weekday: 130, weekend: 160, holiday: 190 },
  chemist:     { weekday: 130, weekend: 160, holiday: 190 },
  manager:     { weekday: 150, weekend: 180, holiday: 210 }
};

// Přeložené názvy rolí
const ROLE_LABELS = {
  lifeguard:   'Plavčík',
  cashier:     'Pokladní',
  maintenance: 'Údržba',
  chemist:     'Chemik',
  manager:     'Správce'
};

// Role, které zadávají hodiny samy (ne přes dostupnost/směny)
const SELF_LOG_ROLES = ['maintenance', 'chemist'];

// Typy dnů
const DAY_TYPE_LABELS = {
  weekday: 'Pracovní den',
  saturday: 'Sobota',
  sunday: 'Neděle',
  holiday: 'Státní svátek'
};

// České názvy dnů a měsíců
const CZ_DAYS = ['Neděle','Pondělí','Úterý','Středa','Čtvrtek','Pátek','Sobota'];
const CZ_DAYS_SHORT = ['Ne','Po','Út','St','Čt','Pá','So'];
const CZ_MONTHS = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];
