// =============================================================
// UI HELPERS — sdílené komponenty a utility
// =============================================================

const UI = {

  // ─── Toast notifikace ────────────────────────────────────────

  toast(message, type = 'info') {
    // type: 'info' | 'success' | 'error' | 'warning'
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${this._toastIcon(type)}</span>
      <span class="toast-message">${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  },

  _toastIcon(type) {
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    return icons[type] || 'ℹ';
  },

  // ─── Modal dialog ────────────────────────────────────────────

  showModal(title, contentHTML, buttons = []) {
    this.closeModal();
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'modal-overlay';

    const btnHTML = buttons.map(btn =>
      `<button class="btn ${btn.class || 'btn-secondary'}" data-action="${btn.action}">${btn.label}</button>`
    ).join('');

    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <div class="modal-body">${contentHTML}</div>
        ${btnHTML ? `<div class="modal-footer">${btnHTML}</div>` : ''}
      </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById('modal-close-btn').onclick = () => this.closeModal();
    overlay.onclick = (e) => { if (e.target === overlay) this.closeModal(); };

    // Napojení tlačítek
    // DŮLEŽITÉ: resolve musí proběhnout PŘED closeModal, aby kód volaný přes await
    // mohl ještě přečíst hodnoty z formuláře (DOM). closeModal se proto odsune do
    // setTimeout (makrotask), zatímco await pokračuje jako mikrotask dřív.
    const result = new Promise(resolve => {
      overlay.querySelectorAll('[data-action]').forEach(btn => {
        btn.onclick = () => {
          const action = btn.dataset.action;
          resolve(action);
          setTimeout(() => this.closeModal(), 0);
        };
      });
    });

    return result;
  },

  closeModal() {
    const existing = document.getElementById('modal-overlay');
    if (existing) existing.remove();
  },

  // ─── Confirm dialog ──────────────────────────────────────────

  async confirm(message, confirmLabel = 'Potvrdit', dangerConfirm = false) {
    const action = await this.showModal('Potvrzení', `<p>${message}</p>`, [
      { label: confirmLabel, action: 'confirm', class: dangerConfirm ? 'btn-danger' : 'btn-primary' },
      { label: 'Zrušit', action: 'cancel', class: 'btn-secondary' }
    ]);
    return action === 'confirm';
  },

  // ─── Loading overlay ─────────────────────────────────────────

  showLoading(text = 'Načítám...') {
    let el = document.getElementById('loading-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'loading-overlay';
      el.className = 'loading-overlay';
      document.body.appendChild(el);
    }
    el.innerHTML = `<div class="spinner"></div><p>${text}</p>`;
    el.style.display = 'flex';
  },

  hideLoading() {
    const el = document.getElementById('loading-overlay');
    if (el) el.style.display = 'none';
  },

  // ─── Formátování ─────────────────────────────────────────────

  formatDate(dateStr) {
    if (!dateStr) return '–';
    const d = new Date(dateStr);
    return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
  },

  formatDateLong(dateStr) {
    if (!dateStr) return '–';
    const d = new Date(dateStr);
    return `${CZ_DAYS[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
  },

  formatMoney(amount) {
    return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(amount);
  },

  formatHours(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h} hod`;
    return `${h} hod ${m} min`;
  },

  // ─── Odznak dne ──────────────────────────────────────────────

  dayTypeBadge(dayType, holidayName) {
    const labels = {
      weekday:  { label: 'Prac. den', cls: 'badge-weekday' },
      saturday: { label: 'Sobota',    cls: 'badge-weekend' },
      sunday:   { label: 'Neděle',    cls: 'badge-weekend' },
      holiday:  { label: holidayName || 'Svátek', cls: 'badge-holiday' }
    };
    const info = labels[dayType] || { label: dayType, cls: '' };
    return `<span class="badge ${info.cls}">${info.label}</span>`;
  },

  // ─── Initials avatar ─────────────────────────────────────────

  initials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  },

  avatarColor(name) {
    // Deterministická barva podle jména
    const colors = ['#4f86c6','#e07b54','#5cb85c','#9b59b6','#e74c3c','#1abc9c','#f39c12','#3498db'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  },

  avatarHTML(name, size = 36) {
    const color = this.avatarColor(name);
    return `<div class="avatar" style="background:${color};width:${size}px;height:${size}px;font-size:${Math.round(size*0.4)}px">${this.initials(name)}</div>`;
  },

  // ─── Stavový odznak dostupnosti ──────────────────────────────

  availabilityBadge(status, fromTime, toTime) {
    if (status === 'available')   return `<span class="avail avail-yes">✓ Můžu</span>`;
    if (status === 'unavailable') return `<span class="avail avail-no">✕ Nemůžu</span>`;
    if (status === 'partial')     return `<span class="avail avail-partial">⏱ ${fromTime}–${toTime}</span>`;
    return `<span class="avail avail-none">–</span>`;
  },

  // ─── Prázdný stav ────────────────────────────────────────────

  emptyState(message, icon = '📋') {
    return `<div class="empty-state"><span class="empty-icon">${icon}</span><p>${message}</p></div>`;
  },

  // ─── Render sekce / navigace ─────────────────────────────────

  setActiveNav(id) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const el = document.getElementById(`nav-${id}`);
    if (el) el.classList.add('active');
  },

  showSection(id) {
    document.querySelectorAll('.app-section').forEach(s => s.style.display = 'none');
    const el = document.getElementById(`section-${id}`);
    if (el) el.style.display = 'block';
    this.setActiveNav(id);
  }
};

// ─── Utility funkce ──────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

// Generuje seznam dnů od startDate do endDate (včetně)
function* dateRange(startDate, endDate) {
  const d = new Date(startDate);
  d.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  while (d <= end) {
    yield new Date(d);
    d.setDate(d.getDate() + 1);
  }
}
