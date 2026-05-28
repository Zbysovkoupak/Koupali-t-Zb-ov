// =============================================================
// POHLEDY — ZAMĚSTNANECKÁ ČÁST
// =============================================================

const EmployeeViews = {

  currentUser: null,
  currentMonth: new Date().getMonth() + 1,
  currentYear: new Date().getFullYear(),

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
          <span class="nav-user-role">${ROLE_LABELS[this.currentUser.role] || this.currentUser.role}</span>
        </div>
      </div>
      <nav class="nav-links">
        <a class="nav-item" id="nav-emp-dashboard" onclick="EmployeeViews.showDashboard()">🏠 Přehled</a>
        <a class="nav-item" id="nav-emp-availability" onclick="EmployeeViews.showAvailability()">📅 Moje dostupnost</a>
        <a class="nav-item" id="nav-emp-shifts" onclick="EmployeeViews.showMyShifts()">🕐 Moje směny</a>
        <a class="nav-item" id="nav-emp-profile" onclick="EmployeeViews.showProfile()">👤 Můj profil</a>
      </nav>
      <button class="btn btn-ghost nav-logout" onclick="App.logout()">Odhlásit</button>
    `;
  },

  // ─── Dashboard zaměstnance ───────────────────────────────────

  async showDashboard() {
    UI.setActiveNav('emp-dashboard');
    const main = document.getElementById('app-main');
    main.innerHTML = '<div class="loading-placeholder">Načítám...</div>';

    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const [shifts, availability] = await Promise.all([
        Shifts.getByEmployee(this.currentUser.id, year, month),
        Availability.getByEmployee(this.currentUser.id,
          `${year}-${pad2(month)}-01`,
          `${year}-${pad2(month)}-31`)
      ]);

      const upcomingShifts = shifts
        .filter(s => new Date(s.date) >= now)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5);

      // Hodiny za měsíc
      const monthHours = shifts.reduce((sum, s) => sum + parseFloat(s.hours || 0), 0);

      // Dostupnost tento týden
      const weekDays = this._getWeekDays(now);

      main.innerHTML = `
        <div class="page-header">
          <h1>Dobrý den, ${escapeHtml(this.currentUser.name.split(' ')[0])}!</h1>
          <p class="page-subtitle">${CZ_MONTHS[month - 1]} ${year}</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${monthHours.toFixed(1)}</div>
            <div class="stat-label">Hodin tento měsíc</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${shifts.length}</div>
            <div class="stat-label">Směn tento měsíc</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${upcomingShifts.length}</div>
            <div class="stat-label">Nadcházejících směn</div>
          </div>
        </div>

        <div class="dashboard-grid">
          <div class="card">
            <h2 class="card-title">Nadcházející směny</h2>
            ${upcomingShifts.length === 0
              ? UI.emptyState('Žádné nadcházející směny', '🏖️')
              : `<div class="shift-list">${upcomingShifts.map(s => this._shiftRow(s)).join('')}</div>`
            }
          </div>

          <div class="card">
            <h2 class="card-title">Dostupnost tento týden</h2>
            ${this._weekAvailabilityGrid(weekDays, availability)}
            <div class="card-action">
              <button class="btn btn-primary btn-sm" onclick="EmployeeViews.showAvailability()">Upravit dostupnost</button>
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      main.innerHTML = `<div class="error-state">Chyba načítání: ${escapeHtml(e.message)}</div>`;
    }
  },

  _shiftRow(shift) {
    const holidays = getHolidays(new Date(shift.date).getFullYear());
    return `
      <div class="shift-row">
        <div class="shift-date">
          <span class="shift-day-name">${CZ_DAYS_SHORT[new Date(shift.date).getDay()]}</span>
          <span class="shift-day-num">${new Date(shift.date).getDate()}. ${new Date(shift.date).getMonth() + 1}.</span>
        </div>
        <div class="shift-info">
          <span class="shift-time">${shift.start_time} – ${shift.end_time}</span>
          ${UI.dayTypeBadge(shift.day_type, getHolidayName(new Date(shift.date), holidays))}
        </div>
        <div class="shift-hours">${parseFloat(shift.hours)} hod</div>
      </div>
    `;
  },

  _getWeekDays(fromDate) {
    const start = new Date(fromDate);
    const dow = start.getDay();
    const monday = new Date(start);
    monday.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  },

  _weekAvailabilityGrid(weekDays, availability) {
    const avMap = {};
    for (const a of availability) avMap[a.date] = a;

    return `
      <div class="week-grid">
        ${weekDays.map(d => {
          const key = dateKey(d);
          const av = avMap[key];
          return `
            <div class="week-cell" onclick="EmployeeViews.openAvailabilityForm('${key}')">
              <div class="week-day-name">${CZ_DAYS_SHORT[d.getDay()]}</div>
              <div class="week-day-num">${d.getDate()}.</div>
              <div class="week-av">${av ? UI.availabilityBadge(av.status, av.from_time, av.to_time) : '<span class="avail avail-none">–</span>'}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  // ─── Dostupnost ──────────────────────────────────────────────

  async showAvailability() {
    UI.setActiveNav('emp-availability');
    const main = document.getElementById('app-main');
    main.innerHTML = '<div class="loading-placeholder">Načítám...</div>';

    const now = new Date();
    if (!this.avYear)  this.avYear  = now.getFullYear();
    if (!this.avMonth) this.avMonth = now.getMonth() + 1;

    await this._renderAvailabilityMonth();
  },

  async _renderAvailabilityMonth() {
    const main = document.getElementById('app-main');
    UI.showLoading('Načítám dostupnost...');

    try {
      const year  = this.avYear;
      const month = this.avMonth;

      const from = `${year}-${pad2(month)}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const to   = `${year}-${pad2(month)}-${pad2(lastDay)}`;

      const [availability, confirmedShifts] = await Promise.all([
        Availability.getByEmployee(this.currentUser.id, from, to),
        Shifts.getConfirmedForMonth(year, month)
      ]);
      const avMap = {};
      for (const a of availability) avMap[a.date] = a;

      // Index potvrzených směn dle data (pro zobrazení kolegů v kalendáři)
      const confirmedByDate = {};
      for (const cs of confirmedShifts) {
        if (!confirmedByDate[cs.date]) confirmedByDate[cs.date] = [];
        confirmedByDate[cs.date].push(cs);
      }

      const holidays = getHolidays(year);
      const seasonEnd = SEASON_END;

      UI.hideLoading();

      main.innerHTML = `
        <div class="page-header">
          <h1>Moje dostupnost</h1>
          <div class="month-nav">
            <button class="btn btn-ghost" onclick="EmployeeViews.avPrevMonth()">‹</button>
            <span class="month-label">${CZ_MONTHS[month - 1]} ${year}</span>
            <button class="btn btn-ghost" onclick="EmployeeViews.avNextMonth()">›</button>
          </div>
        </div>
        <div class="card">
          <div class="calendar-legend">
            <span class="legend-item"><span class="cal-day-dot weekday"></span> Prac. den</span>
            <span class="legend-item"><span class="cal-day-dot weekend"></span> Víkend</span>
            <span class="legend-item"><span class="cal-day-dot holiday"></span> Svátek</span>
            <span class="legend-item"><span class="cal-name-tag cal-name-confirmed" style="font-size:.7rem">Jméno</span> Potvrzená směna</span>
          </div>
          ${this._renderCalendar(year, month, avMap, holidays, seasonEnd, false, confirmedByDate)}
        </div>
      `;
    } catch (e) {
      UI.hideLoading();
      main.innerHTML = `<div class="error-state">Chyba: ${escapeHtml(e.message)}</div>`;
    }
  },

  avPrevMonth() {
    this.avMonth--;
    if (this.avMonth < 1) { this.avMonth = 12; this.avYear--; }
    this._renderAvailabilityMonth();
  },

  avNextMonth() {
    this.avMonth++;
    if (this.avMonth > 12) { this.avMonth = 1; this.avYear++; }
    this._renderAvailabilityMonth();
  },

  _renderCalendar(year, month, avMap, holidays, seasonEnd, isAdmin, confirmedByDate = {}) {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay  = new Date(year, month, 0);
    const today    = new Date();
    today.setHours(0,0,0,0);

    // Začátek týdne v pondělí
    const startDow = firstDay.getDay();
    const offset   = startDow === 0 ? 6 : startDow - 1;

    let html = `
      <div class="calendar-grid">
        <div class="cal-header">Po</div>
        <div class="cal-header">Út</div>
        <div class="cal-header">St</div>
        <div class="cal-header">Čt</div>
        <div class="cal-header">Pá</div>
        <div class="cal-header cal-header-weekend">So</div>
        <div class="cal-header cal-header-weekend">Ne</div>
    `;

    // Prázdné buňky před prvním dnem
    for (let i = 0; i < offset; i++) {
      html += `<div class="cal-day cal-day-empty"></div>`;
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date    = new Date(year, month - 1, d);
      const key     = dateKey(date);
      const dayType = getDayType(date, holidays);
      const holName = getHolidayName(date, holidays);
      const isPast  = date < today;
      const isBeyondSeason = date > seasonEnd;
      const av      = avMap[key];

      let dayClass = 'cal-day';
      if (dayType === 'holiday')                     dayClass += ' cal-holiday';
      else if (dayType === 'saturday' || dayType === 'sunday') dayClass += ' cal-weekend';
      if (isPast || isBeyondSeason)                  dayClass += ' cal-past';
      if (dateKey(today) === key)                    dayClass += ' cal-today';

      const clickable = !isPast && !isBeyondSeason;
      const onclick   = clickable ? `onclick="EmployeeViews.openAvailabilityForm('${key}')"` : '';

      // Potvrzení kolegové pro tento den
      const dayConfirmed = confirmedByDate[key] || [];
      const confirmedNamesHTML = dayConfirmed.map(cs => {
        const parts = (cs.employees?.name || '?').trim().split(' ');
        const shortName = parts[parts.length - 1]; // křestní jméno
        return `<span class="cal-name-tag cal-name-confirmed">${escapeHtml(shortName)}</span>`;
      }).join('');

      html += `
        <div class="${dayClass}" ${clickable ? 'style="cursor:pointer"' : ''} ${onclick}>
          <div class="cal-day-num">${d}</div>
          ${holName ? `<div class="cal-holiday-name">${escapeHtml(holName)}</div>` : ''}
          <div class="cal-av">${av ? UI.availabilityBadge(av.status, av.from_time, av.to_time) : (clickable ? '<span class="avail avail-none">+ zadat</span>' : '')}</div>
          ${dayConfirmed.length > 0 ? `<div class="cal-names-row">${confirmedNamesHTML}</div>` : ''}
        </div>
      `;
    }

    html += '</div>';
    return html;
  },

  async openAvailabilityForm(dateStr) {
    const date  = new Date(dateStr);
    const label = UI.formatDateLong(dateStr);

    // Načti stávající dostupnost
    let existing = null;
    try {
      const avList = await Availability.getByEmployee(this.currentUser.id, dateStr, dateStr);
      existing = avList[0] || null;
    } catch (e) {}

    const sel = (val, target) => existing?.status === target && val === target ? 'selected' : '';
    const isPartial = existing?.status === 'partial';

    const formHTML = `
      <div class="av-form">
        <p class="av-date-label"><strong>${label}</strong></p>
        <div class="form-group">
          <label class="form-label">Dostupnost</label>
          <div class="radio-group">
            <label class="radio-label ${existing?.status === 'available' ? 'selected' : ''}">
              <input type="radio" name="av-status" value="available" ${existing?.status === 'available' ? 'checked' : ''}> ✓ Můžu
            </label>
            <label class="radio-label ${existing?.status === 'unavailable' ? 'selected' : ''}">
              <input type="radio" name="av-status" value="unavailable" ${existing?.status === 'unavailable' ? 'checked' : ''}> ✕ Nemůžu
            </label>
            <label class="radio-label ${isPartial ? 'selected' : ''}">
              <input type="radio" name="av-status" value="partial" ${isPartial ? 'checked' : ''}> ⏱ Můžu od–do
            </label>
          </div>
        </div>
        <div class="form-group form-time-range" id="av-time-range" style="display:${isPartial ? 'flex' : 'none'}">
          <div>
            <label class="form-label">Od</label>
            <input type="time" id="av-from" class="form-control" value="${existing?.from_time || '09:00'}" min="09:00" max="19:00">
          </div>
          <div>
            <label class="form-label">Do</label>
            <input type="time" id="av-to" class="form-control" value="${existing?.to_time || '17:00'}" min="09:00" max="19:00">
          </div>
        </div>
        <p id="av-error" class="form-error" style="display:none"></p>
      </div>
    `;

    const action = await UI.showModal(`Dostupnost — ${label}`, formHTML, [
      { label: 'Uložit', action: 'save', class: 'btn-primary' },
      { label: 'Zrušit', action: 'cancel', class: 'btn-secondary' }
    ]);

    if (action !== 'save') return;

    const statusEl = document.querySelector('[name="av-status"]:checked');
    if (!statusEl) { UI.toast('Vyber dostupnost', 'warning'); return; }

    const status   = statusEl.value;
    const fromTime = status === 'partial' ? document.getElementById('av-from')?.value : null;
    const toTime   = status === 'partial' ? document.getElementById('av-to')?.value   : null;

    if (status === 'partial' && (!fromTime || !toTime || fromTime >= toTime)) {
      UI.toast('Zadej platný časový rozsah (od musí být před do)', 'error');
      return;
    }
    if (status === 'partial') {
      if (fromTime < '09:00' || toTime > '19:00') {
        UI.toast('Dostupnost musí být v rámci otevírací doby (09:00–19:00)', 'error');
        return;
      }
      if (this.currentUser?.is_minor) {
        const [fh, fm] = fromTime.split(':').map(Number);
        const [th, tm] = toTime.split(':').map(Number);
        const totalMinutes = (th * 60 + tm) - (fh * 60 + fm);
        if (totalMinutes > 8 * 60) {
          UI.toast('Mladiství mohou být k dispozici nejvýše 8 hodin denně', 'error');
          return;
        }
      }
    }

    try {
      UI.showLoading('Ukládám...');
      await Availability.upsert(this.currentUser.id, dateStr, status, fromTime, toTime);
      UI.hideLoading();
      UI.toast('Dostupnost uložena', 'success');
      this._renderAvailabilityMonth();
    } catch (e) {
      UI.hideLoading();
      UI.toast(`Chyba: ${e.message}`, 'error');
    }
  },

  // ─── Moje směny ──────────────────────────────────────────────

  async showMyShifts() {
    UI.setActiveNav('emp-shifts');
    const main = document.getElementById('app-main');

    if (!this.shYear)  this.shYear  = new Date().getFullYear();
    if (!this.shMonth) this.shMonth = new Date().getMonth() + 1;

    await this._renderMyShifts();
  },

  async _renderMyShifts() {
    const main = document.getElementById('app-main');
    UI.showLoading('Načítám směny...');

    try {
      const year  = this.shYear;
      const month = this.shMonth;
      const [shifts, confirmedAll] = await Promise.all([
        Shifts.getByEmployee(this.currentUser.id, year, month),
        Shifts.getConfirmedForMonth(year, month)
      ]);
      const holidays = getHolidays(year);

      // Seskupit potvrzené směny dle data pro rychlé vyhledávání kolegů
      const confirmedByDate = {};
      for (const cs of confirmedAll) {
        if (!confirmedByDate[cs.date]) confirmedByDate[cs.date] = [];
        confirmedByDate[cs.date].push(cs);
      }

      const totalHours = shifts.reduce((sum, s) => sum + parseFloat(s.hours || 0), 0);

      UI.hideLoading();

      main.innerHTML = `
        <div class="page-header">
          <h1>Moje směny</h1>
          <div class="month-nav">
            <button class="btn btn-ghost" onclick="EmployeeViews.shPrevMonth()">‹</button>
            <span class="month-label">${CZ_MONTHS[month - 1]} ${year}</span>
            <button class="btn btn-ghost" onclick="EmployeeViews.shNextMonth()">›</button>
          </div>
        </div>

        <div class="stats-grid stats-grid-small">
          <div class="stat-card">
            <div class="stat-value">${shifts.length}</div>
            <div class="stat-label">Směn</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${totalHours.toFixed(1)}</div>
            <div class="stat-label">Odpracovaných hodin</div>
          </div>
        </div>

        <div class="card">
          ${shifts.length === 0
            ? UI.emptyState('Žádné směny v tomto měsíci', '📅')
            : `
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Den</th>
                    <th>Začátek</th>
                    <th>Konec</th>
                    <th class="text-right">Hodin</th>
                    <th>Stav</th>
                    <th>Kolegové</th>
                  </tr>
                </thead>
                <tbody>
                  ${shifts.map(s => {
                    const d = new Date(s.date);
                    const holName = getHolidayName(d, holidays);
                    // Kolegové = ostatní potvrzené směny ve stejný den (bez mé vlastní)
                    const colleagues = (confirmedByDate[s.date] || [])
                      .filter(cs => cs.employee_id !== this.currentUser.id);
                    const colleagueHTML = colleagues.length > 0
                      ? colleagues.map(cs =>
                          `<span class="colleague-tag">${escapeHtml(cs.employees?.name || '?')} <span class="text-muted">${cs.start_time}–${cs.end_time}</span></span>`
                        ).join('')
                      : '<span class="text-muted">—</span>';
                    return `
                      <tr>
                        <td>${UI.formatDate(s.date)}</td>
                        <td>${CZ_DAYS[d.getDay()]}</td>
                        <td>${s.start_time}</td>
                        <td>${s.end_time}</td>
                        <td class="text-right"><strong>${parseFloat(s.hours)}</strong></td>
                        <td>${s.is_confirmed
                          ? '<span class="badge badge-success">✓ Potvrzeno</span>'
                          : '<span class="badge badge-warning">Čeká na potvrzení</span>'
                        }</td>
                        <td>${s.is_confirmed ? colleagueHTML : '<span class="text-muted">—</span>'}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="4"><strong>Celkem</strong></td>
                    <td class="text-right"><strong>${totalHours.toFixed(1)} hod</strong></td>
                    <td colspan="2"></td>
                  </tr>
                </tfoot>
              </table>
            `
          }
        </div>
      `;
    } catch (e) {
      UI.hideLoading();
      main.innerHTML = `<div class="error-state">Chyba: ${escapeHtml(e.message)}</div>`;
    }
  },

  shPrevMonth() {
    this.shMonth--;
    if (this.shMonth < 1) { this.shMonth = 12; this.shYear--; }
    this._renderMyShifts();
  },

  shNextMonth() {
    this.shMonth++;
    if (this.shMonth > 12) { this.shMonth = 1; this.shYear++; }
    this._renderMyShifts();
  }
  // ─── Profil zaměstnance ──────────────────────────────────────

  async showProfile() {
    UI.setActiveNav('emp-profile');
    document.getElementById('topbar-title').textContent = 'Můj profil';
    const main = document.getElementById('app-main');
    const u = this.currentUser;

    const birthFormatted = u.birth_date
      ? new Date(u.birth_date).toLocaleDateString('cs-CZ')
      : '—';
    const ageInfo = u.birth_date ? (() => {
      const b = new Date(u.birth_date), today = new Date();
      let age = today.getFullYear() - b.getFullYear();
      if (today < new Date(today.getFullYear(), b.getMonth(), b.getDate())) age--;
      return age;
    })() : null;

    main.innerHTML = `
      <div class="page-header">
        <h1>👤 Můj profil</h1>
      </div>

      <div class="card" style="max-width:520px">
        <h2 class="card-title">Osobní údaje</h2>

        <div class="form-group">
          <label class="form-label">Jméno</label>
          <div class="form-static">${escapeHtml(u.name)}</div>
          <small class="form-hint">Jméno může změnit pouze admin.</small>
        </div>

        <div class="form-group">
          <label class="form-label">Uživatelské jméno</label>
          <div class="form-static">@${escapeHtml(u.username || '—')}</div>
        </div>

        <div class="form-group">
          <label class="form-label">E-mail pro notifikace *</label>
          <input type="email" id="prof-email" class="form-control"
            value="${escapeHtml(u.email || '')}" placeholder="tvuj@email.cz">
        </div>

        <div class="form-group">
          <label class="form-label">Datum narození</label>
          <input type="date" id="prof-birth" class="form-control"
            value="${u.birth_date || ''}"
            max="${new Date().toISOString().split('T')[0]}">
          ${ageInfo !== null ? `<small class="form-hint">Věk: <strong>${ageInfo} let</strong>${u.is_minor ? ' — mladistvý 👦' : ' — plnoletý ✅'}</small>` : ''}
        </div>

        <button class="btn btn-primary" onclick="EmployeeViews.saveProfile()">Uložit údaje</button>
      </div>

      <div class="card" style="max-width:520px;margin-top:16px">
        <h2 class="card-title">Změna hesla</h2>

        <div class="form-group">
          <label class="form-label">Nové heslo (min. 6 znaků)</label>
          <input type="password" id="prof-pass1" class="form-control" placeholder="••••••••">
        </div>
        <div class="form-group">
          <label class="form-label">Nové heslo znovu</label>
          <input type="password" id="prof-pass2" class="form-control" placeholder="••••••••"
            onkeydown="if(event.key==='Enter')EmployeeViews.changePassword()">
        </div>
        <p id="prof-pass-error" class="form-error" style="display:none"></p>
        <button class="btn btn-secondary" onclick="EmployeeViews.changePassword()">Změnit heslo</button>
      </div>
    `;
  },

  async saveProfile() {
    const email = document.getElementById('prof-email')?.value.trim();
    const birth = document.getElementById('prof-birth')?.value || null;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      UI.toast('Zadej platnou e-mailovou adresu', 'error'); return;
    }

    // Přepočítej is_minor z data narození
    let isMinor = this.currentUser.is_minor;
    if (birth) {
      const b = new Date(birth), today = new Date();
      let age = today.getFullYear() - b.getFullYear();
      if (today < new Date(today.getFullYear(), b.getMonth(), b.getDate())) age--;
      isMinor = age < 18;
    }

    try {
      UI.showLoading('Ukládám...');
      const updates = { email, is_minor: isMinor };
      if (birth) updates.birth_date = birth;

      const { error } = await getSupabase()
        .from('employees').update(updates).eq('id', this.currentUser.id);
      if (error) throw error;

      // Aktualizuj lokální objekt
      this.currentUser = { ...this.currentUser, email, is_minor: isMinor, birth_date: birth || this.currentUser.birth_date };
      App._currentEmployee = this.currentUser;

      UI.hideLoading();
      UI.toast('Údaje uloženy ✓', 'success');
      await this.showProfile(); // překresli s novými hodnotami
    } catch (e) {
      UI.hideLoading();
      UI.toast('Chyba ukládání: ' + e.message, 'error');
    }
  },

  async changePassword() {
    const pass1 = document.getElementById('prof-pass1')?.value;
    const pass2 = document.getElementById('prof-pass2')?.value;
    const errEl = document.getElementById('prof-pass-error');
    errEl.style.display = 'none';

    if (!pass1 || pass1.length < 6) {
      errEl.textContent = 'Heslo musí mít alespoň 6 znaků';
      errEl.style.display = 'block'; return;
    }
    if (pass1 !== pass2) {
      errEl.textContent = 'Hesla se neshodují';
      errEl.style.display = 'block'; return;
    }

    try {
      UI.showLoading('Měním heslo...');
      const { error } = await getSupabase().auth.updateUser({ password: pass1 });
      if (error) throw error;

      // Ulož nové heslo do tabulky employees pro případ zapomenutí
      await getSupabase().from('employees')
        .update({ stored_password: pass1 })
        .eq('id', this.currentUser.id);

      UI.hideLoading();
      UI.toast('Heslo bylo změněno ✓', 'success');
      document.getElementById('prof-pass1').value = '';
      document.getElementById('prof-pass2').value = '';
    } catch (e) {
      UI.hideLoading();
      UI.toast('Chyba změny hesla: ' + e.message, 'error');
    }
  }

};

// Radio button interaktivita — toggle třídy selected a zobrazení time range
document.addEventListener('change', function(e) {
  if (e.target.matches('[name="av-status"]')) {
    document.querySelectorAll('.radio-label').forEach(l => l.classList.remove('selected'));
    e.target.closest('.radio-label')?.classList.add('selected');
    const timeRange = document.getElementById('av-time-range');
    if (timeRange) timeRange.style.display = e.target.value === 'partial' ? 'flex' : 'none';
  }
});
