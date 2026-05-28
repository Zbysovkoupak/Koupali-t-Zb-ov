// =============================================================
// ČESKÉ STÁTNÍ SVÁTKY
// Pevné svátky + výpočet pohyblivých (Velikonoce)
// =============================================================

// Gaussův algoritmus pro výpočet data Velikonoční neděle
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-based
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

// Vrátí Set řetězců "YYYY-MM-DD" pro všechny svátky v daném roce
function getHolidays(year) {
  const holidays = new Map(); // "YYYY-MM-DD" => název svátku

  // Pevné svátky
  const fixed = [
    [1, 1,  'Nový rok / Den obnovy samostatného českého státu'],
    [5, 1,  'Svátek práce'],
    [5, 8,  'Den vítězství'],
    [7, 5,  'Den slovanských věrozvěstů Cyrila a Metoděje'],
    [7, 6,  'Den upálení mistra Jana Husa'],
    [9, 28, 'Den české státnosti'],
    [10,28, 'Den vzniku samostatného Československa'],
    [11,17, 'Den boje za svobodu a demokracii'],
    [12,24, 'Štědrý den'],
    [12,25, '1. svátek vánoční'],
    [12,26, '2. svátek vánoční'],
  ];

  for (const [month, day, name] of fixed) {
    const key = dateKey(new Date(year, month - 1, day));
    holidays.set(key, name);
  }

  // Pohyblivé svátky odvozené od Velikonoční neděle
  const easter = easterSunday(year);

  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  holidays.set(dateKey(goodFriday), 'Velký pátek');

  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  holidays.set(dateKey(easterMonday), 'Velikonoční pondělí');

  return holidays;
}

// Pomocná funkce: datum → "YYYY-MM-DD"
function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Určí typ dne pro dané datum
// Vrací: 'holiday' | 'sunday' | 'saturday' | 'weekday'
function getDayType(date, holidayMap) {
  const key = dateKey(date);
  if (holidayMap.has(key)) return 'holiday';
  const dow = date.getDay(); // 0 = neděle, 6 = sobota
  if (dow === 0) return 'sunday';
  if (dow === 6) return 'saturday';
  return 'weekday';
}

// Vrátí název svátku nebo null
function getHolidayName(date, holidayMap) {
  return holidayMap.get(dateKey(date)) || null;
}

// Vrátí true pokud je datum víkend nebo svátek
function isSpecialDay(dayType) {
  return dayType !== 'weekday';
}

// Sazba pro výpočet výdělku
function getRateForDayType(dayType, role, rates) {
  if (dayType === 'holiday') return rates[role].holiday;
  if (dayType === 'saturday' || dayType === 'sunday') return rates[role].weekend;
  return rates[role].weekday;
}
