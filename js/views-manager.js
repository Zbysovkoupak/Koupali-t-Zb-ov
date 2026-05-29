// =============================================================
// POHLEDY — SPRÁVCE (read-only přístup k admin datům)
// =============================================================

const ManagerViews = {

  currentUser: null,
  currentMonth: new Date().getMonth() + 1,
  currentYear:  new Date().getFullYear(),
  roleFilter:   'all',

  init(user) {
    this.currentUser = user;
    this.renderNav();
    this.showDashboard();
  },

  renderNav() {
    const nav = document.getElementById('app-nav');
    nav.innerHTML = `
      <div class="nav-user">
        ${UI.avatarHTML(this.currentUser.name, 36)}
        <div class="nav-user-info">
          <span class="nav-user-name">${escapeHtml(this.currentUser.name)}</span>
          <span class="nav-user-role">Správce</span>
        </div>
      </div>
      <nav class="nav-links">
        <a class="nav-item" id="nav-mgr-dashboard"  onclick="ManagerViews.showDashboard()">🏠 Dashboard</a>
        <a class="nav-item" id="nav-mgr-employees"  onclick="ManagerViews.showEmployees()">👥 Zaměstnanci</a>
        <a class="nav-item" id="nav-mgr-shifts"     onclick="ManagerViews.showShifts()">📋 Plán směn</a>
        <a class="nav-item" id="nav-mgr-reports"    onclick="ManagerViews.showReports()">📊 Přehledy</a>
      </nav>
      <button class="btn btn-ghost nav-logout" onclick="App.logout()">Odhlásit</button>
    `;
  },

  // ─── Dashboard ───────────────────────────────────────────────

  async showDashboard() {
    UI.setActiveNav('mgr-dashboard');
    const main = document.getElementById('app-main');
    UI.showLoading();

    try {
      const year  = this.currentYear;
      const month = this.currentMonth;

      const [employees, allShifts] = await Promise.all([
        Employees.getAll(),
        Shifts.getAllForMonth(year, month)
      ]);

      const totalHours    = allShifts.reduce((s, x) => s + parseFloat(x.hours || 0), 0);
      const totalEarnings = allShifts.reduce((s, x) => s + parseFloat(x.earnings || 0), 0);

      UI.hideLoading();

      main.innerHTML = `
        <div class="page-header">
          <h1>Dashboard</h1>
          <p class="page-subtitle">${CZ_MONTHS[month - 1]} ${year} <span class="badge badge-neutral" style="margin-left:8px">Zobrazení</span></p>
        </div>

        <div class="stats-grid">
          <div class="stat-card"><div class="stat-value">${employees.length}</div><div class="stat-label">Aktivní zaměstnanci</div></div>
          <div class="stat-card"><div class="stat-value">${allShifts.length}</div><div class="stat-label">Směn tento měsíc</div></div>
          <div class="stat-card"><div class="stat-value">${totalHours.toFixed(0)}</div><div class="stat-label">Hodin tento měsíc</div></div>
          <div class="stat-card"><div class="stat-value">${UI.formatMoney(totalEarnings)}</div><div class="stat-label">Náklady na mzdy</div></div>
        </div>

        <div class="dashboard-grid">
          <div class="card">
            <div class="card-header"><h2 class="card-title">Zaměstnanci</h2></div>
            <div class="emp-summary">
              ${Object.entries(ROLE_LABELS).map(([role, label]) => {
                const count = employees.filter(e => e.role === role).length;
                if (count === 0) return '';
                return `<div class="emp-group"><span class="emp-group-label">${label}</span><span class="emp-group-count">${count}</span></div>`;
              }).join('')}
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h2 class="card-title">Rychlé přehledy</h2></div>
            <div class="quick-actions">
              <button class="btn btn-secondary" onclick="ManagerViews.showShifts()">📋 Plán směn</button>
              <button class="btn btn-secondary" onclick="ManagerViews.showReports()">📊 Měsíční přehled</button>
              <button class="btn btn-secondary" onclick="ManagerViews.showEmployees()">👥 Zaměstnanci</button>
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      UI.hideLoading();
      main.innerHTML = `<div class="error-state">Chyba: ${escapeHtml(e.message)}</div>`;
    }
  },

  // ─── Zaměstnanci (jen zobrazení) ─────────────────────────────

  async showEmployees() {
    UI.setActiveNav('mgr-employees');
    const main = document.getElementById('app-main');
    UI.showLoading('Načítám zaměstnance...');

    try {
      const employees = await Employees.getAll();
      UI.hideLoading();

      main.innerHTML = `
        <div class="page-header"><h1>Zaměstnanci</h1></div>
        <div class="card">
          <table class="data-table">
            <thead><tr><th>Zaměstnanec</th><th>Role</th><th>Věk</th><th>Telefon</th><th>Status</th></tr></thead>
            <tbody>
              ${employees.map(emp => {
                const age = Employees.calcAge(emp.birth_date);
                return `<tr>
                  <td><div class="emp-cell">${UI.avatarHTML(emp.name, 32)}<div>
                    <div class="emp-name">${escapeHtml(emp.name)}</div>
                    <div class="emp-role-label">${ROLE_LABELS[emp.role] || emp.role}</div>
                  </div></div></td>
                  <td><span class="badge badge-role-${emp.role}">${ROLE_LABELS[emp.role] || emp.role}</span></td>
                  <td>${age !== null ? `${age} let` : '–'}</td>
                  <td>${emp.phone ? `<a href="tel:${escapeHtml(emp.phone)}">${escapeHtml(emp.phone)}</a>` : '–'}</td>
                  <td><span class="badge ${emp.is_active ? 'badge-success' : 'badge-neutral'}">${emp.is_active ? 'Aktivní' : 'Neaktivní'}</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      UI.hideLoading();
      main.innerHTML = `<div class="error-state">Chyba: ${escapeHtml(e.message)}</div>`;
    }
  },

  // ─── Plán směn (jen zobrazení) ───────────────────────────────

  async showShifts() {
    UI.setActiveNav('mgr-shifts');
    const main = document.getElementById('app-main');
    UI.showLoading('Načítám...');

    try {
      const year  = this.currentYear;
      const month = this.currentMonth;

      const [employees, shifts] = await Promise.all([
        Employees.getAll(),
        Shifts.getAllForMonth(year, month)
      ]);

      const holidays = getHolidays(year);
      const shiftsByDate = {};
      for (const s of shifts) {
        if (!shiftsByDate[s.date]) shiftsByDate[s.date] = [];
        shiftsByDate[s.date].push(s);
      }

      UI.hideLoading();

      main.innerHTML = `
        <div class="page-header">
          <h1>Plán směn</h1>
          <div class="header-controls">
            <select class="form-control form-control-sm" onchange="ManagerViews.roleFilter=this.value;ManagerViews.showShifts()">
              <option value="all"         ${this.roleFilter==='all'       ?'selected':''}>Všichni</option>
              <option value="lifeguard"   ${this.roleFilter==='lifeguard' ?'selected':''}>Plavčíci</option>
              <option value="cashier"     ${this.roleFilter==='cashier'   ?'selected':''}>Pokladní</option>
            </select>
            <div class="month-nav">
              <button class="btn btn-ghost" onclick="ManagerViews.shiftsPrevMonth()">‹</button>
              <span class="month-label">${CZ_MONTHS[month - 1]} ${year}</span>
              <button class="btn btn-ghost" onclick="ManagerViews.shiftsNextMonth()">›</button>
            </div>
          </div>
        </div>

        <div class="card">
          <table class="data-table">
            <thead>
              <tr><th>Datum</th><th>Den</th><th>Typ</th><th>Zaměstnanec</th><th>Role</th><th>Čas</th><th>Hodin</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${shifts
                .filter(s => this.roleFilter === 'all' || s.employees?.role === this.roleFilter)
                .sort((a,b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
                .map(s => {
                  const d = new Date(s.date);
                  const holName = getHolidayName(d, holidays);
                  return `<tr>
                    <td>${UI.formatDate(s.date)}</td>
                    <td>${CZ_DAYS[d.getDay()]}</td>
                    <td>${UI.dayTypeBadge(s.day_type, holName)}</td>
                    <td>${escapeHtml(s.employees?.name || '–')}</td>
                    <td>${ROLE_LABELS[s.employees?.role] || s.employees?.role || '–'}</td>
                    <td>${s.start_time}–${s.end_time}</td>
                    <td>${parseFloat(s.hours)}</td>
                    <td>${s.is_confirmed ? '<span class="badge badge-success">✓ Potvrzeno</span>' : '<span class="badge badge-warning">Čeká</span>'}</td>
                  </tr>`;
                }).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      UI.hideLoading();
      main.innerHTML = `<div class="error-state">Chyba: ${escapeHtml(e.message)}</div>`;
    }
  },

  shiftsPrevMonth() {
    this.currentMonth--;
    if (this.currentMonth < 1) { this.currentMonth = 12; this.currentYear--; }
    this.showShifts();
  },

  shiftsNextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 12) { this.currentMonth = 1; this.currentYear++; }
    this.showShifts();
  },

  // ─── Měsíční přehled (jen zobrazení) ─────────────────────────

  async showReports() {
    UI.setActiveNav('mgr-reports');
    const main = document.getElementById('app-main');
    UI.showLoading('Generuji přehled...');

    try {
      const year  = this.currentYear;
      const month = this.currentMonth;
      const summaries = await Reports.buildMonthReport(year, month);

      const filtered = this.roleFilter === 'all'
        ? summaries
        : summaries.filter(s => s.employee.role === this.roleFilter);

      const totalHours    = filtered.reduce((s, x) => s + x.hours_total, 0);
      const totalEarnings = filtered.reduce((s, x) => s + x.earnings_total, 0);

      UI.hideLoading();

      main.innerHTML = `
        <div class="page-header">
          <h1>Měsíční přehled</h1>
          <div class="header-controls">
            <select class="form-control form-control-sm" onchange="ManagerViews.roleFilter=this.value;ManagerViews.showReports()">
              <option value="all"         ${this.roleFilter==='all'         ?'selected':''}>Všichni</option>
              <option value="lifeguard"   ${this.roleFilter==='lifeguard'   ?'selected':''}>Plavčíci</option>
              <option value="cashier"     ${this.roleFilter==='cashier'     ?'selected':''}>Pokladní</option>
              <option value="maintenance" ${this.roleFilter==='maintenance' ?'selected':''}>Údržba</option>
              <option value="chemist"     ${this.roleFilter==='chemist'     ?'selected':''}>Chemici</option>
            </select>
            <div class="month-nav">
              <button class="btn btn-ghost" onclick="ManagerViews.reportsPrevMonth()">‹</button>
              <span class="month-label">${CZ_MONTHS[month - 1]} ${year}</span>
              <button class="btn btn-ghost" onclick="ManagerViews.reportsNextMonth()">›</button>
            </div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card"><div class="stat-value">${filtered.filter(s => s.hours_total > 0).length}</div><div class="stat-label">Zaměstnanců s hod.</div></div>
          <div class="stat-card"><div class="stat-value">${totalHours.toFixed(1)}</div><div class="stat-label">Hodin celkem</div></div>
          <div class="stat-card stat-card-total"><div class="stat-value">${UI.formatMoney(totalEarnings)}</div><div class="stat-label">Celkové náklady</div></div>
        </div>

        <div class="card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Zaměstnanec</th><th>Role</th>
                <th class="text-right">Hod. celkem</th>
                <th class="text-right">Prac. dny</th><th class="text-right">Víkend</th><th class="text-right">Svátky</th>
                <th class="text-right">K výplatě</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(s => `
                <tr class="${s.hours_total === 0 ? 'row-zero' : ''}">
                  <td><div class="emp-cell">${UI.avatarHTML(s.employee.name, 28)}<span>${escapeHtml(s.employee.name)}</span></div></td>
                  <td><span class="badge badge-role-${s.employee.role}">${ROLE_LABELS[s.employee.role] || s.employee.role}</span></td>
                  <td class="text-right"><strong>${s.hours_total.toFixed(1)}</strong></td>
                  <td class="text-right">${s.hours_weekday.toFixed(1)}</td>
                  <td class="text-right">${s.hours_weekend.toFixed(1)}</td>
                  <td class="text-right">${s.hours_holiday.toFixed(1)}</td>
                  <td class="text-right"><strong>${UI.formatMoney(s.amount_to_pay)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      UI.hideLoading();
      main.innerHTML = `<div class="error-state">Chyba: ${escapeHtml(e.message)}</div>`;
    }
  },

  reportsPrevMonth() {
    this.currentMonth--;
    if (this.currentMonth < 1) { this.currentMonth = 12; this.currentYear--; }
    this.showReports();
  },

  reportsNextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 12) { this.currentMonth = 1; this.currentYear++; }
    this.showReports();
  }
};
