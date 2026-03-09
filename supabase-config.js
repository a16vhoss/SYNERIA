/* ═══════════════════════════════════════════
   SYNERA — Supabase Configuration
   Shared across all pages
   Falls back to localStorage if Supabase CDN fails
   ═══════════════════════════════════════════ */

const SUPABASE_URL = 'https://ophcddxrcjcntwvhvpuzy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9waGNkZHhyY2pjbnR3aHZwdXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjU1NzIsImV4cCI6MjA4ODYwMTU3Mn0.aPm_enMTEnzomByecAVuZNV-BlH83gjO6lE9UHa7768';

/* ── Try to init Supabase client ── */
const _sb = window.supabase;
let supabase = null;
const SUPABASE_READY = (function() {
  try {
    const fn = _sb?.createClient || _sb?.default?.createClient;
    if (fn) { supabase = fn(SUPABASE_URL, SUPABASE_ANON_KEY); return true; }
  } catch(e) { console.warn('Supabase init failed, using local mode:', e); }
  return false;
})();

/* ═══════════════════════════════════════════
   LOCAL STORAGE FALLBACK HELPERS
   When Supabase isn't available, we store
   everything in localStorage so the app works
   ═══════════════════════════════════════════ */

function _lsGet(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e) { return fallback; } }
function _lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} }
function _uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); }); }

/* ═══ AUTH HELPERS ═══ */
const SyneraAuth = {
  async signUp(email, password, metadata = {}) {
    if (SUPABASE_READY) {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: metadata } });
      if (error) throw error;
      // Store locally for compatibility
      const user = data.user || { id: _uuid(), email, user_metadata: metadata };
      _lsSet('synera_user', { id: user.id, email, name: metadata.full_name || email.split('@')[0], role: metadata.role || 'worker', country: metadata.country || '' });
      return data;
    }
    // Local fallback
    const id = _uuid();
    const user = { id, email, user_metadata: metadata, created_at: new Date().toISOString() };
    const session = { user, access_token: 'local_' + id };
    _lsSet('synera_user', { id, email, name: metadata.full_name || email.split('@')[0], role: metadata.role || 'worker', country: metadata.country || '' });
    _lsSet('synera_session', session);
    // Create local profile
    const profiles = _lsGet('synera_profiles', {});
    profiles[id] = { id, email, full_name: metadata.full_name || '', role: metadata.role || 'worker', country: metadata.country || '', skills: [], languages: [], experience_years: 0, created_at: new Date().toISOString() };
    _lsSet('synera_profiles', profiles);
    // Create local wallet
    const wallets = _lsGet('synera_wallets', {});
    wallets[id] = { user_id: id, balance: 4850, currency: 'USD' };
    _lsSet('synera_wallets', wallets);
    return { user, session };
  },

  async signIn(email, password) {
    if (SUPABASE_READY) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const user = data.user;
      _lsSet('synera_user', { id: user.id, email: user.email, name: user.user_metadata?.full_name || email.split('@')[0], role: user.user_metadata?.role || 'worker' });
      return data;
    }
    // Local fallback — check stored session
    const stored = _lsGet('synera_user', null);
    if (stored && stored.email === email) {
      const session = _lsGet('synera_session', null);
      return { user: { id: stored.id, email, user_metadata: { full_name: stored.name, role: stored.role } }, session };
    }
    // Auto-create on first local login
    const id = _uuid();
    const name = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const user = { id, email, user_metadata: { full_name: name, role: 'worker' } };
    const session = { user, access_token: 'local_' + id };
    _lsSet('synera_user', { id, email, name, role: 'worker' });
    _lsSet('synera_session', session);
    const profiles = _lsGet('synera_profiles', {});
    profiles[id] = { id, email, full_name: name, role: 'worker', skills: [], languages: [], experience_years: 0 };
    _lsSet('synera_profiles', profiles);
    const wallets = _lsGet('synera_wallets', {});
    wallets[id] = { user_id: id, balance: 4850, currency: 'USD' };
    _lsSet('synera_wallets', wallets);
    return { user, session };
  },

  async signOut() {
    if (SUPABASE_READY) { try { await supabase.auth.signOut(); } catch(e) {} }
    localStorage.removeItem('synera_user');
    localStorage.removeItem('synera_session');
    sessionStorage.removeItem('synera_user');
  },

  async getUser() {
    if (SUPABASE_READY) {
      try { const { data: { user } } = await supabase.auth.getUser(); return user; } catch(e) {}
    }
    const stored = _lsGet('synera_user', null);
    if (!stored) return null;
    return { id: stored.id, email: stored.email, user_metadata: { full_name: stored.name, role: stored.role, country: stored.country } };
  },

  async getSession() {
    if (SUPABASE_READY) {
      try { const { data: { session } } = await supabase.auth.getSession(); if (session) return session; } catch(e) {}
    }
    const stored = _lsGet('synera_session', null);
    if (stored) return stored;
    // Check old format
    const user = _lsGet('synera_user', null);
    if (user) return { user: { id: user.id, email: user.email, user_metadata: { full_name: user.name, role: user.role } }, access_token: 'local' };
    return null;
  },

  onAuthStateChange(callback) {
    if (SUPABASE_READY) return supabase.auth.onAuthStateChange(callback);
    return { data: { subscription: { unsubscribe: () => {} } } };
  },

  async requireAuth(redirectTo = 'login.html') {
    const session = await this.getSession();
    if (!session) { window.location.href = redirectTo; return null; }
    return session;
  }
};

/* ═══ PROFILE HELPERS ═══ */
const SyneraProfiles = {
  async get(userId) {
    if (SUPABASE_READY) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (data) return data;
      } catch(e) {}
    }
    const profiles = _lsGet('synera_profiles', {});
    return profiles[userId] || null;
  },

  async upsert(profile) {
    if (SUPABASE_READY) {
      try {
        const { data, error } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' }).select().single();
        if (data) return data;
      } catch(e) {}
    }
    const profiles = _lsGet('synera_profiles', {});
    profiles[profile.id] = { ...profiles[profile.id], ...profile, updated_at: new Date().toISOString() };
    _lsSet('synera_profiles', profiles);
    return profiles[profile.id];
  },

  async getByRole(role) {
    if (SUPABASE_READY) {
      try { const { data } = await supabase.from('profiles').select('*').eq('role', role); return data || []; } catch(e) {}
    }
    return Object.values(_lsGet('synera_profiles', {})).filter(p => p.role === role);
  }
};

/* ═══ JOBS HELPERS ═══ */
const _SEED_JOBS = [
  { id: '11111111-1111-1111-1111-111111111111', title: 'Ayudante de Construccion Senior', company_name: 'Constructora Alpine S.A.', companies: { name: 'Constructora Alpine S.A.', logo_letter: 'C', logo_gradient: 'linear-gradient(135deg,#1e2d5f,#3b9ece)', rating: 4.7, employees_count: 340 }, sector: 'Construccion', country: 'Suiza', city: 'Zurich', salary_display: '$3,200/mes + beneficios', salary_min: 3200, job_type: 'full_time', visa_sponsorship: true, housing_included: true, urgent: true, status: 'active', tags: ['Jornada Completa','Urgente','Visa Sponsorship','Alojamiento Incluido'], description: 'Estamos buscando un Ayudante de Construccion Senior experimentado para unirse a nuestro equipo en Zurich, Suiza.', responsibilities: ['Asistir en la ejecucion de obras','Preparar y mantener el area de trabajo','Operar herramientas de construccion','Colaborar con el equipo de supervision','Cumplir con normativas de seguridad','Participar en capacitaciones'], requirements: ['Minimo 3 anos de experiencia','Certificaciones vigentes','Capacidad fisica','Nivel basico de aleman o ingles','Pasaporte vigente','Disposicion para trabajo multicultural'], benefits: ['Visa Sponsorship','Alojamiento amueblado','Seguro medico suizo','Vuelo de ida','Capacitacion','Salario competitivo'], experience_required: '3+ anos', duration: '12 meses (renovable)', start_date: '2026-04-01', created_at: '2026-03-01' },
  { id: '22222222-2222-2222-2222-222222222222', title: 'Operador de Maquinaria Pesada', company_name: 'Hochtief AG', companies: { name: 'Hochtief AG', logo_letter: 'H', logo_gradient: 'linear-gradient(135deg,#2dd4a8,#3b9ece)', rating: 4.5, employees_count: 520 }, sector: 'Construccion', country: 'Alemania', city: 'Munich', salary_display: '$3,500-4,000/mes', salary_min: 3500, job_type: 'full_time', visa_sponsorship: true, housing_included: true, urgent: false, status: 'active', tags: ['Jornada Completa','Visa Sponsorship','Alojamiento Incluido'], description: 'Buscamos operador experimentado de maquinaria pesada para proyectos de infraestructura en Munich.', responsibilities: ['Operar excavadoras y gruas','Mantenimiento preventivo','Coordinacion con equipo'], requirements: ['5+ anos operando maquinaria','Licencia de operador','Experiencia con CAT o Komatsu'], benefits: ['Seguro medico','Alojamiento','Transporte','Formacion continua'], experience_required: '5+ anos', duration: '18 meses', start_date: '2026-05-01', created_at: '2026-03-02' },
  { id: '33333333-3333-3333-3333-333333333333', title: 'Electricista Industrial', company_name: 'Vinci SA', companies: { name: 'Vinci SA', logo_letter: 'V', logo_gradient: 'linear-gradient(135deg,#7c3aed,#ec4899)', rating: 4.6, employees_count: 890 }, sector: 'Construccion', country: 'Francia', city: 'Lyon', salary_display: '$2,800-3,200/mes', salary_min: 2800, job_type: 'full_time', visa_sponsorship: true, housing_included: false, urgent: false, status: 'active', tags: ['Jornada Completa','Visa Sponsorship'], description: 'Posicion para electricista industrial certificado en proyectos de energia renovable.', responsibilities: ['Instalacion electrica industrial','Diagnostico y reparacion','Lectura de planos'], requirements: ['Certificacion de electricista','4+ anos de experiencia','Conocimiento en energias renovables'], benefits: ['Seguro medico','Bono trimestral','Formacion'], experience_required: '4+ anos', duration: '12 meses', start_date: '2026-04-15', created_at: '2026-03-02' },
  { id: '44444444-4444-4444-4444-444444444444', title: 'Recepcionista de Hotel', company_name: 'Hotel Mediterraneo', companies: { name: 'Hotel Mediterraneo', logo_letter: 'M', logo_gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)', rating: 4.3, employees_count: 180 }, sector: 'Hosteleria', country: 'Espana', city: 'Barcelona', salary_display: '$2,000-2,400/mes', salary_min: 2000, job_type: 'seasonal', visa_sponsorship: true, housing_included: false, urgent: false, status: 'active', tags: ['Temporal','Visa Sponsorship'], description: 'Hotel Mediterraneo busca recepcionista bilingue para su sede en Barcelona.', responsibilities: ['Atencion al cliente','Gestion de reservas','Atencion telefonica'], requirements: ['Espanol e ingles fluido','2+ anos en hosteleria','Sistemas hoteleros'], benefits: ['Comidas durante turno','Descuento alojamiento','Curso de idiomas'], experience_required: '2+ anos', duration: '6 meses', start_date: '2026-06-01', created_at: '2026-03-03' },
  { id: '55555555-5555-5555-5555-555555555555', title: 'Recolector Agricola', company_name: 'Finca Stuttgart', companies: { name: 'Finca Stuttgart', logo_letter: 'F', logo_gradient: 'linear-gradient(135deg,#10b981,#059669)', rating: 4.4, employees_count: 90 }, sector: 'Agricultura', country: 'Alemania', city: 'Stuttgart', salary_display: '$2,800/mes', salary_min: 2800, job_type: 'seasonal', visa_sponsorship: true, housing_included: true, urgent: false, status: 'active', tags: ['Temporal','Alojamiento Incluido','Visa Sponsorship'], description: 'Trabajo de temporada para recoleccion agricola en Finca Stuttgart.', responsibilities: ['Recoleccion de frutas','Clasificacion y empaquetado','Mantenimiento de cultivo'], requirements: ['Experiencia agricola','Capacidad fisica','Disponibilidad horarios variables'], benefits: ['Alojamiento incluido','3 comidas diarias','Seguro de salud','Bono productividad'], experience_required: '1+ ano', duration: '7 meses', start_date: '2026-04-01', created_at: '2026-03-03' },
  { id: '66666666-6666-6666-6666-666666666666', title: 'Tecnico en Automatizacion', company_name: 'TechBau GmbH', companies: { name: 'TechBau GmbH', logo_letter: 'T', logo_gradient: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', rating: 4.8, employees_count: 250 }, sector: 'Tecnologia', country: 'Alemania', city: 'Berlin', salary_display: '$3,800-4,500/mes', salary_min: 3800, job_type: 'full_time', visa_sponsorship: true, housing_included: false, urgent: false, status: 'active', tags: ['Jornada Completa','Visa Sponsorship'], description: 'TechBau GmbH busca tecnico en automatizacion para construccion inteligente.', responsibilities: ['Programacion de PLCs','Instalacion de sensores IoT','Optimizacion de procesos'], requirements: ['Ingenieria electronica','Experiencia Siemens/Allen-Bradley','Ingles avanzado'], benefits: ['Seguro medico premium','Stock options','Formacion','Home office parcial'], experience_required: '3+ anos', duration: '24 meses', start_date: '2026-05-01', created_at: '2026-03-04' },
  { id: '77777777-7777-7777-7777-777777777777', title: 'Procesador de Pescado', company_name: 'Nordic Fish Co.', companies: { name: 'Nordic Fish Co.', logo_letter: 'N', logo_gradient: 'linear-gradient(135deg,#06b6d4,#2dd4a8)', rating: 4.2, employees_count: 150 }, sector: 'Pesca', country: 'Noruega', city: 'Bergen', salary_display: '$3,000/mes', salary_min: 3000, job_type: 'seasonal', visa_sponsorship: true, housing_included: true, urgent: true, status: 'active', tags: ['Temporal','Urgente','Alojamiento Incluido'], description: 'Nordic Fish Co. necesita procesadores de pescado para Bergen, Noruega.', responsibilities: ['Procesamiento y fileteo','Control de calidad','Higiene en planta'], requirements: ['Experiencia en alimentos','Trabajo en frio','Disponibilidad inmediata'], benefits: ['Alojamiento','Uniformes','Transporte','Bono mensual'], experience_required: '1+ ano', duration: '8 meses', start_date: '2026-03-15', created_at: '2026-03-04' },
  { id: '88888888-8888-8888-8888-888888888888', title: 'Soldador Certificado', company_name: 'Skanska AB', companies: { name: 'Skanska AB', logo_letter: 'S', logo_gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)', rating: 4.5, employees_count: 700 }, sector: 'Construccion', country: 'Suecia', city: 'Estocolmo', salary_display: '$3,600-4,000/mes', salary_min: 3600, job_type: 'full_time', visa_sponsorship: true, housing_included: true, urgent: false, status: 'active', tags: ['Jornada Completa','Visa Sponsorship','Alojamiento Incluido'], description: 'Skanska AB busca soldadores certificados para Estocolmo.', responsibilities: ['Soldadura MIG/TIG','Lectura de planos','Inspeccion de calidad'], requirements: ['Certificacion AWS','4+ anos experiencia','Estructuras metalicas'], benefits: ['Seguro completo','Alojamiento','Equipamiento','Vuelo de ida'], experience_required: '4+ anos', duration: '12 meses', start_date: '2026-05-15', created_at: '2026-03-05' }
];

const SyneraJobs = {
  async list(filters = {}) {
    if (SUPABASE_READY) {
      try {
        let q = supabase.from('jobs').select('*, companies(*)');
        if (filters.status) q = q.eq('status', filters.status);
        if (filters.sector) q = q.eq('sector', filters.sector);
        if (filters.country) q = q.eq('country', filters.country);
        if (filters.search) q = q.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        if (filters.employer_id) q = q.eq('employer_id', filters.employer_id);
        q = q.order('created_at', { ascending: false });
        if (filters.limit) q = q.limit(filters.limit);
        const { data } = await q;
        if (data && data.length > 0) return data;
      } catch(e) {}
    }
    let jobs = _SEED_JOBS;
    if (filters.search) { const s = filters.search.toLowerCase(); jobs = jobs.filter(j => j.title.toLowerCase().includes(s) || j.description.toLowerCase().includes(s)); }
    if (filters.sector) jobs = jobs.filter(j => j.sector === filters.sector);
    if (filters.country) jobs = jobs.filter(j => j.country === filters.country);
    if (filters.limit) jobs = jobs.slice(0, filters.limit);
    return jobs;
  },

  async get(jobId) {
    if (SUPABASE_READY) {
      try { const { data } = await supabase.from('jobs').select('*, companies(*)').eq('id', jobId).single(); if (data) return data; } catch(e) {}
    }
    return _SEED_JOBS.find(j => j.id === jobId) || null;
  },

  async create(job) {
    if (SUPABASE_READY) {
      try { const { data } = await supabase.from('jobs').insert(job).select().single(); if (data) return data; } catch(e) {}
    }
    const newJob = { ...job, id: _uuid(), created_at: new Date().toISOString() };
    const jobs = _lsGet('synera_local_jobs', []);
    jobs.push(newJob);
    _lsSet('synera_local_jobs', jobs);
    return newJob;
  },

  async update(jobId, updates) {
    if (SUPABASE_READY) {
      try { const { data } = await supabase.from('jobs').update(updates).eq('id', jobId).select().single(); if (data) return data; } catch(e) {}
    }
    return { id: jobId, ...updates };
  }
};

/* ═══ APPLICATIONS HELPERS ═══ */
const SyneraApplications = {
  async create(application) {
    if (SUPABASE_READY) {
      try { const { data } = await supabase.from('applications').insert(application).select().single(); if (data) return data; } catch(e) {}
    }
    const app = { ...application, id: _uuid(), status: 'pending', created_at: new Date().toISOString() };
    const apps = _lsGet('synera_applications', []);
    apps.push(app);
    _lsSet('synera_applications', apps);
    return app;
  },

  async listByUser(userId) {
    if (SUPABASE_READY) {
      try { const { data } = await supabase.from('applications').select('*, jobs(*, companies(*))').eq('user_id', userId).order('created_at', { ascending: false }); if (data) return data; } catch(e) {}
    }
    return _lsGet('synera_applications', []).filter(a => a.user_id === userId);
  },

  async listByJob(jobId) {
    if (SUPABASE_READY) {
      try { const { data } = await supabase.from('applications').select('*, profiles(*)').eq('job_id', jobId).order('created_at', { ascending: false }); if (data) return data; } catch(e) {}
    }
    return _lsGet('synera_applications', []).filter(a => a.job_id === jobId);
  },

  async updateStatus(applicationId, status) {
    if (SUPABASE_READY) {
      try { const { data } = await supabase.from('applications').update({ status }).eq('id', applicationId).select().single(); if (data) return data; } catch(e) {}
    }
    const apps = _lsGet('synera_applications', []);
    const app = apps.find(a => a.id === applicationId);
    if (app) { app.status = status; _lsSet('synera_applications', apps); }
    return app;
  }
};

/* ═══ TRANSACTIONS HELPERS ═══ */
const _SEED_TX = [
  { id: 't1', type: 'income', amount: 3200, description: 'Pago - Constructora Alpine S.A.', status: 'completed', created_at: '2026-03-01' },
  { id: 't2', type: 'remittance', amount: -500, description: 'Remesa a Maria Ramirez (Mexico)', recipient_name: 'Maria Ramirez', recipient_country: 'Mexico', status: 'completed', created_at: '2026-02-28' },
  { id: 't3', type: 'remittance', amount: -300, description: 'Remesa a familia (Colombia)', recipient_name: 'Familia', recipient_country: 'Colombia', status: 'completed', created_at: '2026-02-25' },
  { id: 't4', type: 'income', amount: 3200, description: 'Pago - Constructora Alpine S.A.', status: 'completed', created_at: '2026-02-01' },
  { id: 't5', type: 'swap', amount: -1000, description: 'Cambio USD → EUR', status: 'completed', created_at: '2026-01-28' },
  { id: 't6', type: 'bonus', amount: 50, description: 'Bono de bienvenida', status: 'completed', created_at: '2026-01-15' }
];

const SyneraTransactions = {
  async list(userId, filters = {}) {
    if (SUPABASE_READY) {
      try {
        let q = supabase.from('transactions').select('*').eq('user_id', userId);
        if (filters.type) q = q.eq('type', filters.type);
        q = q.order('created_at', { ascending: false });
        if (filters.limit) q = q.limit(filters.limit);
        const { data } = await q;
        if (data && data.length > 0) return data;
      } catch(e) {}
    }
    let tx = [..._SEED_TX, ..._lsGet('synera_local_tx', [])];
    if (filters.type) tx = tx.filter(t => t.type === filters.type);
    return tx;
  },

  async create(transaction) {
    if (SUPABASE_READY) {
      try { const { data } = await supabase.from('transactions').insert(transaction).select().single(); if (data) return data; } catch(e) {}
    }
    const tx = { ...transaction, id: _uuid(), created_at: new Date().toISOString() };
    const list = _lsGet('synera_local_tx', []);
    list.unshift(tx);
    _lsSet('synera_local_tx', list);
    return tx;
  },

  async getBalance(userId) {
    if (SUPABASE_READY) {
      try { const { data } = await supabase.from('wallets').select('*').eq('user_id', userId).single(); if (data) return data; } catch(e) {}
    }
    const wallets = _lsGet('synera_wallets', {});
    return wallets[userId] || { user_id: userId, balance: 4850, currency: 'USD' };
  },

  async updateBalance(userId, amount) {
    if (SUPABASE_READY) {
      try { const { data } = await supabase.from('wallets').upsert({ user_id: userId, balance: amount, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select().single(); if (data) return data; } catch(e) {}
    }
    const wallets = _lsGet('synera_wallets', {});
    wallets[userId] = { user_id: userId, balance: amount, currency: 'USD' };
    _lsSet('synera_wallets', wallets);
    return wallets[userId];
  }
};

/* ═══ CONTRACTS HELPERS ═══ */
const _SEED_CONTRACTS = [
  { id: 'c1', employer_name: 'Constructora Alpine S.A.', companies: { name: 'Constructora Alpine S.A.' }, position: 'Ayudante de Construccion', country: 'Suiza', city: 'Zurich', salary: 3200, salary_display: '$3,200/mes', start_date: '2026-01-01', end_date: '2026-12-31', status: 'activo', terms: 'Contrato de 12 meses con posibilidad de renovacion.', benefits: ['Seguro de salud completo','Alojamiento proporcionado','Transporte al trabajo','2 vuelos anuales','Formacion profesional','Bono trimestral'], blockchain_hash: '0x7a3b...f29d4e8c1a6b...83ef' },
  { id: 'c2', employer_name: 'Hotel Mediterraneo', companies: { name: 'Hotel Mediterraneo' }, position: 'Recepcionista', country: 'Espana', city: 'Barcelona', salary: 2200, salary_display: '$2,200/mes', start_date: '2025-06-01', end_date: '2025-12-31', status: 'completado', terms: 'Contrato temporal completado satisfactoriamente.', benefits: ['Seguro basico','Comidas','Descuento alojamiento','Curso idiomas'], blockchain_hash: '0x4c8e...a72b1d9f3e5c...91ab' },
  { id: 'c3', employer_name: 'Finca Stuttgart', companies: { name: 'Finca Stuttgart' }, position: 'Recolector', country: 'Alemania', city: 'Stuttgart', salary: 2800, salary_display: '$2,800/mes', start_date: '2026-04-01', end_date: '2026-10-31', status: 'pendiente', terms: 'Contrato de temporada para recoleccion agricola.', benefits: ['Alojamiento incluido','3 comidas diarias','Seguro completo','Transporte aeropuerto','Bono productividad','Certificado experiencia'], blockchain_hash: '' }
];

const SyneraContracts = {
  async list(userId) {
    if (SUPABASE_READY) {
      try { const { data } = await supabase.from('contracts').select('*, companies(*)').eq('worker_id', userId).order('created_at', { ascending: false }); if (data && data.length > 0) return data; } catch(e) {}
    }
    return _SEED_CONTRACTS;
  },

  async get(contractId) {
    if (SUPABASE_READY) {
      try { const { data } = await supabase.from('contracts').select('*, companies(*)').eq('id', contractId).single(); if (data) return data; } catch(e) {}
    }
    return _SEED_CONTRACTS.find(c => c.id === contractId) || null;
  },

  async sign(contractId) {
    if (SUPABASE_READY) {
      try { const { data } = await supabase.from('contracts').update({ status: 'activo', signed_at: new Date().toISOString() }).eq('id', contractId).select().single(); if (data) return data; } catch(e) {}
    }
    const contract = _SEED_CONTRACTS.find(c => c.id === contractId);
    if (contract) { contract.status = 'activo'; contract.signed_at = new Date().toISOString(); }
    return contract;
  }
};

/* ═══ COMPANIES HELPERS ═══ */
const SyneraCompanies = {
  async get(companyId) {
    if (SUPABASE_READY) { try { const { data } = await supabase.from('companies').select('*').eq('id', companyId).single(); if (data) return data; } catch(e) {} }
    return null;
  },
  async getByOwner(userId) {
    if (SUPABASE_READY) { try { const { data } = await supabase.from('companies').select('*').eq('owner_id', userId).single(); if (data) return data; } catch(e) {} }
    return _lsGet('synera_company_' + userId, null);
  },
  async upsert(company) {
    if (SUPABASE_READY) { try { const { data } = await supabase.from('companies').upsert(company).select().single(); if (data) return data; } catch(e) {} }
    if (company.owner_id) _lsSet('synera_company_' + company.owner_id, company);
    return company;
  }
};

/* ═══ NOTIFICATIONS HELPERS ═══ */
const SyneraNotifications = {
  async list(userId) {
    if (SUPABASE_READY) { try { const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20); if (data) return data; } catch(e) {} }
    return [
      { id: 'n1', title: 'Bienvenido a Synera', message: 'Tu cuenta ha sido creada. Completa tu perfil.', type: 'success', read: false, created_at: new Date().toISOString() },
      { id: 'n2', title: 'Nuevo empleo disponible', message: 'Hay nuevas oportunidades en Alemania que coinciden con tu perfil.', type: 'job', read: false, created_at: new Date().toISOString() }
    ];
  },
  async markRead(notifId) { if (SUPABASE_READY) { try { await supabase.from('notifications').update({ read: true }).eq('id', notifId); } catch(e) {} } },
  async markAllRead(userId) { if (SUPABASE_READY) { try { await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false); } catch(e) {} } },
  async getUnreadCount(userId) {
    if (SUPABASE_READY) { try { const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('read', false); return count || 0; } catch(e) {} }
    return 2;
  }
};

/* ═══ MESSAGES HELPERS ═══ */
const SyneraMessages = {
  async listConversations(userId) {
    if (SUPABASE_READY) { try { const { data } = await supabase.from('messages').select('*, sender:profiles!sender_id(*), receiver:profiles!receiver_id(*)').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: false }); if (data) return data; } catch(e) {} }
    return [];
  },
  async send(message) {
    if (SUPABASE_READY) { try { const { data } = await supabase.from('messages').insert(message).select().single(); if (data) return data; } catch(e) {} }
    return { ...message, id: _uuid(), created_at: new Date().toISOString() };
  }
};

/* ═══ UTILITY: Show toast notification ═══ */
function showToast(message, type = 'success') {
  const existing = document.querySelector('.synera-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'synera-toast';
  const bgColor = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#2dd4a8';
  toast.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:99999;padding:14px 24px;border-radius:12px;background:${bgColor};color:#fff;font-family:'Syne',sans-serif;font-size:14px;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,0.15);transform:translateY(20px);opacity:0;transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1),opacity 0.3s;`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; });
  setTimeout(() => { toast.style.transform = 'translateY(20px)'; toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}
