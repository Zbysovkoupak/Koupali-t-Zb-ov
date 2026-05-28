// =============================================================
// NOTIFIKACE — Make.com webhook
// Fire-and-forget: pošle JSON na Make webhook, neblokuje UI
// =============================================================

const Notifications = {

  // České 5. pád (vokativ) pro jméno zaměstnance
  // Formát jména je "Příjmení Jméno" — bereme poslední slovo (křestní jméno)
  _toVocative(fullName) {
    if (!fullName) return fullName;
    const parts = fullName.trim().split(/\s+/);
    const first = parts[parts.length - 1];
    return this._czechVocative(first);
  },

  _czechVocative(name) {
    if (!name || name.length < 2) return name;
    const l = name.toLowerCase();

    // Beze změny
    if (l.endsWith('í') || l.endsWith('ie') || l.endsWith('i') || l.endsWith('y') || l.endsWith('e'))
      return name;

    // Ženská jména na -a → -o (Jana→Jano, Petra→Petro, Karolína→Karolíno)
    if (l.endsWith('a')) return name.slice(0, -1) + 'o';

    // Mužská — specifické vzory (od nejspecifičtějšího)
    if (l.endsWith('ek'))  return name.slice(0, -2) + 'ku';   // Marek→Marku, Zdeněk→Zdeňku
    if (l.endsWith('el'))  return name.slice(0, -2) + 'le';   // Pavel→Pavle, Karel→Karle
    if (l.endsWith('ej'))  return name + 'i';                  // Ondřej→Ondřeji
    if (l.endsWith('áš') || l.endsWith('eš') || l.endsWith('iš') || l.endsWith('uš'))
      return name + 'i';                                        // Tomáš→Tomáši, Aleš→Aleši
    if (l.endsWith('ík') || l.endsWith('ik')) return name + 'u'; // Dominik→Dominiku
    if (l.endsWith('an')) return name.slice(0, -2) + 'ane';    // Jan→Jane, Roman→Romane
    if (l.endsWith('in')) return name.slice(0, -2) + 'ine';    // Martin→Martine
    if (l.endsWith('on')) return name.slice(0, -2) + 'one';    // Šimon→Šimone

    // Obecné mužské (souhláska) → přidej -e
    if ('bcdfghjklmnprstvz'.includes(l[l.length - 1])) return name + 'e';

    return name;
  },

  // Formátuje datum YYYY-MM-DD na český formát D. M. YYYY
  _formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${parseInt(d)}. ${parseInt(m)}. ${y}`;
  },

  // Odešle notifikaci na Make.com webhook (neblokuje, chyby ignoruje)
  send(event, employeeName, employeeEmail, extraData = {}) {
    if (!MAKE_WEBHOOK_URL || !employeeEmail) return;
    const payload = {
      event,
      employee_name: employeeName || '',
      employee_vocative: this._toVocative(employeeName || ''),
      employee_email: employeeEmail,
      ...extraData
    };
    try {
      const url = new URL(MAKE_WEBHOOK_URL);
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== null && v !== undefined) url.searchParams.append(k, String(v));
      });
      fetch(url.toString(), { mode: 'no-cors' })
        .catch(e => console.warn('Notifikace se nepodařila odeslat:', e.message));
    } catch (e) {
      console.warn('Notifikace — chyba sestavení URL:', e.message);
    }
  },

  // Načte data směny + zaměstnance a pošle notifikaci
  async sendForShift(event, shiftId) {
    if (!MAKE_WEBHOOK_URL) return;
    try {
      const { data } = await getSupabase()
        .from('shifts')
        .select('date, start_time, end_time, employees(name, email)')
        .eq('id', shiftId)
        .single();
      if (!data?.employees?.email) return;
      // Sestavíme datetime řetězce pro kalendářové odkazy (yyyyMMddTHHmmss)
      const datePart = data.date.replace(/-/g, '');
      const startDt  = datePart + 'T' + data.start_time.replace(/:/g, '').substring(0, 6);
      const endDt    = datePart + 'T' + data.end_time.replace(/:/g, '').substring(0, 6);
      this.send(event, data.employees.name, data.employees.email, {
        date: this._formatDate(data.date),
        start_time: data.start_time,
        end_time: data.end_time,
        start_dt: startDt,
        end_dt: endDt
      });
    } catch (e) {
      console.warn('Notifikace — chyba načtení dat:', e.message);
    }
  },

  // Pošle souhrnný email s více směnami najednou (jako HTML tabulka)
  sendShiftSummary(employeeName, employeeEmail, shifts) {
    if (!MAKE_WEBHOOK_URL || !employeeEmail || !shifts?.length) return;

    // Sestaví HTML řádky pro každou směnu
    const rows = shifts.map(s => {
      const d = new Date(s.date);
      const dayName = ['Ne','Po','Út','St','Čt','Pá','So'][d.getDay()];
      const dateStr = `${d.getDate()}. ${d.getMonth()+1}. ${d.getFullYear()}`;
      const start = (s.start_time || '').substring(0, 5);
      const end   = (s.end_time   || '').substring(0, 5);
      // datetime pro první směnu jako kotvu do kalendáře
      const datePart = s.date.replace(/-/g, '');
      const startDt  = datePart + 'T' + (s.start_time || '').replace(/:/g, '').substring(0, 6);
      const endDt    = datePart + 'T' + (s.end_time   || '').replace(/:/g, '').substring(0, 6);
      return `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#111827"><strong>${dayName}</strong></td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#374151">${dateStr}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#374151">${start} – ${end}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center"><a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Smena+Koupali%C5%A1te+Zbysov&dates=${startDt}/${endDt}" style="color:#4285f4;font-size:12px;margin-right:6px">Google</a><a href="https://zbysovkoupak.github.io/Koupali-t-Zb-ov/ics.html?start=${startDt}&end=${endDt}" style="color:#555;font-size:12px">Apple</a></td></tr>`;
    }).join('');

    const shiftsHtml = `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden"><thead><tr style="background:#f9fafb"><th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:12px">Den</th><th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:12px">Datum</th><th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:12px">Čas</th><th style="padding:8px 12px;text-align:center;color:#6b7280;font-size:12px">Kalendář</th></tr></thead><tbody>${rows}</tbody></table>`;

    this.send('shift_summary', employeeName, employeeEmail, {
      shifts_count: shifts.length,
      shifts_html: shiftsHtml
    });
  },

  // Načte zaměstnance a pošle notifikaci o zamítnutí dostupnosti
  async sendForAvailabilityRejection(employeeId, dateStr) {
    if (!MAKE_WEBHOOK_URL) return;
    try {
      const { data } = await getSupabase()
        .from('employees')
        .select('name, email')
        .eq('id', employeeId)
        .single();
      if (!data?.email) return;
      this.send('shift_rejected', data.name, data.email, {
        date: this._formatDate(dateStr)
      });
    } catch (e) {
      console.warn('Notifikace — chyba načtení dat:', e.message);
    }
  }
};
