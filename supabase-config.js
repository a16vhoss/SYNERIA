/* ═══════════════════════════════════════════
   SYNERA — Supabase Configuration
   Shared across all pages
   ═══════════════════════════════════════════ */

const SUPABASE_URL = 'https://ophcddxrcjcntwvhvpuzy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9waGNkZHhyY2pjbnR3aHZwdXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjU1NzIsImV4cCI6MjA4ODYwMTU3Mn0.aPm_enMTEnzomByecAVuZNV-BlH83gjO6lE9UHa7768';

// Initialize Supabase client (loaded via CDN UMD build in each HTML file)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
// <script src="supabase-config.js"></script>

// The UMD build sets `var supabase = {...}` as a global.
// We need to grab createClient before overwriting the variable.
const _sb = window.supabase;
let supabase;
try {
  const createFn = _sb?.createClient || _sb?.default?.createClient;
  if (createFn) {
    supabase = createFn(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.error('Supabase createClient not found. Available keys:', _sb ? Object.keys(_sb) : 'window.supabase is undefined');
    supabase = null;
  }
} catch(e) {
  console.error('Supabase init error:', e);
  supabase = null;
}

/* ═══ AUTH HELPERS ═══ */
const SyneraAuth = {
  async signUp(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    localStorage.removeItem('synera_user');
    sessionStorage.removeItem('synera_user');
  },

  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },

  async requireAuth(redirectTo = 'login.html') {
    const session = await this.getSession();
    if (!session) {
      window.location.href = redirectTo;
      return null;
    }
    return session;
  }
};

/* ═══ PROFILE HELPERS ═══ */
const SyneraProfiles = {
  async get(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async upsert(profile) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profile, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getByRole(role) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', role);
    if (error) throw error;
    return data || [];
  }
};

/* ═══ JOBS HELPERS ═══ */
const SyneraJobs = {
  async list(filters = {}) {
    let query = supabase.from('jobs').select('*, companies(*)');
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.sector) query = query.eq('sector', filters.sector);
    if (filters.country) query = query.eq('country', filters.country);
    if (filters.search) query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    if (filters.employer_id) query = query.eq('employer_id', filters.employer_id);
    query = query.order('created_at', { ascending: false });
    if (filters.limit) query = query.limit(filters.limit);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async get(jobId) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, companies(*)')
      .eq('id', jobId)
      .single();
    if (error) throw error;
    return data;
  },

  async create(job) {
    const { data, error } = await supabase
      .from('jobs')
      .insert(job)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(jobId, updates) {
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', jobId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

/* ═══ APPLICATIONS HELPERS ═══ */
const SyneraApplications = {
  async create(application) {
    const { data, error } = await supabase
      .from('applications')
      .insert(application)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async listByUser(userId) {
    const { data, error } = await supabase
      .from('applications')
      .select('*, jobs(*, companies(*))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async listByJob(jobId) {
    const { data, error } = await supabase
      .from('applications')
      .select('*, profiles(*)')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async updateStatus(applicationId, status) {
    const { data, error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', applicationId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

/* ═══ TRANSACTIONS HELPERS ═══ */
const SyneraTransactions = {
  async list(userId, filters = {}) {
    let query = supabase.from('transactions').select('*').eq('user_id', userId);
    if (filters.type) query = query.eq('type', filters.type);
    query = query.order('created_at', { ascending: false });
    if (filters.limit) query = query.limit(filters.limit);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async create(transaction) {
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getBalance(userId) {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateBalance(userId, amount) {
    const { data, error } = await supabase
      .from('wallets')
      .upsert({ user_id: userId, balance: amount, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

/* ═══ CONTRACTS HELPERS ═══ */
const SyneraContracts = {
  async list(userId) {
    const { data, error } = await supabase
      .from('contracts')
      .select('*, companies(*)')
      .eq('worker_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async get(contractId) {
    const { data, error } = await supabase
      .from('contracts')
      .select('*, companies(*)')
      .eq('id', contractId)
      .single();
    if (error) throw error;
    return data;
  },

  async sign(contractId) {
    const { data, error } = await supabase
      .from('contracts')
      .update({ status: 'activo', signed_at: new Date().toISOString() })
      .eq('id', contractId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

/* ═══ COMPANIES HELPERS ═══ */
const SyneraCompanies = {
  async get(companyId) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();
    if (error) throw error;
    return data;
  },

  async getByOwner(userId) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async upsert(company) {
    const { data, error } = await supabase
      .from('companies')
      .upsert(company)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

/* ═══ NOTIFICATIONS HELPERS ═══ */
const SyneraNotifications = {
  async list(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return data || [];
  },

  async markRead(notifId) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notifId);
  },

  async markAllRead(userId) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
  },

  async getUnreadCount(userId) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) return 0;
    return count || 0;
  }
};

/* ═══ MESSAGES HELPERS ═══ */
const SyneraMessages = {
  async listConversations(userId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(*), receiver:profiles!receiver_id(*)')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async send(message) {
    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

/* ═══ UTILITY: Show toast notification ═══ */
function showToast(message, type = 'success') {
  const existing = document.querySelector('.synera-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'synera-toast';
  const bgColor = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#2dd4a8';
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:99999;
    padding:14px 24px;border-radius:12px;
    background:${bgColor};color:#fff;
    font-family:'Syne',sans-serif;font-size:14px;font-weight:600;
    box-shadow:0 8px 32px rgba(0,0,0,0.15);
    transform:translateY(20px);opacity:0;
    transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1),opacity 0.3s;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  });

  setTimeout(() => {
    toast.style.transform = 'translateY(20px)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
