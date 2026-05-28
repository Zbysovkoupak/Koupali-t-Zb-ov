// =============================================================
// NOTIFIKACE — Make.com webhook
// Fire-and-forget: pošle JSON na Make webhook, neblokuje UI
// =============================================================

const Notifications = {

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
      this.send(event, data.employees.name, data.employees.email, {
        date: this._formatDate(data.date),
        start_time: data.start_time,
        end_time: data.end_time
      });
    } catch (e) {
      console.warn('Notifikace — chyba načtení dat:', e.message);
    }
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
