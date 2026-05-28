// =============================================================
// HLAVNÍ APLIKACE — Auth, routing, přihlášení
// =============================================================

// Fake email doména pro Supabase auth (zaměstnanci se přihlašují uživatelským jménem)
const AUTH_DOMAIN = 'example.com';

const App = {

  _session: null,
  _isAdmin: false,
  _currentEmployee: null,

  async init() {
    if (!window.supabase) { console.error('Supabase není načten'); return; }
    UI.showLoading('Načítám aplikaci...');
    Auth.onAuthChange((event, session) => {
      this._session = session;
      if (event === 'SIGNED_OUT') this.showLoginScreen();
    });
    const session = await Auth.getSession();
    this._session = session;
    UI.hideLoading();
    if (session) await this.onSignedIn(session.user);
    else this.showLoginScreen();
  },

  // ─── Přihlašovací obrazovka ──────────────────────────────────

  async showLoginScreen() {
    this._isAdmin = false;
    this._currentEmployee = null;

    document.getElementById('app').innerHTML = `
      <div class="login-screen">
        <div class="login-box">
          <div class="login-logo">🏊</div>
          <h1 class="login-title">Koupaliště</h1>
          <p class="login-subtitle">Systém správy směn</p>

          <div id="login-tabs" class="login-tabs">
            <button class="login-tab active" id="ltab-employee" onclick="App.switchLoginTab('employee')">Přihlášení</button>
            <button class="login-tab" id="ltab-register" onclick="App.switchLoginTab('register')">Registrace</button>
            <button class="login-tab" id="ltab-admin" onclick="App.switchLoginTab('admin')">Admin</button>
          </div>

          <!-- ── Přihlášení zaměstnance (username + heslo) ── -->
          <div id="login-employee" class="login-form-section">
            <div class="form-group">
              <label class="form-label">Uživatelské jméno</label>
              <input type="text" id="login-username" class="form-control" placeholder="martin_blazek"
                autocomplete="username"
                onkeydown="if(event.key==='Enter')App.loginEmployee()">
            </div>
            <div class="form-group">
              <label class="form-label">Heslo</label>
              <input type="password" id="login-password" class="form-control" placeholder="••••••••"
                autocomplete="current-password"
                onkeydown="if(event.key==='Enter')App.loginEmployee()">
            </div>
            <p id="login-emp-error" class="form-error" style="display:none"></p>
            <button class="btn btn-primary btn-full" onclick="App.loginEmployee()">Přihlásit se</button>
            <p style="text-align:center;margin-top:12px">
              <a href="#" style="font-size:.85rem;color:var(--primary)" onclick="App.showForgotPassword(event)">Zapomněl/a jsem heslo</a>
            </p>
          </div>

          <!-- ── Zapomenuté heslo ── -->
          <div id="login-forgot" class="login-form-section" style="display:none">
            <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:12px">
              Zadej své uživatelské jméno — pošleme ti heslo na email, který jsi zadal/a při registraci.
            </p>
            <div class="form-group">
              <label class="form-label">Uživatelské jméno</label>
              <input type="text" id="forgot-username" class="form-control" placeholder="martin_blazek"
                onkeydown="if(event.key==='Enter')App.sendForgotPassword()">
            </div>
            <p id="forgot-error" class="form-error" style="display:none"></p>
            <p id="forgot-success" style="display:none;color:var(--success);font-size:.85rem;margin-bottom:8px"></p>
            <button class="btn btn-primary btn-full" onclick="App.sendForgotPassword()">Poslat heslo emailem</button>
            <p style="text-align:center;margin-top:12px">
              <a href="#" style="font-size:.85rem;color:var(--text-muted)" onclick="App.showForgotPassword(event,true)">← Zpět na přihlášení</a>
            </p>
          </div>

          <!-- ── Registrace nového zaměstnance ── -->
          <div id="login-register" class="login-form-section" style="display:none">
            <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:12px">
              Zadej své jméno přesně tak, jak ho má admin v systému (Příjmení Jméno), zvol si uživatelské jméno a heslo.
            </p>
            <div class="form-group">
              <label class="form-label">Celé jméno (Příjmení Jméno) *</label>
              <input type="text" id="reg-name" class="form-control" placeholder="Blažek Martin" autocomplete="name">
            </div>
            <div class="form-group">
              <label class="form-label">Uživatelské jméno * <small style="color:var(--text-muted)">(tímto se budeš přihlašovat)</small></label>
              <input type="text" id="reg-username" class="form-control" placeholder="martin_blazek"
                autocomplete="username"
                oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9_]/g,'')">
              <small class="form-hint">Pouze malá písmena, číslice a podtržítko, 3–20 znaků.</small>
            </div>
            <div class="form-group">
              <label class="form-label">Datum narození</label>
              <input type="date" id="reg-birth" class="form-control" autocomplete="bday">
            </div>
            <div class="form-group">
              <label class="form-label">E-mail * <small style="color:var(--text-muted)">(sem budou chodit upozornění o směnách)</small></label>
              <input type="email" id="reg-email" class="form-control" placeholder="martin@email.cz" autocomplete="email" required>
            </div>
            <div class="form-group">
              <label class="form-label">Heslo (min. 6 znaků) *</label>
              <input type="password" id="reg-password" class="form-control" placeholder="••••••••" autocomplete="new-password">
            </div>
            <div class="form-group">
              <label class="form-label">Heslo znovu *</label>
              <input type="password" id="reg-password2" class="form-control" placeholder="••••••••"
                onkeydown="if(event.key==='Enter')App.registerEmployee()">
            </div>
            <p id="reg-error" class="form-error" style="display:none"></p>
            <p id="reg-success" style="display:none;color:var(--success);font-size:.85rem;margin-bottom:8px"></p>
            <button class="btn btn-primary btn-full" onclick="App.registerEmployee()">Vytvořit účet</button>
          </div>

          <!-- ── Admin přihlášení (username + heslo) ── -->
          <div id="login-admin" class="login-form-section" style="display:none">
            <div class="form-group">
              <label class="form-label">Uživatelské jméno</label>
              <input type="text" id="admin-username" class="form-control" placeholder="admin_koupaliste"
                autocomplete="username">
            </div>
            <div class="form-group">
              <label class="form-label">Heslo</label>
              <input type="password" id="admin-password" class="form-control" placeholder="••••••••"
                autocomplete="current-password"
                onkeydown="if(event.key==='Enter')App.loginAdmin()">
            </div>
            <p id="login-admin-error" class="form-error" style="display:none"></p>
            <button class="btn btn-primary btn-full" onclick="App.loginAdmin()">Přihlásit se jako admin</button>
          </div>
        </div>
      </div>
    `;
  },

  switchLoginTab(tab) {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`ltab-${tab}`)?.classList.add('active');
    document.getElementById('login-employee').style.display = tab === 'employee' ? 'block' : 'none';
    document.getElementById('login-register').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('login-admin').style.display    = tab === 'admin'    ? 'block' : 'none';
  },

  // ─── Přihlášení zaměstnance (username → fake email) ──────────

  async loginEmployee() {
    const username = document.getElementById('login-username')?.value.trim().toLowerCase();
    const password = document.getElementById('login-password')?.value;
    const errEl    = document.getElementById('login-emp-error');

    if (!username || !password) {
      errEl.textContent = 'Zadej uživatelské jméno a heslo';
      errEl.style.display = 'block'; return;
    }

    try {
      UI.showLoading('Přihlašuji...');
      // Username → interní fake email pro Supabase auth
      const fakeEmail = `${username}@${AUTH_DOMAIN}`;
      const data = await Auth.signIn(fakeEmail, password);
      UI.hideLoading();
      await this.onSignedIn(data.user);
    } catch (e) {
      UI.hideLoading();
      errEl.textContent = 'Nesprávné uživatelské jméno nebo heslo';
      errEl.style.display = 'block';
    }
  },

  // ─── Registrace nového zaměstnance ───────────────────────────

  async registerEmployee() {
    const nameVal  = document.getElementById('reg-name')?.value.trim();
    const username = document.getElementById('reg-username')?.value.trim().toLowerCase();
    const birthVal = document.getElementById('reg-birth')?.value || null;
    const email    = document.getElementById('reg-email')?.value.trim();
    const pass1    = document.getElementById('reg-password')?.value;
    const pass2    = document.getElementById('reg-password2')?.value;
    const errEl    = document.getElementById('reg-error');
    const okEl     = document.getElementById('reg-success');

    errEl.style.display = 'none';
    okEl.style.display  = 'none';

    if (!nameVal || !username || !email || !pass1 || !pass2) {
      errEl.textContent = 'Vyplň povinná pole (jméno, uživatelské jméno, e-mail, heslo)';
      errEl.style.display = 'block'; return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errEl.textContent = 'Zadej platnou e-mailovou adresu';
      errEl.style.display = 'block'; return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      errEl.textContent = 'Uživatelské jméno: 3–20 znaků, jen malá písmena, číslice a podtržítko';
      errEl.style.display = 'block'; return;
    }
    if (pass1.length < 6) {
      errEl.textContent = 'Heslo musí mít alespoň 6 znaků';
      errEl.style.display = 'block'; return;
    }
    if (pass1 !== pass2) {
      errEl.textContent = 'Hesla se neshodují';
      errEl.style.display = 'block'; return;
    }

    try {
      UI.showLoading('Hledám zaměstnance...');
      const { data: matchRows, error: matchErr } = await getSupabase()
        .rpc('find_employee_for_registration', { search_name: nameVal });
      if (matchErr) throw matchErr;
      const match = matchRows?.[0] || null;
      if (!match) {
        UI.hideLoading();
        errEl.textContent = `Zaměstnanec „${nameVal}" nebyl nalezen. Zkontroluj jméno (Příjmení Jméno) nebo kontaktuj admina.`;
        errEl.style.display = 'block'; return;
      }
      if (match.has_account) {
        UI.hideLoading();
        errEl.textContent = 'Tento zaměstnanec již má účet. Přihlaš se přes záložku Přihlášení.';
        errEl.style.display = 'block'; return;
      }

      // Fake email pro Supabase auth — žádný potvrzovací email nebude odesílán
      const fakeEmail = `${username}@${AUTH_DOMAIN}`;

      UI.showLoading('Vytvářím účet...');
      const { data, error } = await getSupabase().auth.signUp({ email: fakeEmail, password: pass1 });
      if (error) {
        if (error.message.toLowerCase().includes('already registered') ||
            error.message.toLowerCase().includes('already been registered')) {
          UI.hideLoading();
          errEl.textContent = `Uživatelské jméno „${username}" je již obsazeno. Zvol jiné.`;
          errEl.style.display = 'block'; return;
        }
        throw error;
      }

      const uid = data.user?.id;
      if (!uid) throw new Error('Registrace se nezdařila');

      // Spočítej is_minor
      let isMinorCalc = match.is_minor || false;
      if (birthVal) {
        const today = new Date(), birth = new Date(birthVal);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        isMinorCalc = age < 18;
      }

      UI.showLoading('Propojuji s účtem...');
      const linkUpdates = { auth_user_id: uid, username, email, stored_password: pass1 };
      if (birthVal) { linkUpdates.birth_date = birthVal; linkUpdates.is_minor = isMinorCalc; }

      const { error: linkErr } = await getSupabase()
        .from('employees').update(linkUpdates).eq('id', match.id);
      if (linkErr) throw linkErr;

      UI.hideLoading();

      // Notifikace — pošli jméno, username i heslo (pro email + Google Sheets)
      Notifications.send('registration', match.name, email, { username, password: pass1 });

      await getSupabase().auth.signOut();

      okEl.innerHTML = `✓ Účet vytvořen pro <strong>${match.name}</strong>!<br>
        Přihlašovací jméno: <strong>${username}</strong><br>
        Nyní se přihlaš v záložce Přihlášení.`;
      okEl.style.display = 'block';

      ['reg-name','reg-username','reg-birth','reg-email','reg-password','reg-password2']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

    } catch (e) {
      UI.hideLoading();
      errEl.textContent = `Chyba: ${e.message}`;
      errEl.style.display = 'block';
    }
  },

  // ─── Zapomenuté heslo ────────────────────────────────────────

  showForgotPassword(e, back = false) {
    if (e) e.preventDefault();
    document.getElementById('login-employee').style.display = back ? 'block' : 'none';
    document.getElementById('login-forgot').style.display   = back ? 'none'  : 'block';
    if (!back) {
      document.getElementById('forgot-error').style.display = 'none';
      document.getElementById('forgot-success').style.display = 'none';
    }
  },

  async sendForgotPassword() {
    const username = document.getElementById('forgot-username')?.value.trim().toLowerCase();
    const errEl  = document.getElementById('forgot-error');
    const okEl   = document.getElementById('forgot-success');
    errEl.style.display = 'none';
    okEl.style.display  = 'none';

    if (!username) {
      errEl.textContent = 'Zadej uživatelské jméno';
      errEl.style.display = 'block'; return;
    }

    try {
      UI.showLoading('Hledám účet...');
      const { data, error } = await getSupabase()
        .from('employees')
        .select('name, email, username, stored_password')
        .eq('username', username)
        .single();
      UI.hideLoading();

      if (error || !data) {
        errEl.textContent = 'Uživatelské jméno nebylo nalezeno';
        errEl.style.display = 'block'; return;
      }
      if (!data.email) {
        errEl.textContent = 'Tento účet nemá uložený email. Kontaktuj admina.';
        errEl.style.display = 'block'; return;
      }
      if (!data.stored_password) {
        errEl.textContent = 'Heslo nelze obnovit automaticky. Kontaktuj admina.';
        errEl.style.display = 'block'; return;
      }

      Notifications.send('forgot_password', data.name, data.email, {
        username: data.username,
        password: data.stored_password
      });

      okEl.textContent = `✓ Heslo bylo odesláno na email ${data.email}`;
      okEl.style.display = 'block';
    } catch (e) {
      UI.hideLoading();
      errEl.textContent = 'Chyba: ' + e.message;
      errEl.style.display = 'block';
    }
  },

  // ─── Admin přihlášení (username → fake email) ────────────────

  _normalizeUsername(u) {
    return u.toLowerCase()
      .replace(/[áà]/g,'a').replace(/[čc]/g,(c)=>c==='č'?'c':c)
      .replace(/[ď]/g,'d').replace(/[éě]/g,(c)=>c==='ě'?'e':'e')
      .replace(/[í]/g,'i').replace(/[ň]/g,'n').replace(/[óö]/g,'o')
      .replace(/[ř]/g,'r').replace(/[š]/g,'s').replace(/[ť]/g,'t')
      .replace(/[úů]/g,'u').replace(/[ý]/g,'y').replace(/[ž]/g,'z')
      .replace(/[^a-z0-9_]/g,'_');
  },

  async loginAdmin() {
    const username = document.getElementById('admin-username')?.value.trim();
    const password = document.getElementById('admin-password')?.value;
    const errEl    = document.getElementById('login-admin-error');

    if (!username || !password) {
      errEl.textContent = 'Zadej uživatelské jméno a heslo';
      errEl.style.display = 'block'; return;
    }
    try {
      UI.showLoading('Přihlašuji admina...');
      const normalized = this._normalizeUsername(username);
      const fakeEmail  = `${normalized}@${AUTH_DOMAIN}`;
      const data = await Auth.signIn(fakeEmail, password);
      UI.hideLoading();
      await this.onSignedIn(data.user);
    } catch (e) {
      UI.hideLoading();
      errEl.textContent = 'Nesprávné přihlašovací údaje';
      errEl.style.display = 'block';
    }
  },

  // ─── Po přihlášení — určení role ─────────────────────────────

  async onSignedIn(user) {
    UI.showLoading('Načítám profil...');
    try {
      const { data: adminCheck } = await getSupabase()
        .from('admins').select('id').eq('auth_user_id', user.id).single();
      if (adminCheck) {
        this._isAdmin = true;
        UI.hideLoading();
        this.showAdminApp();
        return;
      }
      let { data: empData } = await getSupabase()
        .from('employees').select('*').eq('auth_user_id', user.id).eq('is_active', true).single();
      // Auto-přepnutí mladistvý→plnoletý podle data narození
      if (empData?.birth_date) {
        const b = new Date(empData.birth_date), today = new Date();
        let age = today.getFullYear() - b.getFullYear();
        if (today < new Date(today.getFullYear(), b.getMonth(), b.getDate())) age--;
        const shouldBeMinor = age < 18;
        if (empData.is_minor !== shouldBeMinor) {
          await getSupabase().from('employees')
            .update({ is_minor: shouldBeMinor }).eq('id', empData.id);
          empData = { ...empData, is_minor: shouldBeMinor };
        }
      }
      UI.hideLoading();
      if (empData) {
        this._currentEmployee = empData;
        this.showEmployeeApp(empData);
      } else {
        UI.toast('Profil nenalezen. Kontaktuj admina.', 'error');
        await Auth.signOut();
        this.showLoginScreen();
      }
    } catch (e) {
      UI.hideLoading();
      UI.toast(`Chyba přihlášení: ${e.message}`, 'error');
      await Auth.signOut();
      this.showLoginScreen();
    }
  },

  // ─── Aplikační rámec ─────────────────────────────────────────

  showAdminApp() {
    this._renderAppShell();
    AdminViews.init();
  },

  showEmployeeApp(employee) {
    this._renderAppShell();
    EmployeeViews.init(employee);
  },

  _renderAppShell() {
    document.getElementById('app').innerHTML = `
      <div class="app-layout">
        <aside class="app-sidebar" id="app-sidebar">
          <div class="sidebar-brand">
            <span class="brand-icon">🏊</span>
            <span class="brand-name">Koupaliště</span>
          </div>
          <div id="app-nav"></div>
        </aside>
        <div class="sidebar-overlay" id="sidebar-overlay" onclick="App.closeSidebar()"></div>
        <div class="app-content">
          <header class="app-topbar">
            <button class="btn btn-ghost topbar-menu" onclick="App.toggleSidebar()">☰</button>
            <span class="topbar-title" id="topbar-title">Koupaliště</span>
          </header>
          <main class="app-main" id="app-main">
            <div class="loading-placeholder">Načítám...</div>
          </main>
        </div>
      </div>
    `;
  },

  toggleSidebar() {
    document.getElementById('app-sidebar')?.classList.toggle('open');
    document.getElementById('sidebar-overlay')?.classList.toggle('visible');
  },

  closeSidebar() {
    document.getElementById('app-sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('visible');
  },

  async logout() {
    const ok = await UI.confirm('Opravdu se chceš odhlásit?', 'Odhlásit');
    if (!ok) return;
    await Auth.signOut();
    this.showLoginScreen();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
