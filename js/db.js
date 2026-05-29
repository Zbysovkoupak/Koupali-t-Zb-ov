// =============================================================
// DATABÁZOVÁ VRSTVA — Supabase klient
// Všechny CRUD operace přes Supabase REST API
// =============================================================

let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

// ─── AUTENTIZACE ─────────────────────────────────────────────

const Auth = {
  async signIn(email, password) {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    await getSupabase().auth.signOut();
  },

  async getSession() {
    const { data } = await getSupabase().auth.getSession();
    return data.session;
  },

  onAuthChange(callback) {
    return getSupabase().auth.onAuthStateChange(callback);
  }
};

// ─── ZAMĚSTNANCI ─────────────────────────────────────────────

const Employees = {
  async getAll() {
    const { data, error } = await getSupabase()
      .from('employees')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await getSupabase()
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getByRole(role) {
    const { data, error } = await getSupabase()
      .from('employees')
      .select('*')
      .eq('role', role)
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data;
  },

  async create(employee) {
    const { data, error } = await getSupabase()
      .from('employees')
      .insert([employee])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await getSupabase()
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deactivate(id) {
    return this.update(id, { is_active: false });
  },

  // Výpočet věku z data narození
  calcAge(birthDate) {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  },

  isMinorByBirthDate(birthDate) {
    const age = this.calcAge(birthDate);
    return age !== null && age < 18;
  }
};

// ─── DOSTUPNOST ───────────────────────────────────────────────

const Availability = {
  async getByEmployee(employeeId, fromDate, toDate) {
    let query = getSupabase()
      .from('availability')
      .select('*')
      .eq('employee_id', employeeId);
    if (fromDate) query = query.gte('date', fromDate);
    if (toDate)   query = query.lte('date', toDate);
    const { data, error } = await query.order('date');
    if (error) throw error;
    return data;
  },

  async getByDate(date) {
    const { data, error } = await getSupabase()
      .from('availability')
      .select('*, employees(name, role)')
      .eq('date', date);
    if (error) throw error;
    return data;
  },

  async getAllForMonth(year, month) {
    const from = `${year}-${String(month).padStart(2,'0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
    const { data, error } = await getSupabase()
      .from('availability')
      .select('*, employees(id, name, role)')
      .gte('date', from)
      .lte('date', to)
      .order('date');
    if (error) throw error;
    return data;
  },

  async upsert(employeeId, date, status, fromTime, toTime) {
    const record = {
      employee_id: employeeId,
      date,
      status,
      from_time: fromTime || null,
      to_time:   toTime   || null,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await getSupabase()
      .from('availability')
      .upsert([record], { onConflict: 'employee_id,date' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// ─── SMĚNY ───────────────────────────────────────────────────

const Shifts = {
  async getByEmployee(employeeId, year, month) {
    const from = `${year}-${String(month).padStart(2,'0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
    const { data, error } = await getSupabase()
      .from('shifts')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('date', from)
      .lte('date', to)
      .order('date');
    if (error) throw error;
    return data;
  },

  async getAllForMonth(year, month) {
    const from = `${year}-${String(month).padStart(2,'0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
    const { data, error } = await getSupabase()
      .from('shifts')
      .select('*, employees(id, name, role, is_minor, birth_date)')
      .gte('date', from)
      .lte('date', to)
      .order('date');
    if (error) throw error;
    return data;
  },

  async getConfirmedForMonth(year, month) {
    const from = `${year}-${String(month).padStart(2,'0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
    const { data, error } = await getSupabase()
      .from('shifts')
      .select('id, date, start_time, end_time, employee_id, employees(id, name, role)')
      .eq('is_confirmed', true)
      .gte('date', from)
      .lte('date', to)
      .order('start_time');
    if (error) throw error;
    return data;
  },

  async getByDate(date) {
    const { data, error } = await getSupabase()
      .from('shifts')
      .select('*, employees(id, name, role, is_minor)')
      .eq('date', date)
      .order('start_time');
    if (error) throw error;
    return data;
  },

  async create(shift) {
    const { data, error } = await getSupabase()
      .from('shifts')
      .insert([shift])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await getSupabase()
      .from('shifts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await getSupabase()
      .from('shifts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Výpočet hodin ze start/end time string "HH:MM"
  calcHours(startTime, endTime) {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin   = eh * 60 + em;
    return parseFloat(((endMin - startMin) / 60).toFixed(2));
  },

  // Sestaví objekt směny s výpočty (bez uložení)
  buildShift(employeeId, date, startTime, endTime, dayType, rates, role) {
    const hours = this.calcHours(startTime, endTime);
    const rate  = getRateForDayType(dayType, role, rates);
    return {
      employee_id:   employeeId,
      date,
      start_time:    startTime,
      end_time:      endTime,
      hours,
      day_type:      dayType,
      rate_applied:  rate,
      earnings:      parseFloat((hours * rate).toFixed(2))
    };
  }
};

// ─── VÝKAZY PRÁCE (chemici, údržba) ─────────────────────────

const WorkLogs = {
  async getByEmployee(employeeId, fromDate, toDate) {
    let q = getSupabase().from('work_logs').select('*').eq('employee_id', employeeId);
    if (fromDate) q = q.gte('date', fromDate);
    if (toDate)   q = q.lte('date', toDate);
    const { data, error } = await q.order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getAllForMonth(year, month) {
    const from = `${year}-${String(month).padStart(2,'0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
    const { data, error } = await getSupabase()
      .from('work_logs').select('*').gte('date', from).lte('date', to);
    if (error) throw error;
    return data || [];
  },

  async create(log) {
    const { data, error } = await getSupabase()
      .from('work_logs').insert([log]).select().single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await getSupabase().from('work_logs').delete().eq('id', id);
    if (error) throw error;
  }
};

// ─── EXTRA HODINY (admin přidává bonus) ─────────────────────

const ExtraHours = {
  async getByEmployee(employeeId, fromDate, toDate) {
    let q = getSupabase().from('extra_hours').select('*').eq('employee_id', employeeId);
    if (fromDate) q = q.gte('date', fromDate);
    if (toDate)   q = q.lte('date', toDate);
    const { data, error } = await q.order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getAllForMonth(year, month) {
    const from = `${year}-${String(month).padStart(2,'0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
    const { data, error } = await getSupabase()
      .from('extra_hours').select('*').gte('date', from).lte('date', to);
    if (error) throw error;
    return data || [];
  },

  async create(entry) {
    const { data, error } = await getSupabase()
      .from('extra_hours').insert([entry]).select().single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await getSupabase().from('extra_hours').delete().eq('id', id);
    if (error) throw error;
  }
};

// ─── ABSENCE / DOVOLENÁ ──────────────────────────────────────

const Absences = {
  async getByEmployee(employeeId) {
    const { data, error } = await getSupabase()
      .from('absences').select('*').eq('employee_id', employeeId).order('date_from');
    if (error) throw error;
    return data || [];
  },

  async create(entry) {
    const { data, error } = await getSupabase()
      .from('absences').insert([entry]).select().single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await getSupabase().from('absences').delete().eq('id', id);
    if (error) throw error;
  }
};

// ─── LOGY AKTIVIT ────────────────────────────────────────

const ActivityLogs = {
  async log(employeeId, action, detail) {
    try {
      await getSupabase()
        .from('activity_logs')
        .insert([{ employee_id: employeeId, action, detail }]);
    } catch (e) {
      // Logování je neblokující — chybu ignorujeme
      console.warn('ActivityLog chyba:', e.message);
    }
  },

  async getByEmployee(employeeId, limit = 50) {
    const { data, error } = await getSupabase()
      .from('activity_logs')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async getAll(limit = 200) {
    const { data, error } = await getSupabase()
      .from('activity_logs')
      .select('*, employees(name, role)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }
};

// ─── SAZBY ───────────────────────────────────────────────────

const Rates = {
  _cache: null,

  async getAll() {
    if (this._cache) return this._cache;
    const { data, error } = await getSupabase()
      .from('rates')
      .select('*');
    if (error) throw error;
    this._cache = this._toObject(data);
    return this._cache;
  },

  _toObject(rows) {
    // Převede pole řádků na { lifeguard: {weekday, weekend, holiday}, cashier: {...} }
    const result = {
      lifeguard:   { weekday: 120, weekend: 150, holiday: 180 },
      cashier:     { weekday: 110, weekend: 140, holiday: 170 },
      maintenance: { weekday: 130, weekend: 160, holiday: 190 },
      chemist:     { weekday: 130, weekend: 160, holiday: 190 },
      manager:     { weekday: 150, weekend: 180, holiday: 210 }
    };
    for (const row of rows) {
      if (!result[row.role]) result[row.role] = {};
      result[row.role][row.day_type] = row.rate_per_hour;
    }
    return result;
  },

  invalidateCache() {
    this._cache = null;
  },

  async update(role, dayType, ratePerHour) {
    this.invalidateCache();
    const { data, error } = await getSupabase()
      .from('rates')
      .upsert([{ role, day_type: dayType, rate_per_hour: ratePerHour }], {
        onConflict: 'role,day_type'
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// ─── MĚSÍČNÍ SESTAVA ─────────────────────────────────────────

const Reports = {
  // Sestaví měsíční přehled pro jednoho zaměstnance
  buildEmployeeSummary(employee, shifts) {
    const summary = {
      employee,
      hours_weekday: 0,
      hours_weekend: 0,
      hours_holiday: 0,
      hours_total:   0,
      earnings_weekday: 0,
      earnings_weekend: 0,
      earnings_holiday: 0,
      earnings_total:   0,
      amount_to_pay:    0,
      shifts
    };

    for (const s of shifts) {
      const h = parseFloat(s.hours) || 0;
      const e = parseFloat(s.earnings) || 0;
      if (s.day_type === 'holiday') {
        summary.hours_holiday   += h;
        summary.earnings_holiday += e;
      } else if (s.day_type === 'saturday' || s.day_type === 'sunday') {
        summary.hours_weekend    += h;
        summary.earnings_weekend  += e;
      } else {
        summary.hours_weekday    += h;
        summary.earnings_weekday  += e;
      }
    }

    summary.hours_total    = +(summary.hours_weekday + summary.hours_weekend + summary.hours_holiday).toFixed(2);
    summary.earnings_total = +(summary.earnings_weekday + summary.earnings_weekend + summary.earnings_holiday).toFixed(2);
    summary.amount_to_pay  = summary.earnings_total;

    return summary;
  },

  // Sestaví přehled pro všechny zaměstnance za měsíc
  async buildMonthReport(year, month) {
    const [shifts, employees, rates, workLogs, extraHours] = await Promise.all([
      Shifts.getAllForMonth(year, month),
      Employees.getAll(),
      Rates.getAll(),
      WorkLogs.getAllForMonth(year, month),
      ExtraHours.getAllForMonth(year, month)
    ]);

    const shiftsByEmp    = {};
    const workLogsByEmp  = {};
    const extraByEmp     = {};

    for (const s of shifts) {
      if (!shiftsByEmp[s.employee_id]) shiftsByEmp[s.employee_id] = [];
      shiftsByEmp[s.employee_id].push(s);
    }
    for (const l of workLogs) {
      if (!workLogsByEmp[l.employee_id]) workLogsByEmp[l.employee_id] = [];
      workLogsByEmp[l.employee_id].push(l);
    }
    for (const e of extraHours) {
      if (!extraByEmp[e.employee_id]) extraByEmp[e.employee_id] = [];
      extraByEmp[e.employee_id].push(e);
    }

    return employees.map(emp => {
      const summary = this.buildEmployeeSummary(emp, shiftsByEmp[emp.id] || []);

      // Work logs (chemici, údržba — sami zadávají hodiny)
      const empLogs = workLogsByEmp[emp.id] || [];
      const logHours    = empLogs.reduce((s, l) => s + parseFloat(l.hours || 0), 0);
      const logEarnings = empLogs.reduce((s, l) => {
        const rate = parseFloat(l.rate_per_hour) || (rates[emp.role]?.weekday || 0);
        return s + parseFloat(l.hours || 0) * rate;
      }, 0);

      // Extra hodiny (admin přidává bonus)
      const empExtra = extraByEmp[emp.id] || [];
      const extraHrs = empExtra.reduce((s, e) => s + parseFloat(e.hours || 0), 0);
      const extraEarnings = empExtra.reduce((s, e) => {
        const rate = parseFloat(e.rate_per_hour) || (rates[emp.role]?.weekday || 0);
        return s + parseFloat(e.hours || 0) * rate;
      }, 0);

      summary.hours_worklogs    = +logHours.toFixed(2);
      summary.earnings_worklogs = +logEarnings.toFixed(2);
      summary.hours_extra       = +extraHrs.toFixed(2);
      summary.earnings_extra    = +extraEarnings.toFixed(2);
      summary.hours_total       = +(summary.hours_total + logHours + extraHrs).toFixed(2);
      summary.earnings_total    = +(summary.earnings_total + logEarnings + extraEarnings).toFixed(2);
      summary.amount_to_pay     = summary.earnings_total;
      summary.work_logs         = empLogs;
      summary.extra_hours_list  = empExtra;

      return summary;
    });
  }
};
