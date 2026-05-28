// =============================================================
// POHLEDY — ADMIN ČÁST
// =============================================================

const AdminViews = {

  currentMonth: new Date().getMonth() + 1,
  currentYear:  new Date().getFullYear(),
  roleFilter:   'all', // 'all' | 'lifeguard' | 'cashier'

  init() {
    this.renderNav();
    this.showDashboard();
  },

  renderNav() {
    const nav = document.getElementById('app-nav');
    nav.innerHTML = `
      <div class="nav-user">
        <div class="avatar" style="background:#e07b54;width:36px;height:36px;font-size:14px">A</div>
        <div class="nav-user-info">
          <span class="nav-user-name">Administrátor</span>
          <span class="nav-user-role">Admin</span>
        </div>
      </div>
      <nav class="nav-links">
        <a class="nav-item" id="nav-admin-dashboard"   onclick="AdminViews.showDashboard()">🏠 Dashboard</a>
        <a class="nav-item" id="nav-admin-employees"   onclick="AdminViews.showEmployees()">👥 Zaměstnanci</a>
        <a class="nav-item" id="nav-admin-shifts"      onclick="AdminViews.showShifts()">📋 Plánování směn</a>
        <a class="nav-item" id="nav-admin-reports"     onclick="AdminViews.showReports()">📊 Měsíční přehled</a>
        <a class="nav-item" id="nav-admin-settings"    onclick="AdminViews.showSettings()">⚙️ Nastavení</a>
      </nav>
      <button class="btn btn-ghost nav-logout" onclick="App.logout()">Odhlásit</button>
    `;
  },

  // ─── Dashboard ───────────────────────────────────────────────

  async showDashboard() {
    UI.setActiveNav('admin-dashboard');
    const main = document.getElementById('app-main');
    main.innerHTML = '<div class="loading-placeholder">Načítám...</div>';
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

      // Dostupnost tento týden
      const now = new Date();
      const weekStart = new Date(now);
      const dow = weekStart.getDay();
      weekStart.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      UI.hideLoading();

      main.innerHTML = `
        <div class="page-header">
          <h1>Dashboard</h1>
          <p class="page-subtitle">${CZ_MONTHS[month - 1]} ${year}</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${employees.length}</div>
            <div class="stat-label">Aktivní zaměstnanci</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${allShifts.length}</div>
            <div class="stat-label">Směn tento měsíc</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${totalHours.toFixed(0)}</div>
            <div class="stat-label">Hodin tento měsíc</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${UI.formatMoney(totalEarnings)}</div>
            <div class="stat-label">Náklady na mzdy</div>
          </div>
        </div>

        <div class="dashboard-grid">
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Zaměstnanci</h2>
              <button class="btn btn-primary btn-sm" onclick="AdminViews.openAddEmployeeModal()">+ Přidat</button>
            </div>
            <div class="emp-summary">
              <div class="emp-group">
                <span class="emp-group-label">Plavčíci</span>
                <span class="emp-group-count">${employees.filter(e => e.role === 'lifeguard').length}/14</span>
              </div>
              <div class="emp-group">
                <span class="emp-group-label">Pokladní</span>
                <span class="emp-group-count">${employees.filter(e => e.role === 'cashier').length}/5</span>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Rychlé akce</h2>
            </div>
            <div class="quick-actions">
              <button class="btn btn-secondary" onclick="AdminViews.showShifts()">📋 Naplánovat směny</button>
              <button class="btn btn-secondary" onclick="AdminViews.showReports()">📊 Měsíční přehled</button>
              <button class="btn btn-secondary" onclick="AdminViews.showEmployees()">👥 Správa zaměstnanců</button>
              <button class="btn btn-secondary" onclick="AdminViews.showSettings()">⚙️ Nastavení sazeb</button>
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      UI.hideLoading();
      main.innerHTML = `<div class="error-state">Chyba: ${escapeHtml(e.message)}</div>`;
    }
  },

  // ─── Zaměstnanci ─────────────────────────────────────────────

  async showEmployees() {
    UI.setActiveNav('admin-employees');
    const main = document.getElementById('app-main');
    UI.showLoading('Načítám zaměstnance...');

    try {
      const employees = await Employees.getAll();
      const lifeguards = employees.filter(e => e.role === 'lifeguard');
      const cashiers   = employees.filter(e => e.role === 'cashier');

      UI.hideLoading();

      main.innerHTML = `
        <div class="page-header">
          <h1>Zaměstnanci</h1>
          <button class="btn btn-primary" onclick="AdminViews.openAddEmployeeModal()">+ Přidat zaměstnance</button>
        </div>

        <div class="tabs">
          <button class="tab active" id="tab-lifeguard" onclick="AdminViews.switchEmpTab('lifeguard')">Plavčíci (${lifeguards.length})</button>
          <button class="tab" id="tab-cashier" onclick="AdminViews.switchEmpTab('cashier')">Pokladní (${cashiers.length})</button>
        </div>

        <div id="emp-tab-content">
          ${this._renderEmployeeTable(lifeguards)}
        </div>
      `;

      this._currentEmpTab = 'lifeguard';
      this._empData = { lifeguard: lifeguards, cashier: cashiers };
    } catch (e) {
      UI.hideLoading();
      main.innerHTML = `<div class="error-state">Chyba: ${escapeHtml(e.message)}</div>`;
    }
  },

  switchEmpTab(role) {
    this._currentEmpTab = role;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${role}`)?.classList.add('active');
    document.getElementById('emp-tab-content').innerHTML =
      this._renderEmployeeTable(this._empData[role] || []);
  },

  _renderEmployeeTable(employees) {
    if (employees.length === 0) return UI.emptyState('Žádní zaměstnanci', '👤');
    return `
      <div class="card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Zaměstnanec</th>
              <th>Věk</th>
              <th>Mladistvý</th>
              <th>Status</th>
              <th>Akce</th>
            </tr>
          </thead>
          <tbody>
            ${employees.map(emp => {
              const age = Employees.calcAge(emp.birth_date);
              const isMinor = emp.is_minor || Employees.isMinorByBirthDate(emp.birth_date);
              return `
                <tr>
                  <td>
                    <div class="emp-cell">
                      ${UI.avatarHTML(emp.name, 32)}
                      <div>
                        <div class="emp-name">${escapeHtml(emp.name)}</div>
                        <div class="emp-role-label">${ROLE_LABELS[emp.role]}</div>
                      </div>
                    </div>
                  </td>
                  <td>${age !== null ? `${age} let` : '–'}</td>
                  <td>${isMinor ? '<span class="badge badge-warning">⚠ Mladistvý</span>' : '–'}</td>
                  <td><span class="badge ${emp.is_active ? 'badge-success' : 'badge-neutral'}">${emp.is_active ? 'Aktivní' : 'Neaktivní'}</span></td>
                  <td>
                    <div class="action-btns">
                      <button class="btn btn-sm btn-ghost" onclick="AdminViews.openEditEmployeeModal('${emp.id}')">✏️ Upravit</button>
                      <button class="btn btn-sm btn-ghost" onclick="AdminViews.showEmployeeDetail('${emp.id}')">📋 Detail</button>
                      ${emp.is_active ? `<button class="btn btn-sm btn-ghost btn-danger-ghost" onclick="AdminViews.deactivateEmployee('${emp.id}','${escapeHtml(emp.name)}')">Deaktivovat</button>` : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async openAddEmployeeModal() {
    await this._openEmployeeModal(null);
  },

  async openEditEmployeeModal(id) {
    const emp = await Employees.getById(id);
    await this._openEmployeeModal(emp);
  },

  async _openEmployeeModal(emp) {
    const isEdit = !!emp;
    const formHTML = `
      <form id="emp-form" class="form-stack">
        <div class="form-group">
          <label class="form-label">Celé jméno *</label>
          <input type="text" id="ef-name" class="form-control" value="${escapeHtml(emp?.name || '')}" required placeholder="Jan Novák">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Role *</label>
            <select id="ef-role" class="form-control">
              <option value="lifeguard" ${emp?.role === 'lifeguard' ? 'selected' : ''}>Plavčík</option>
              <option value="cashier"   ${emp?.role === 'cashier'   ? 'selected' : ''}>Pokladní</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Datum narození</label>
            <input type="date" id="ef-birth" class="form-control" value="${emp?.birth_date || ''}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label checkbox-label">
            <input type="checkbox" id="ef-minor" ${emp?.is_minor ? 'checked' : ''}>
            Mladistvý (pod 18 let) — max. 8h směna
          </label>
        </div>
        <div class="form-group">
          <label class="form-label">PIN (4 číslice) *</label>
          <input type="text" id="ef-pin" class="form-control" maxlength="4" pattern="[0-9]{4}"
            value="${emp?.pin || ''}" placeholder="1234" ${isEdit ? '' : 'required'}>
          ${isEdit ? '<small class="form-hint">Nech prázdné, pokud nechceš PIN měnit.</small>' : ''}
        </div>
        <div class="form-group">
          <label class="form-label">Přihlašovací e-mail (pro Supabase Auth)</label>
          <input type="email" id="ef-email" class="form-control" value="${emp?.email || ''}" placeholder="zamestnanec@koupalistni.cz">
          <small class="form-hint">Zaměstnanec se přihlásí tímto e-mailem. Pokud nevyplníš, může se přihlásit jen výběrem profilu + PIN.</small>
        </div>
        <div class="form-group">
          <label class="form-label">Poznámka</label>
          <textarea id="ef-note" class="form-control" rows="2">${escapeHtml(emp?.notes || '')}</textarea>
        </div>
        <p id="ef-error" class="form-error" style="display:none"></p>
      </form>
    `;

    const action = await UI.showModal(
      isEdit ? `Upravit: ${emp.name}` : 'Nový zaměstnanec',
      formHTML,
      [
        { label: isEdit ? 'Uložit změny' : 'Přidat zaměstnance', action: 'save', class: 'btn-primary' },
        { label: 'Zrušit', action: 'cancel', class: 'btn-secondary' }
      ]
    );

    if (action !== 'save') return;

    const name  = document.getElementById('ef-name')?.value.trim();
    const role  = document.getElementById('ef-role')?.value;
    const birth = document.getElementById('ef-birth')?.value || null;
    const minor = document.getElementById('ef-minor')?.checked;
    const pin   = document.getElementById('ef-pin')?.value.trim();
    const email = document.getElementById('ef-email')?.value.trim() || null;
    const notes = document.getElementById('ef-note')?.value.trim() || null;

    if (!name) { UI.toast('Zadej jméno', 'warning'); return; }
    if (!isEdit && (!pin || !/^\d{4}$/.test(pin))) { UI.toast('PIN musí být 4 číslice', 'warning'); return; }

    const payload = { name, role, birth_date: birth, is_minor: minor, notes, email };
    if (pin) payload.pin = pin;

    try {
      UI.showLoading('Ukládám...');
      if (isEdit) {
        await Employees.update(emp.id, payload);
        UI.toast('Zaměstnanec upraven', 'success');
      } else {
        payload.is_active = true;
        await Employees.create(payload);
        UI.toast('Zaměstnanec přidán', 'success');
      }
      UI.hideLoading();
      this.showEmployees();
    } catch (e) {
      UI.hideLoading();
      UI.toast(`Chyba: ${e.message}`, 'error');
    }
  },

  async deactivateEmployee(id, name) {
    const ok = await UI.confirm(`Deaktivovat zaměstnance <strong>${escapeHtml(name)}</strong>? Zaměstnanec nebude moci přistupovat do systému.`, 'Deaktivovat', true);
    if (!ok) return;
    try {
      UI.showLoading('Deaktivácia...');
      await Employees.deactivate(id);
      UI.hideLoading();
      UI.toast('Zaměstnanec deaktivován', 'success');
      this.showEmployees();
    } catch (e) {
      UI.hideLoading();
      UI.toast(`Chyba: ${e.message}`, 'error');
    }
  },

  // ─── Detail zaměstnance ──────────────────────────────────────

  async showEmployeeDetail(id) {
    UI.setActiveNav('admin-employees');
    const main = document.getElementById('app-main');
    UI.showLoading('Načítám detail...');

    try {
      const year  = this.currentYear;
      const month = this.currentMonth;

      const [emp, shifts, availability] = await Promise.all([
        Employees.getById(id),
        Shifts.getByEmployee(id, year, month),
        Availability.getByEmployee(id, `${year}-${pad2(month)}-01`, `${year}-${pad2(month)}-31`)
      ]);

      const rates   = await Rates.getAll();
      const summary = Reports.buildEmployeeSummary(emp, shifts);
      const holidays = getHolidays(year);
      const isMinor = emp.is_minor || Employees.isMinorByBirthDate(emp.birth_date);

      UI.hideLoading();

      main.innerHTML = `
        <div class="page-header">
          <button class="btn btn-ghost" onclick="AdminViews.showEmployees()">← Zpět</button>
          <h1>${escapeHtml(emp.name)}</h1>
          <button class="btn btn-secondary" onclick="AdminViews.openEditEmployeeModal('${emp.id}')">✏️ Upravit</button>
        </div>

        <div class="detail-header card">
          <div class="detail-avatar">${UI.avatarHTML(emp.name, 56)}</div>
          <div class="detail-info">
            <h2>${escapeHtml(emp.name)}</h2>
            <p>${ROLE_LABELS[emp.role]} ${isMinor ? '<span class="badge badge-warning">⚠ Mladistvý</span>' : ''}</p>
            ${emp.birth_date ? `<p>Datum narození: ${UI.formatDate(emp.birth_date)} (${Employees.calcAge(emp.birth_date)} let)</p>` : ''}
          </div>
          <div class="detail-month-nav">
            <button class="btn btn-ghost" onclick="AdminViews.detailPrevMonth('${id}')">‹</button>
            <span>${CZ_MONTHS[month - 1]} ${year}</span>
            <button class="btn btn-ghost" onclick="AdminViews.detailNextMonth('${id}')">›</button>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${summary.hours_total.toFixed(1)}</div>
            <div class="stat-label">Hodin celkem</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${summary.hours_weekday.toFixed(1)}</div>
            <div class="stat-label">Pracovní dny</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${summary.hours_weekend.toFixed(1)}</div>
            <div class="stat-label">Víkendy</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${summary.hours_holiday.toFixed(1)}</div>
            <div class="stat-label">Svátky</div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card stat-card-money">
            <div class="stat-value">${UI.formatMoney(summary.earnings_weekday)}</div>
            <div class="stat-label">Výdělek prac. dny</div>
          </div>
          <div class="stat-card stat-card-money">
            <div class="stat-value">${UI.formatMoney(summary.earnings_weekend)}</div>
            <div class="stat-label">Výdělek víkendy</div>
          </div>
          <div class="stat-card stat-card-money">
            <div class="stat-value">${UI.formatMoney(summary.earnings_holiday)}</div>
            <div class="stat-label">Výdělek svátky</div>
          </div>
          <div class="stat-card stat-card-total">
            <div class="stat-value">${UI.formatMoney(summary.earnings_total)}</div>
            <div class="stat-label">K výplatě celkem</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Směny — ${CZ_MONTHS[month - 1]} ${year}</h2>
            <button class="btn btn-primary btn-sm" onclick="AdminViews.openAddShiftModal('${id}')">+ Přidat směnu</button>
          </div>
          ${shifts.length === 0
            ? UI.emptyState('Žádné směny v tomto měsíci', '📅')
            : `
              <table class="data-table">
                <thead>
                  <tr><th>Datum</th><th>Typ</th><th>Začátek</th><th>Konec</th><th>Hodin</th><th>Sazba</th><th>Výdělek</th><th>Akce</th></tr>
                </thead>
                <tbody>
                  ${shifts.map(s => {
                    const d = new Date(s.date);
                    const holName = getHolidayName(d, holidays);
                    return `
                      <tr>
                        <td>${UI.formatDate(s.date)}<br><small>${CZ_DAYS[d.getDay()]}</small></td>
                        <td>${UI.dayTypeBadge(s.day_type, holName)}</td>
                        <td>${s.start_time}</td>
                        <td>${s.end_time}</td>
                        <td><strong>${parseFloat(s.hours)}</strong></td>
                        <td>${parseFloat(s.rate_applied)} Kč/h</td>
                        <td><strong>${UI.formatMoney(s.earnings)}</strong></td>
                        <td>
                          ${s.is_confirmed
                            ? `<span class="badge badge-success" style="margin-right:4px">✓ Potvrzeno</span>`
                            : `<span class="badge badge-warning" style="margin-right:4px">Čeká</span>`
                          }
                          <button class="btn btn-sm ${s.is_confirmed ? 'btn-ghost' : 'btn-primary'}" style="margin-right:2px"
                            onclick="AdminViews.toggleConfirmShift('${s.id}', ${s.is_confirmed}, '${id}')">
                            ${s.is_confirmed ? '✕ Zrušit' : '✓ Potvrdit'}
                          </button>
                          <button class="btn btn-sm btn-ghost" onclick="AdminViews.openEditShiftModal('${s.id}')">✏️</button>
                          <button class="btn btn-sm btn-ghost btn-danger-ghost" onclick="AdminViews.deleteShift('${s.id}','${id}')">🗑</button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            `
          }
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Dostupnost — ${CZ_MONTHS[month - 1]} ${year}</h2>
          </div>
          ${this._renderAvailabilityList(availability, holidays)}
        </div>
      `;

      this._detailEmployeeId = id;
    } catch (e) {
      UI.hideLoading();
      main.innerHTML = `<div class="error-state">Chyba: ${escapeHtml(e.message)}</div>`;
    }
  },

  detailPrevMonth(id) {
    this.currentMonth--;
    if (this.currentMonth < 1) { this.currentMonth = 12; this.currentYear--; }
    this.showEmployeeDetail(id);
  },

  detailNextMonth(id) {
    this.currentMonth++;
    if (this.currentMonth > 12) { this.currentMonth = 1; this.currentYear++; }
    this.showEmployeeDetail(id);
  },

  _renderAvailabilityList(availability, holidays) {
    if (availability.length === 0) return UI.emptyState('Žádná dostupnost zadána', '📅');
    return `
      <div class="av-list">
        ${availability.map(a => {
          const d = new Date(a.date);
          const holName = getHolidayName(d, holidays);
          const dayType = getDayType(d, holidays);
          return `
            <div class="av-list-row">
              <span class="av-date">${UI.formatDate(a.date)} ${CZ_DAYS_SHORT[d.getDay()]}</span>
              ${UI.dayTypeBadge(dayType, holName)}
              ${UI.availabilityBadge(a.status, a.from_time, a.to_time)}
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  // ─── Plánování směn ──────────────────────────────────────────

  async showShifts() {
    UI.setActiveNav('admin-shifts');
    const main = document.getElementById('app-main');
    UI.showLoading('Načítám...');

    try {
      const year  = this.currentYear;
      const month = this.currentMonth;

      const [employees, shifts, availability] = await Promise.all([
        Employees.getAll(),
        Shifts.getAllForMonth(year, month),
        Availability.getAllForMonth(year, month)
      ]);

      const holidays = getHolidays(year);

      // Index: date → array of shifts
      const shiftsByDate = {};
      for (const s of shifts) {
        if (!shiftsByDate[s.date]) shiftsByDate[s.date] = [];
        shiftsByDate[s.date].push(s);
      }

      // Index: employeeId+date → availability
      const avIndex = {};
      for (const a of availability) {
        avIndex[`${a.employee_id}_${a.date}`] = a;
      }

      UI.hideLoading();

      main.innerHTML = `
        <div class="page-header">
          <h1>Plánování směn</h1>
          <div class="header-controls">
            <button class="btn btn-primary btn-sm" onclick="AdminViews.sendShiftSummaries()" title="Pošle každému zaměstnanci jeden souhrnný email se všemi nadcházejícími směnami">
              📧 Odeslat souhrny
            </button>
            <select class="form-control form-control-sm" id="role-filter" onchange="AdminViews.roleFilter=this.value;AdminViews.showShifts()">
              <option value="all"       ${this.roleFilter==='all'       ?'selected':''}>Všichni</option>
              <option value="lifeguard" ${this.roleFilter==='lifeguard' ?'selected':''}>Plavčíci</option>
              <option value="cashier"   ${this.roleFilter==='cashier'   ?'selected':''}>Pokladní</option>
            </select>
            <div class="month-nav">
              <button class="btn btn-ghost" onclick="AdminViews.shiftsPrevMonth()">‹</button>
              <span class="month-label">${CZ_MONTHS[month - 1]} ${year}</span>
              <button class="btn btn-ghost" onclick="AdminViews.shiftsNextMonth()">›</button>
            </div>
          </div>
        </div>

        <div class="card">
          ${this._renderShiftCalendar(year, month, employees, shiftsByDate, avIndex, holidays)}
        </div>
      `;
    } catch (e) {
      UI.hideLoading();
      main.innerHTML = `<div class="error-state">Chyba: ${escapeHtml(e.message)}</div>`;
    }
  },

  _renderShiftCalendar(year, month, employees, shiftsByDate, avIndex, holidays) {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay  = new Date(year, month, 0);
    const seasonEnd = SEASON_END;
    const filteredEmps = this.roleFilter === 'all'
      ? employees
      : employees.filter(e => e.role === this.roleFilter);

    let html = `
      <div class="shift-calendar">
        <div class="calendar-legend">
          <span class="legend-item"><span class="cal-day-dot weekday"></span> Prac. den</span>
          <span class="legend-item"><span class="cal-day-dot weekend"></span> Víkend</span>
          <span class="legend-item"><span class="cal-day-dot holiday"></span> Svátek</span>
          <span class="legend-item"><span class="cal-name-tag cal-name-confirmed" style="font-size:.7rem">AB</span> Potvrzená směna</span>
          <span class="legend-item"><span class="cal-name-tag cal-name-want" style="font-size:.7rem">CD</span> Chce směnu</span>
        </div>
    `;

    const startDow = firstDay.getDay();
    const offset   = startDow === 0 ? 6 : startDow - 1;
    const today = new Date(); today.setHours(0,0,0,0);

    html += `
      <div class="shift-cal-grid">
        <div class="cal-header">Po</div>
        <div class="cal-header">Út</div>
        <div class="cal-header">St</div>
        <div class="cal-header">Čt</div>
        <div class="cal-header">Pá</div>
        <div class="cal-header cal-header-weekend">So</div>
        <div class="cal-header cal-header-weekend">Ne</div>
    `;

    for (let i = 0; i < offset; i++) html += `<div class="cal-day cal-day-empty"></div>`;

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date    = new Date(year, month - 1, d);
      const key     = dateKey(date);
      const dayType = getDayType(date, holidays);
      const holName = getHolidayName(date, holidays);
      const isBeyond = date > seasonEnd;

      let cls = 'cal-day cal-day-interactive';
      if (dayType === 'holiday') cls += ' cal-holiday';
      else if (dayType === 'saturday' || dayType === 'sunday') cls += ' cal-weekend';
      if (dateKey(today) === key) cls += ' cal-today';
      if (isBeyond) cls += ' cal-beyond-season';

      const dayShifts = shiftsByDate[key] || [];
      const filteredShifts = this.roleFilter === 'all'
        ? dayShifts
        : dayShifts.filter(s => s.employees?.role === this.roleFilter);

      // Potvrzené směny — zelené jmenovky
      const confirmedShifts = filteredShifts.filter(s => s.is_confirmed);
      const confirmedEmpIds = new Set(confirmedShifts.map(s => s.employee_id));

      // Zaměstnanci s dostupností ale bez potvrzené směny — žluté indikátory
      const wantShift = filteredEmps.filter(e =>
        (avIndex[`${e.id}_${key}`]?.status === 'available' ||
         avIndex[`${e.id}_${key}`]?.status === 'partial') &&
        !confirmedEmpIds.has(e.id)
      );

      // Pomocná funkce: iniciály ze jména (Blažek Martin → BM)
      const initials = name => name.trim().split(' ').map(p => p[0] || '').join('').toUpperCase().substring(0, 2);

      const confirmedHTML = confirmedShifts.map(s =>
        `<span class="cal-name-tag cal-name-confirmed" title="${escapeHtml(s.employees?.name || '')}">${initials(s.employees?.name || '?')}</span>`
      ).join('');

      const wantHTML = wantShift.map(e =>
        `<span class="cal-name-tag cal-name-want" title="${escapeHtml(e.name)}">${initials(e.name)}</span>`
      ).join('');

      html += `
        <div class="${cls}" onclick="AdminViews.openDayPanel('${key}')">
          <div class="cal-day-num">${d}${holName ? ` <span class="cal-holiday-label">${escapeHtml(holName)}</span>` : ''}</div>
          <div class="cal-names-row">${confirmedHTML}${wantHTML}</div>
        </div>
      `;
    }

    html += `</div></div>`;
    return html;
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

  async openDayPanel(dateStr) {
    const date     = new Date(dateStr);
    const holidays = getHolidays(date.getFullYear());
    const dayType  = getDayType(date, holidays);
    const holName  = getHolidayName(date, holidays);
    const label    = UI.formatDateLong(dateStr);

    UI.showLoading('Načítám den...');

    const [dayShifts, employees, dayAvailability, rates] = await Promise.all([
      Shifts.getByDate(dateStr),
      Employees.getAll(),
      Availability.getByDate(dateStr),
      Rates.getAll()
    ]);

    UI.hideLoading();

    const avMap = {};
    for (const a of dayAvailability) avMap[a.employee_id] = a;

    const filteredEmps = this.roleFilter === 'all'
      ? employees
      : employees.filter(e => e.role === this.roleFilter);

    const shiftedIds = new Set(dayShifts.map(s => s.employee_id));

    const availableEmps = filteredEmps.filter(e => {
      const av = avMap[e.id];
      return av && (av.status === 'available' || av.status === 'partial');
    });

    const panelHTML = `
      <div class="day-panel">
        <div class="day-panel-header">
          <strong>${label}</strong>
          ${UI.dayTypeBadge(dayType, holName)}
        </div>

        <h3>Naplánované směny (${dayShifts.length})</h3>
        ${dayShifts.length === 0
          ? '<p class="text-muted">Žádné směny</p>'
          : `<table class="day-shift-table">
              <thead>
                <tr>
                  <th>Jméno</th>
                  <th>Čas</th>
                  <th>Hod</th>
                  <th>Stav</th>
                  <th>Akce</th>
                </tr>
              </thead>
              <tbody>
                ${dayShifts.map(s => {
                  const nameParts = (s.employees?.name || '?').trim().split(' ');
                  const shortName = nameParts.length >= 2
                    ? `${nameParts[0]} ${nameParts[nameParts.length-1][0]}.`
                    : nameParts[0];
                  return `
                    <tr class="${s.is_confirmed ? 'shift-tr-confirmed' : 'shift-tr-pending'}">
                      <td><strong title="${escapeHtml(s.employees?.name || '')}">${escapeHtml(shortName)}</strong></td>
                      <td style="white-space:nowrap">${s.start_time}–${s.end_time}</td>
                      <td>${parseFloat(s.hours)}</td>
                      <td>${s.is_confirmed
                        ? '<span class="badge badge-success">✓</span>'
                        : '<span class="badge badge-warning">čeká</span>'
                      }</td>
                      <td>
                        <div class="dst-actions">
                          <button class="btn btn-xs ${s.is_confirmed ? 'btn-ghost' : 'btn-primary'}" title="${s.is_confirmed ? 'Zrušit potvrzení' : 'Potvrdit směnu'}"
                            onclick="AdminViews.toggleConfirmShift('${s.id}', ${s.is_confirmed}, null, '${dateStr}')">
                            ${s.is_confirmed ? '✕' : '✓'}
                          </button>
                          <button class="btn btn-xs btn-ghost" title="Upravit" onclick="AdminViews.openEditShiftModal('${s.id}','${dateStr}')">✏️</button>
                          <button class="btn btn-xs btn-ghost btn-danger-ghost" title="Smazat" onclick="AdminViews.deleteShift('${s.id}',null,'${dateStr}')">🗑</button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>`
        }

        <h3>Dostupní zaměstnanci (${availableEmps.length})</h3>
        ${availableEmps.length === 0
          ? '<p class="text-muted">Nikdo nezadal dostupnost</p>'
          : `<div class="avail-list">${availableEmps.map(e => {
              const av = avMap[e.id];
              const hasShift = shiftedIds.has(e.id);
              const isMinor = e.is_minor || Employees.isMinorByBirthDate(e.birth_date);
              return `
                <div class="avail-emp-row">
                  <div>
                    <strong>${escapeHtml(e.name)}</strong>
                    ${isMinor ? ' <span class="badge badge-warning">ML</span>' : ''}
                    &nbsp;${UI.availabilityBadge(av.status, av.from_time, av.to_time)}
                  </div>
                  <div style="display:flex;gap:6px;align-items:center">
                    ${hasShift
                      ? '<span class="badge badge-success">✓ Má směnu</span>'
                      : `<button class="btn btn-sm btn-primary" onclick="AdminViews.openAddShiftModal('${e.id}','${dateStr}')">+ Přidat</button>
                         <button class="btn btn-sm btn-ghost btn-danger-ghost" onclick="AdminViews.rejectAvailability('${e.id}','${dateStr}')">✕ Zamítnout</button>`
                    }
                  </div>
                </div>
              `;
            }).join('')}
          </div>`
        }
      </div>
    `;

    await UI.showModal(label, panelHTML, [
      { label: '+ Přidat směnu', action: 'add', class: 'btn-primary' },
      { label: 'Zavřít', action: 'close', class: 'btn-secondary' }
    ]).then(action => {
      if (action === 'add') this.openAddShiftModal(null, dateStr);
    });
  },

  // ─── Formulář směny ──────────────────────────────────────────

  async openAddShiftModal(employeeId = null, dateStr = null) {
    this._dayPanelDate = dateStr || null;
    await this._openShiftModal(null, employeeId, dateStr);
  },

  async openEditShiftModal(shiftId, sourceDate = null) {
    this._dayPanelDate = sourceDate || null;
    await this._openShiftModal(shiftId, null, null);
  },

  async _openShiftModal(shiftId, presetEmployeeId, presetDate) {
    UI.showLoading('Načítám...');

    let shift = null;
    if (shiftId) {
      const { data, error } = await getSupabase().from('shifts').select('*').eq('id', shiftId).single();
      if (!error) shift = data;
    }

    const [employees, rates] = await Promise.all([
      Employees.getAll(),
      Rates.getAll()
    ]);

    UI.hideLoading();

    const isEdit = !!shift;
    const defaultDate = shift?.date || presetDate || dateKey(new Date());
    const defaultEmpId = shift?.employee_id || presetEmployeeId || '';

    const dateObj = new Date(defaultDate);
    const holidays = getHolidays(dateObj.getFullYear());
    const dayType = getDayType(dateObj, holidays);

    const formHTML = `
      <form id="shift-form" class="form-stack">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Zaměstnanec *</label>
            <select id="sf-emp" class="form-control" onchange="AdminViews.onShiftEmpChange()">
              <option value="">— vyber —</option>
              <optgroup label="Pokladní">
                ${employees.filter(e => e.role === 'cashier').map(e => `
                  <option value="${e.id}"
                    data-minor="${e.is_minor || Employees.isMinorByBirthDate(e.birth_date) ? '1' : '0'}"
                    data-role="${e.role}"
                    ${(e.id === defaultEmpId || e.id == defaultEmpId) ? 'selected' : ''}>
                    ${escapeHtml(e.name)}${(e.is_minor || Employees.isMinorByBirthDate(e.birth_date)) ? ' ⚠️ML' : ''}
                  </option>
                `).join('')}
              </optgroup>
              <optgroup label="Plavčíci">
                ${employees.filter(e => e.role === 'lifeguard').map(e => `
                  <option value="${e.id}"
                    data-minor="${e.is_minor || Employees.isMinorByBirthDate(e.birth_date) ? '1' : '0'}"
                    data-role="${e.role}"
                    ${(e.id === defaultEmpId || e.id == defaultEmpId) ? 'selected' : ''}>
                    ${escapeHtml(e.name)}${(e.is_minor || Employees.isMinorByBirthDate(e.birth_date)) ? ' ⚠️ML' : ''}
                  </option>
                `).join('')}
              </optgroup>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Datum *</label>
            <input type="date" id="sf-date" class="form-control" value="${defaultDate}"
              onchange="AdminViews.onShiftDateChange()" required>
          </div>
        </div>
        <div id="sf-day-info" class="form-info">
          ${UI.dayTypeBadge(dayType, getHolidayName(dateObj, holidays))}
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Začátek * <small style="color:var(--text-muted)">(09:00–19:00)</small></label>
            <input type="time" id="sf-start" class="form-control" value="${shift?.start_time || '09:00'}"
              min="09:00" max="19:00" onchange="AdminViews.onShiftTimeChange()" required>
          </div>
          <div class="form-group">
            <label class="form-label">Konec * <small style="color:var(--text-muted)">(09:00–19:00)</small></label>
            <input type="time" id="sf-end" class="form-control" value="${shift?.end_time || '19:00'}"
              min="09:00" max="19:00" onchange="AdminViews.onShiftTimeChange()" required>
          </div>
        </div>
        <div id="sf-preview" class="shift-preview">
          <span id="sf-hours-label">–</span>
          <span id="sf-earnings-label"></span>
        </div>
        <div id="sf-minor-warning" class="form-warning" style="display:none">
          ⚠️ <strong>Mladistvý zaměstnanec!</strong> Maximální délka směny je 8 hodin.
        </div>
        <div class="form-group">
          <label class="form-label">Poznámka</label>
          <input type="text" id="sf-note" class="form-control" value="${escapeHtml(shift?.note || '')}">
        </div>
        <p id="sf-error" class="form-error" style="display:none"></p>
      </form>
    `;

    // Uložíme rates pro použití v change handlerech
    AdminViews._shiftFormRates = rates;

    const action = await UI.showModal(
      isEdit ? 'Upravit směnu' : 'Přidat směnu',
      formHTML,
      [
        { label: isEdit ? 'Uložit' : 'Přidat směnu', action: 'save', class: 'btn-primary' },
        { label: 'Zrušit', action: 'cancel', class: 'btn-secondary' }
      ]
    );

    // Spustit preview po otevření modalu
    setTimeout(() => AdminViews.onShiftTimeChange(), 50);

    if (action !== 'save') return;

    const empId     = document.getElementById('sf-emp')?.value;
    const dateVal   = document.getElementById('sf-date')?.value;
    const startTime = document.getElementById('sf-start')?.value;
    const endTime   = document.getElementById('sf-end')?.value;
    const noteVal   = document.getElementById('sf-note')?.value.trim();

    if (!empId || !dateVal || !startTime || !endTime) {
      UI.toast('Vyplň všechna povinná pole', 'warning');
      return;
    }

    const empOpt = document.querySelector(`#sf-emp option[value="${empId}"]`);
    const isMinor = empOpt?.dataset.minor === '1';
    const empRole = empOpt?.dataset.role;

    // Validace otevírací doby
    if (startTime < '08:00' || startTime > '19:00') {
      UI.toast('Začátek směny musí být mezi 08:00 a 19:00', 'error'); return;
    }
    if (endTime < '08:00' || endTime > '19:00') {
      UI.toast('Konec směny musí být mezi 09:00 a 19:00', 'error'); return;
    }

    const hours = Shifts.calcHours(startTime, endTime);
    if (hours <= 0) { UI.toast('Konec musí být po začátku', 'error'); return; }
    if (isMinor && hours > 8) {
      UI.toast('Mladistvý zaměstnanec nesmí mít směnu delší než 8 hodin!', 'error');
      return;
    }

    const dateForType = new Date(dateVal);
    const hols = getHolidays(dateForType.getFullYear());
    const dt   = getDayType(dateForType, hols);
    const rate = getRateForDayType(dt, empRole, rates);

    const payload = {
      employee_id:  empId,
      date:         dateVal,
      start_time:   startTime,
      end_time:     endTime,
      hours:        hours,
      day_type:     dt,
      rate_applied: rate,
      earnings:     parseFloat((hours * rate).toFixed(2)),
      note:         noteVal || null,
      is_confirmed: true   // Admin přidává směnu = automaticky potvrzená
    };

    try {
      UI.showLoading('Ukládám...');
      if (isEdit) {
        await Shifts.update(shiftId, payload);
        UI.toast('Směna upravena', 'success');
      } else {
        const newShift = await Shifts.create(payload);
        UI.toast('Směna přidána', 'success');
        // Individuální email se neposílá — zaměstnanec dostane souhrnný email přes tlačítko "Odeslat souhrny"
      }
      UI.hideLoading();
      // Refresh — vrátit se zpět tam, odkud byl modal otevřen
      if (this._dayPanelDate) {
        const d = this._dayPanelDate;
        this._dayPanelDate = null;
        await this.showShifts();   // obnov kalendář (zelené iniciály)
        await this.openDayPanel(d); // znovu otevři panel
      } else if (this._detailEmployeeId) {
        this.showEmployeeDetail(this._detailEmployeeId);
      } else {
        this.showShifts();
      }
    } catch (e) {
      UI.hideLoading();
      UI.toast(`Chyba: ${e.message}`, 'error');
    }
  },

  onShiftDateChange() {
    const dateVal = document.getElementById('sf-date')?.value;
    if (!dateVal) return;
    const d = new Date(dateVal);
    const holidays = getHolidays(d.getFullYear());
    const dayType = getDayType(d, holidays);
    const holName = getHolidayName(d, holidays);
    const infoEl = document.getElementById('sf-day-info');
    if (infoEl) infoEl.innerHTML = UI.dayTypeBadge(dayType, holName);
    this.onShiftTimeChange();
  },

  onShiftEmpChange() {
    this.onShiftTimeChange();
  },

  onShiftTimeChange() {
    const startEl = document.getElementById('sf-start');
    const endEl   = document.getElementById('sf-end');
    const dateEl  = document.getElementById('sf-date');
    const empEl   = document.getElementById('sf-emp');
    const warnEl  = document.getElementById('sf-minor-warning');
    const previewEl = document.getElementById('sf-preview');

    if (!startEl || !endEl || !dateEl) return;

    // ── Hlídač otevírací doby: clamp na 08:00–19:00 ──────────────
    const OPEN  = '08:00';
    const CLOSE = '19:00';
    const clampTime = (el) => {
      if (!el.value) return;
      if (el.value < OPEN)  { el.value = OPEN;  }
      if (el.value > CLOSE) { el.value = CLOSE; }
    };
    clampTime(startEl);
    clampTime(endEl);

    const start = startEl.value;
    const end   = endEl.value;
    const dateVal = dateEl.value;
    const empId   = empEl?.value;

    if (!start || !end || !dateVal) return;

    const hours = Shifts.calcHours(start, end);
    if (hours <= 0) {
      document.getElementById('sf-hours-label').textContent = 'Konec musí být po začátku';
      return;
    }

    // Minor check
    const empOpt = empId ? document.querySelector(`#sf-emp option[value="${empId}"]`) : null;
    const isMinor = empOpt?.dataset.minor === '1';
    const empRole = empOpt?.dataset.role || 'lifeguard';

    if (warnEl) warnEl.style.display = (isMinor && hours > 8) ? 'block' : 'none';

    // Výpočet výdělku
    const rates = AdminViews._shiftFormRates;
    if (rates && empRole) {
      const d = new Date(dateVal);
      const holidays = getHolidays(d.getFullYear());
      const dayType = getDayType(d, holidays);
      const rate = getRateForDayType(dayType, empRole, rates);
      const earnings = hours * rate;
      document.getElementById('sf-hours-label').textContent  = `${hours} hodin`;
      document.getElementById('sf-earnings-label').textContent = `${rate} Kč/h = ${UI.formatMoney(earnings)}`;
    } else {
      document.getElementById('sf-hours-label').textContent  = `${hours} hodin`;
      document.getElementById('sf-earnings-label').textContent = '';
    }
  },

  async rejectAvailability(employeeId, dateStr) {
    const ok = await UI.confirm('Zamítnout zájem o tuto směnu? Zaměstnanec bude odstraněn ze seznamu zájemců pro tento den.', 'Zamítnout', true);
    if (!ok) return;
    try {
      UI.showLoading('Zamítám...');
      await Availability.upsert(employeeId, dateStr, 'unavailable', null, null);
      UI.hideLoading();
      UI.toast('Zájem zamítnut', 'warning');
      // Notifikace o zamítnutí
      Notifications.sendForAvailabilityRejection(employeeId, dateStr);
      UI.closeModal();
      this.showShifts();
    } catch (e) {
      UI.hideLoading();
      UI.toast(`Chyba: ${e.message}`, 'error');
    }
  },

  async sendShiftSummaries() {
    const interval = await this._pickSummaryInterval();
    if (!interval) return;

    try {
      UI.showLoading('Načítám směny...');

      const today = new Date();
      const dateFrom = today.toISOString().split('T')[0];
      const dateTo = new Date(today);
      if (interval === 'week') dateTo.setDate(today.getDate() + 7);
      else dateTo.setMonth(today.getMonth() + 1);
      const dateToBound = dateTo.toISOString().split('T')[0];

      // Načti potvrzené směny v daném intervalu včetně zaměstnanců
      const { data: shifts, error } = await getSupabase()
        .from('shifts')
        .select('id, date, start_time, end_time, employees(id, name, email)')
        .eq('is_confirmed', true)
        .gte('date', dateFrom)
        .lte('date', dateToBound)
        .order('date');

      if (error) throw error;
      if (!shifts || shifts.length === 0) {
        UI.hideLoading();
        UI.toast('Žádné nadcházející potvrzené směny k odeslání', 'warning');
        return;
      }

      // Seskup podle zaměstnance
      const byEmployee = {};
      for (const s of shifts) {
        if (!s.employees?.email) continue;
        const empId = s.employees.id;
        if (!byEmployee[empId]) {
          byEmployee[empId] = { name: s.employees.name, email: s.employees.email, shifts: [] };
        }
        byEmployee[empId].shifts.push(s);
      }

      const employees = Object.values(byEmployee);
      if (employees.length === 0) {
        UI.hideLoading();
        UI.toast('Žádní zaměstnanci s emailem a nadcházejícími směnami', 'warning');
        return;
      }

      UI.hideLoading();

      // Pošli souhrnný email každému zaměstnanci
      let sent = 0;
      for (const emp of employees) {
        await Notifications.sendShiftSummary(emp.name, emp.email, emp.shifts);
        sent++;
      }

      UI.toast(`✓ Souhrny odeslány ${sent} zaměstnancům`, 'success');
    } catch (e) {
      UI.hideLoading();
      UI.toast('Chyba: ' + e.message, 'error');
    }
  },

  _pickSummaryInterval() {
    return new Promise(resolve => {
      const el = document.createElement('div');
      el.className = 'modal-overlay active';
      el.innerHTML = `
        <div class="modal" style="max-width:340px">
          <div class="modal-header">
            <h2 class="modal-title">📧 Odeslat souhrny směn</h2>
            <button class="btn btn-ghost modal-close">×</button>
          </div>
          <div class="modal-body">
            <p style="color:#374151;margin-bottom:16px">Za jaké období odeslat souhrn zaměstnancům?</p>
            <div style="display:flex;flex-direction:column;gap:10px">
              <button class="btn btn-primary" id="pick-week">📅 Příští týden <small style="opacity:.7">(7 dní)</small></button>
              <button class="btn btn-secondary" id="pick-month">📅 Příští měsíc <small style="opacity:.7">(30 dní)</small></button>
              <button class="btn btn-ghost" id="pick-cancel">Zrušit</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(el);
      el.querySelector('#pick-week').onclick   = () => { el.remove(); resolve('week'); };
      el.querySelector('#pick-month').onclick  = () => { el.remove(); resolve('month'); };
      el.querySelector('#pick-cancel').onclick = () => { el.remove(); resolve(null); };
      el.querySelector('.modal-close').onclick = () => { el.remove(); resolve(null); };
    });
  },

  async toggleConfirmShift(id, currentlyConfirmed, employeeId, dateStr) {
    const newState = !currentlyConfirmed;
    try {
      UI.showLoading(newState ? 'Potvrzuji směnu...' : 'Ruším potvrzení...');
      await Shifts.update(id, { is_confirmed: newState });
      UI.hideLoading();
      UI.toast(newState ? 'Směna potvrzena' : 'Potvrzení zrušeno', newState ? 'success' : 'warning');
      // Individuální email se neposílá — zaměstnanec dostane souhrnný email přes tlačítko "Odeslat souhrny"
      if (employeeId) {
        UI.closeModal();
        this.showEmployeeDetail(employeeId);
      } else if (dateStr) {
        await this.showShifts();
        await this.openDayPanel(dateStr);
      } else {
        UI.closeModal();
        this.showShifts();
      }
    } catch (e) {
      UI.hideLoading();
      UI.toast(`Chyba: ${e.message}`, 'error');
    }
  },

  async deleteShift(id, employeeId, dateStr) {
    // Nejdřív načti data směny (potřebujeme jméno zaměstnance pro dialog)
    const { data: shiftBefore } = await getSupabase()
      .from('shifts').select('is_confirmed, employees(name, email), date, start_time, end_time')
      .eq('id', id).single();

    const empName = shiftBefore?.employees?.name
      ? `<strong>${escapeHtml(shiftBefore.employees.name)}</strong>, `
      : '';
    const dateLabel = shiftBefore?.date
      ? `${UI.formatDate(shiftBefore.date)} ${shiftBefore.start_time}–${shiftBefore.end_time}`
      : '';

    const reasonHTML = `
      <div class="form-stack">
        <p style="color:var(--text-muted);margin-bottom:12px">
          Zrušit směnu: ${empName}${dateLabel}
        </p>
        <div class="form-group">
          <label class="form-label">Důvod zrušení</label>
          <select id="cancel-reason" class="form-control">
            <option value="Nemoc">🤒 Nemoc</option>
            <option value="Osobní důvody">👤 Osobní důvody</option>
            <option value="Změna plánu">📅 Změna plánu</option>
            <option value="">Bez uvedení důvodu</option>
          </select>
        </div>
      </div>
    `;

    const action = await UI.showModal('Zrušit směnu', reasonHTML, [
      { label: '🗑 Smazat směnu', action: 'delete', class: 'btn-primary' },
      { label: 'Zpět', action: 'cancel', class: 'btn-secondary' }
    ]);

    if (action !== 'delete') return;

    const reason = document.getElementById('cancel-reason')?.value || '';

    try {
      UI.showLoading('Mažu směnu...');
      await Shifts.delete(id);
      UI.hideLoading();
      UI.toast('Směna smazána', 'success');

      // Notifikace — pouze pokud byla směna potvrzená a zaměstnanec má email
      if (shiftBefore?.is_confirmed && shiftBefore?.employees?.email) {
        // Nemoc → speciální event
        const event = reason === 'Nemoc' ? 'shift_deleted_illness' : 'shift_deleted';
        Notifications.send(event,
          shiftBefore.employees.name,
          shiftBefore.employees.email,
          {
            date:       Notifications._formatDate(shiftBefore.date),
            start_time: shiftBefore.start_time,
            end_time:   shiftBefore.end_time,
            reason:     reason || 'Bez uvedení důvodu'
          }
        );
      }

      if (employeeId) {
        this.showEmployeeDetail(employeeId);
      } else if (dateStr) {
        await this.showShifts();
        await this.openDayPanel(dateStr);
      } else {
        this.showShifts();
      }
    } catch (e) {
      UI.hideLoading();
      UI.toast(`Chyba: ${e.message}`, 'error');
    }
  },

  // ─── Měsíční přehled ─────────────────────────────────────────

  async showReports() {
    UI.setActiveNav('admin-reports');
    const main = document.getElementById('app-main');
    UI.showLoading('Generuji přehled...');

    try {
      const year  = this.currentYear;
      const month = this.currentMonth;
      const summaries = await Reports.buildMonthReport(year, month);

      const filtered = this.roleFilter === 'all'
        ? summaries
        : summaries.filter(s => s.employee.role === this.roleFilter);

      const totalHours    = filtered.reduce((sum, s) => sum + s.hours_total, 0);
      const totalEarnings = filtered.reduce((sum, s) => sum + s.earnings_total, 0);

      UI.hideLoading();

      main.innerHTML = `
        <div class="page-header">
          <h1>Měsíční přehled</h1>
          <div class="header-controls">
            <select class="form-control form-control-sm" onchange="AdminViews.roleFilter=this.value;AdminViews.showReports()">
              <option value="all"       ${this.roleFilter==='all'       ?'selected':''}>Všichni</option>
              <option value="lifeguard" ${this.roleFilter==='lifeguard' ?'selected':''}>Plavčíci</option>
              <option value="cashier"   ${this.roleFilter==='cashier'   ?'selected':''}>Pokladní</option>
            </select>
            <div class="month-nav">
              <button class="btn btn-ghost" onclick="AdminViews.reportsPrevMonth()">‹</button>
              <span class="month-label">${CZ_MONTHS[month - 1]} ${year}</span>
              <button class="btn btn-ghost" onclick="AdminViews.reportsNextMonth()">›</button>
            </div>
            <button class="btn btn-secondary" onclick="AdminViews.exportCSV()">⬇ CSV</button>
            <button class="btn btn-secondary" onclick="AdminViews.exportXLSX()">⬇ Excel</button>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${filtered.filter(s => s.hours_total > 0).length}</div>
            <div class="stat-label">Zaměstnanců s odprac. hod.</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${totalHours.toFixed(1)}</div>
            <div class="stat-label">Hodin celkem</div>
          </div>
          <div class="stat-card stat-card-total">
            <div class="stat-value">${UI.formatMoney(totalEarnings)}</div>
            <div class="stat-label">Celkové náklady na mzdy</div>
          </div>
        </div>

        <div class="card">
          <div class="table-responsive">
            <table class="data-table data-table-reports">
              <thead>
                <tr>
                  <th>Zaměstnanec</th>
                  <th>Role</th>
                  <th class="text-right">Hod. celkem</th>
                  <th class="text-right">Prac. dny</th>
                  <th class="text-right">Víkend</th>
                  <th class="text-right">Svátky</th>
                  <th class="text-right">Výdělek prac.</th>
                  <th class="text-right">Výdělek víkend</th>
                  <th class="text-right">Výdělek svátky</th>
                  <th class="text-right">Celkem</th>
                  <th class="text-right">K výplatě</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(s => `
                  <tr class="${s.hours_total === 0 ? 'row-zero' : ''}">
                    <td>
                      <div class="emp-cell">
                        ${UI.avatarHTML(s.employee.name, 28)}
                        <span>${escapeHtml(s.employee.name)}</span>
                      </div>
                    </td>
                    <td><span class="badge badge-role-${s.employee.role}">${ROLE_LABELS[s.employee.role]}</span></td>
                    <td class="text-right"><strong>${s.hours_total.toFixed(1)}</strong></td>
                    <td class="text-right">${s.hours_weekday.toFixed(1)}</td>
                    <td class="text-right">${s.hours_weekend.toFixed(1)}</td>
                    <td class="text-right">${s.hours_holiday.toFixed(1)}</td>
                    <td class="text-right">${UI.formatMoney(s.earnings_weekday)}</td>
                    <td class="text-right">${UI.formatMoney(s.earnings_weekend)}</td>
                    <td class="text-right">${UI.formatMoney(s.earnings_holiday)}</td>
                    <td class="text-right"><strong>${UI.formatMoney(s.earnings_total)}</strong></td>
                    <td class="text-right"><strong>${UI.formatMoney(s.amount_to_pay)}</strong></td>
                    <td>
                      <button class="btn btn-sm btn-ghost" onclick="AdminViews.showEmployeeDetail('${s.employee.id}')">Detail</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2"><strong>CELKEM</strong></td>
                  <td class="text-right"><strong>${totalHours.toFixed(1)}</strong></td>
                  <td class="text-right">${filtered.reduce((a,s)=>a+s.hours_weekday,0).toFixed(1)}</td>
                  <td class="text-right">${filtered.reduce((a,s)=>a+s.hours_weekend,0).toFixed(1)}</td>
                  <td class="text-right">${filtered.reduce((a,s)=>a+s.hours_holiday,0).toFixed(1)}</td>
                  <td class="text-right">${UI.formatMoney(filtered.reduce((a,s)=>a+s.earnings_weekday,0))}</td>
                  <td class="text-right">${UI.formatMoney(filtered.reduce((a,s)=>a+s.earnings_weekend,0))}</td>
                  <td class="text-right">${UI.formatMoney(filtered.reduce((a,s)=>a+s.earnings_holiday,0))}</td>
                  <td class="text-right"><strong>${UI.formatMoney(totalEarnings)}</strong></td>
                  <td class="text-right"><strong>${UI.formatMoney(totalEarnings)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;

      this._reportSummaries = filtered;
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
  },

  exportCSV() {
    if (!this._reportSummaries) return;
    Export.summaryToCSV(this._reportSummaries, this.currentYear, this.currentMonth);
  },

  exportXLSX() {
    if (!this._reportSummaries) return;
    Export.summaryToXLSX(this._reportSummaries, this.currentYear, this.currentMonth);
  },

  // ─── Nastavení ───────────────────────────────────────────────

  async showSettings() {
    UI.setActiveNav('admin-settings');
    const main = document.getElementById('app-main');
    UI.showLoading('Načítám nastavení...');

    try {
      const rates = await Rates.getAll();
      UI.hideLoading();

      main.innerHTML = `
        <div class="page-header">
          <h1>Nastavení</h1>
        </div>

        <div class="settings-grid">
          <div class="card">
            <h2 class="card-title">Sazby — Plavčíci (Kč/hod)</h2>
            ${this._rateForm('lifeguard', rates)}
          </div>
          <div class="card">
            <h2 class="card-title">Sazby — Pokladní (Kč/hod)</h2>
            ${this._rateForm('cashier', rates)}
          </div>
        </div>

        <div class="card">
          <h2 class="card-title">Sezóna</h2>
          <p>Systém generuje kalendář od aktuálního data do: <strong>30. září ${new Date().getFullYear()}</strong></p>
          <p class="text-muted">Konec sezóny lze upravit v souboru <code>js/config.js</code> (proměnná <code>SEASON_END</code>).</p>
        </div>

        <div class="card">
          <h2 class="card-title">Databáze</h2>
          <p>Projekt: <code>${SUPABASE_URL}</code></p>
          <p class="text-muted">Pro správu databáze přejdi na <a href="https://supabase.com/dashboard" target="_blank">supabase.com/dashboard</a>.</p>
        </div>
      `;
    } catch (e) {
      UI.hideLoading();
      main.innerHTML = `<div class="error-state">Chyba: ${escapeHtml(e.message)}</div>`;
    }
  },

  _rateForm(role, rates) {
    const r = rates[role] || { weekday: 0, weekend: 0, holiday: 0 };
    return `
      <div class="rate-form" id="rate-form-${role}">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Pracovní den</label>
            <div class="input-unit">
              <input type="number" id="rate-${role}-weekday" class="form-control" value="${r.weekday}" min="0" step="1">
              <span>Kč/h</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Víkend (So+Ne)</label>
            <div class="input-unit">
              <input type="number" id="rate-${role}-weekend" class="form-control" value="${r.weekend}" min="0" step="1">
              <span>Kč/h</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Státní svátek</label>
            <div class="input-unit">
              <input type="number" id="rate-${role}-holiday" class="form-control" value="${r.holiday}" min="0" step="1">
              <span>Kč/h</span>
            </div>
          </div>
        </div>
        <button class="btn btn-primary" onclick="AdminViews.saveRates('${role}')">Uložit sazby</button>
      </div>
    `;
  },

  async saveRates(role) {
    const weekday = parseFloat(document.getElementById(`rate-${role}-weekday`)?.value);
    const weekend = parseFloat(document.getElementById(`rate-${role}-weekend`)?.value);
    const holiday = parseFloat(document.getElementById(`rate-${role}-holiday`)?.value);

    if (isNaN(weekday) || isNaN(weekend) || isNaN(holiday)) {
      UI.toast('Zadej platné hodnoty', 'warning');
      return;
    }

    try {
      UI.showLoading('Ukládám sazby...');
      await Promise.all([
        Rates.update(role, 'weekday', weekday),
        Rates.update(role, 'weekend', weekend),
        Rates.update(role, 'holiday', holiday)
      ]);
      UI.hideLoading();
      UI.toast(`Sazby pro ${ROLE_LABELS[role].toLowerCase()} uloženy`, 'success');
    } catch (e) {
      UI.hideLoading();
      UI.toast(`Chyba: ${e.message}`, 'error');
    }
  }
};
