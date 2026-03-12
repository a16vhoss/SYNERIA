/* ═══════════════════════════════════════════════════════════════
   SYNERIA — FLOATING CONSTELLATION NAV
   Shared navigation controller for all pages.

   Usage: Include nav-shared.css + nav-shared.js in every page,
   then call SyneriaNav.init({ mode, active, items }) after DOM ready.
   ═══════════════════════════════════════════════════════════════ */

const SyneriaNav = {
  // Current configuration
  config: null,
  navEl: null,
  blobEl: null,
  mobileEl: null,
  burgerEl: null,
  lastScroll: 0,
  scrollTimer: null,

  /* ── Default nav items for public pages ── */
  publicItems: [
    { label: 'Plataforma', href: '#plataforma', scroll: true },
    { label: 'Empleos', href: '#sectores', scroll: true },
    { label: 'Trabajadores', href: '#como-funciona', scroll: true },
    { label: 'Empleadores', href: '#impacto', scroll: true },
  ],

  /* ── Default nav items for app pages ── */
  appItems: [
    { label: 'Dashboard', href: 'dashboard.html', icon: 'home' },
    { label: 'Empleos', href: 'dashboard.html', icon: 'briefcase' },
    { label: 'Wallet', href: 'wallet.html', icon: 'wallet' },
    { label: 'Perfil', href: 'profile.html', icon: 'user' },
  ],

  /* ── SVG icons ── */
  icons: {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
    employer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
  },

  /**
   * Initialize the floating nav
   * @param {Object} opts
   * @param {string} opts.mode - 'public' | 'app' | 'employer'
   * @param {string} opts.active - Active item label or href
   * @param {Array} opts.items - Override default items
   * @param {boolean} opts.showNotif - Show notification bell
   * @param {boolean} opts.showAvatar - Show user avatar
   * @param {string} opts.ctaText - CTA button text
   * @param {string} opts.ctaHref - CTA button link
   */
  init(opts = {}) {
    this.config = {
      mode: opts.mode || 'public',
      active: opts.active || '',
      items: opts.items || (opts.mode === 'app' ? this.appItems : opts.mode === 'employer' ? this.appItems : this.publicItems),
      showNotif: opts.showNotif !== undefined ? opts.showNotif : (opts.mode !== 'public'),
      showAvatar: opts.showAvatar !== undefined ? opts.showAvatar : (opts.mode !== 'public'),
      ctaText: opts.ctaText || (opts.mode === 'public' ? 'Iniciar Sesion' : ''),
      ctaHref: opts.ctaHref || (opts.mode === 'public' ? 'login.html' : ''),
      ctaI18nKey: opts.ctaI18nKey || '',
      userName: opts.userName || '',
      userInitials: opts.userInitials || '',
      unreadCount: opts.unreadCount || 0,
    };

    this.render();
    this.bindEvents();
    this.updateBlob();

    // Check session for public pages
    if (this.config.mode === 'public' && typeof SyneriaAuth !== 'undefined') {
      this.checkSession();
    }
  },

  render() {
    // Remove existing nav if re-rendering
    const existing = document.querySelector('.syneria-nav');
    if (existing) existing.remove();
    const existingMobile = document.querySelector('.syneria-nav__mobile');
    if (existingMobile) existingMobile.remove();

    const nav = document.createElement('nav');
    nav.className = `syneria-nav ${this.config.mode === 'app' || this.config.mode === 'employer' ? 'app-mode' : ''}`;
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Navegacion principal');

    let html = '';

    // Logo
    const logoHref = this.config.mode === 'public' ? 'syneria.html' : 'dashboard.html';
    html += `<a href="${logoHref}" class="syneria-nav__logo" data-magnetic>Syneria<span>.</span></a>`;
    html += `<div class="syneria-nav__divider"></div>`;

    // Items container with blob
    html += `<div class="syneria-nav__items">`;
    html += `<div class="syneria-nav__blob"></div>`;

    this.config.items.forEach((item, i) => {
      const isActive = this.isActive(item);
      const iconHtml = item.icon ? this.icons[item.icon] || '' : '';
      const scrollAttr = item.scroll ? `data-scroll="${item.href}"` : '';
      const i18nAttr = item.i18nKey ? ` data-i18n="${item.i18nKey}"` : '';
      const label = (item.i18nKey && typeof SyneriaI18n !== 'undefined') ? SyneriaI18n.t(item.i18nKey) : item.label;
      html += `<a href="${item.href}" class="syneria-nav__item${isActive ? ' active' : ''}" data-nav-index="${i}" ${scrollAttr}${i18nAttr}>${iconHtml}${label}</a>`;
    });

    html += `</div>`; // close items

    // Right section
    html += `<div class="syneria-nav__right">`;

    if (this.config.showNotif) {
      html += `<button class="syneria-nav__notif" aria-label="Notificaciones">`;
      html += this.icons.bell;
      if (this.config.unreadCount > 0) html += `<div class="dot"></div>`;
      html += `</button>`;
    }

    if (this.config.showAvatar && this.config.userInitials) {
      html += `<a href="profile.html" class="syneria-nav__avatar" title="${this.config.userName}">${this.config.userInitials}</a>`;
    }

    if (this.config.ctaText) {
      const ctaI18n = this.config.ctaI18nKey || '';
      const ctaLabel = (ctaI18n && typeof SyneriaI18n !== 'undefined') ? SyneriaI18n.t(ctaI18n) : this.config.ctaText;
      const ctaI18nAttr = ctaI18n ? ` data-i18n="${ctaI18n}"` : '';
      html += `<a href="${this.config.ctaHref}" class="syneria-nav__cta" data-magnetic><span${ctaI18nAttr}>${ctaLabel}</span></a>`;
    }

    // Burger for mobile
    html += `<button class="syneria-nav__burger" aria-label="Menu" aria-expanded="false">`;
    html += `<span></span><span></span><span></span>`;
    html += `</button>`;

    html += `</div>`; // close right

    nav.innerHTML = html;
    document.body.prepend(nav);
    this.navEl = nav;
    this.blobEl = nav.querySelector('.syneria-nav__blob');
    this.burgerEl = nav.querySelector('.syneria-nav__burger');

    // Mobile dropdown
    const mobile = document.createElement('div');
    mobile.className = 'syneria-nav__mobile';
    let mobileHtml = '';
    this.config.items.forEach(item => {
      const isActive = this.isActive(item);
      const iconHtml = item.icon ? this.icons[item.icon] || '' : '';
      const scrollAttr = item.scroll ? `data-scroll="${item.href}"` : '';
      const i18nAttr = item.i18nKey ? ` data-i18n="${item.i18nKey}"` : '';
      const label = (item.i18nKey && typeof SyneriaI18n !== 'undefined') ? SyneriaI18n.t(item.i18nKey) : item.label;
      mobileHtml += `<a href="${item.href}" class="syneria-nav__item${isActive ? ' active' : ''}" ${scrollAttr}${i18nAttr}>${iconHtml}${label}</a>`;
    });
    if (this.config.ctaText) {
      const ctaI18n = this.config.ctaI18nKey || '';
      const ctaLabel = (ctaI18n && typeof SyneriaI18n !== 'undefined') ? SyneriaI18n.t(ctaI18n) : this.config.ctaText;
      const ctaI18nAttr = ctaI18n ? ` data-i18n="${ctaI18n}"` : '';
      mobileHtml += `<a href="${this.config.ctaHref}" class="syneria-nav__cta"${ctaI18nAttr}>${ctaLabel}</a>`;
    }
    mobile.innerHTML = mobileHtml;
    document.body.prepend(mobile);
    this.mobileEl = mobile;
  },

  isActive(item) {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    if (this.config.active && item.label === this.config.active) return true;
    if (item.href === page) return true;
    if (item.href === 'dashboard.html' && (page === 'dashboard.html' || page === '')) return true;
    return false;
  },

  bindEvents() {
    // Dock magnification
    const items = this.navEl.querySelectorAll('.syneria-nav__item');
    const itemsContainer = this.navEl.querySelector('.syneria-nav__items');

    itemsContainer.addEventListener('mousemove', (e) => {
      items.forEach(item => {
        const rect = item.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        const dist = Math.abs(e.clientX - center);

        if (dist < 30) {
          item.classList.add('dock-active');
          item.classList.remove('dock-near');
        } else if (dist < 80) {
          item.classList.add('dock-near');
          item.classList.remove('dock-active');
        } else {
          item.classList.remove('dock-near', 'dock-active');
        }
      });
    });

    itemsContainer.addEventListener('mouseleave', () => {
      items.forEach(item => item.classList.remove('dock-near', 'dock-active'));
    });

    // Click handler: update active + blob
    items.forEach(item => {
      item.addEventListener('click', (e) => {
        const scrollTarget = item.dataset.scroll;
        if (scrollTarget) {
          e.preventDefault();
          const section = document.querySelector(scrollTarget);
          if (section) section.scrollIntoView({ behavior: 'smooth' });
          // Close mobile menu
          this.closeMobile();
        }
        items.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this.updateBlob();
      });
    });

    // Mobile menu scroll links
    if (this.mobileEl) {
      this.mobileEl.querySelectorAll('[data-scroll]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const section = document.querySelector(link.dataset.scroll);
          if (section) section.scrollIntoView({ behavior: 'smooth' });
          this.closeMobile();
        });
      });
    }

    // Burger toggle
    if (this.burgerEl) {
      this.burgerEl.addEventListener('click', () => {
        const isOpen = this.burgerEl.classList.toggle('open');
        this.burgerEl.setAttribute('aria-expanded', isOpen);
        if (this.mobileEl) {
          if (isOpen) {
            this.mobileEl.style.display = 'flex';
            requestAnimationFrame(() => this.mobileEl.classList.add('open'));
          } else {
            this.closeMobile();
          }
        }
      });
    }

    // Close mobile on outside click
    document.addEventListener('click', (e) => {
      if (this.mobileEl && this.mobileEl.classList.contains('open')) {
        if (!this.navEl.contains(e.target) && !this.mobileEl.contains(e.target)) {
          this.closeMobile();
        }
      }
    });

    // Scroll: compact mode + hide/show
    let lastY = window.scrollY;
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          const delta = y - lastY;

          // Compact mode after 100px scroll
          if (y > 100) {
            this.navEl.classList.add('compact');
          } else {
            this.navEl.classList.remove('compact');
          }

          // Hide on scroll down (>200px), show on scroll up
          if (y > 200 && delta > 8) {
            this.navEl.classList.add('hidden');
          } else if (delta < -4 || y < 100) {
            this.navEl.classList.remove('hidden');
          }

          lastY = y;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    // Magnetic effect on buttons
    this.navEl.querySelectorAll('[data-magnetic]').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.2;
        const y = (e.clientY - r.top - r.height / 2) * 0.2;
        btn.style.transform = `translate(${x}px, ${y}px)`;
        btn.style.transition = 'none';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
        btn.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1)';
      });
    });

    // Window resize: update blob
    window.addEventListener('resize', () => this.updateBlob());
  },

  closeMobile() {
    if (this.mobileEl) {
      this.mobileEl.classList.remove('open');
      setTimeout(() => { this.mobileEl.style.display = 'none'; }, 300);
    }
    if (this.burgerEl) {
      this.burgerEl.classList.remove('open');
      this.burgerEl.setAttribute('aria-expanded', 'false');
    }
  },

  updateBlob() {
    if (!this.blobEl) return;
    const activeItem = this.navEl.querySelector('.syneria-nav__item.active');
    if (!activeItem) {
      this.blobEl.style.opacity = '0';
      return;
    }
    const containerRect = this.navEl.querySelector('.syneria-nav__items').getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    this.blobEl.style.opacity = '1';
    this.blobEl.style.left = (itemRect.left - containerRect.left) + 'px';
    this.blobEl.style.width = itemRect.width + 'px';
  },

  async checkSession() {
    try {
      const session = await SyneriaAuth.getSession();
      if (session) {
        const user = session.user;
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
        const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const role = user.user_metadata?.role || 'worker';
        const panelHref = role === 'employer' ? 'employer.html' : 'dashboard.html';

        // Update CTA to "Mi Panel"
        const cta = this.navEl.querySelector('.syneria-nav__cta');
        if (cta) {
          cta.href = panelHref;
          const ctaSpan = cta.querySelector('span');
          const panelText = (typeof SyneriaI18n !== 'undefined') ? SyneriaI18n.t('nav_mi_panel') : 'Mi Panel';
          if (ctaSpan) { ctaSpan.textContent = panelText; ctaSpan.setAttribute('data-i18n', 'nav_mi_panel'); }
          else cta.textContent = panelText;
        }

        // Add avatar if not already present
        if (!this.navEl.querySelector('.syneria-nav__avatar')) {
          const rightSection = this.navEl.querySelector('.syneria-nav__right');
          const avatar = document.createElement('a');
          avatar.href = 'profile.html';
          avatar.className = 'syneria-nav__avatar';
          avatar.title = name;
          avatar.textContent = initials;
          rightSection.insertBefore(avatar, rightSection.querySelector('.syneria-nav__burger'));
        }

        // Update mobile CTA too
        if (this.mobileEl) {
          const mobileCta = this.mobileEl.querySelector('.syneria-nav__cta');
          if (mobileCta) {
            mobileCta.href = panelHref;
            mobileCta.textContent = (typeof SyneriaI18n !== 'undefined') ? SyneriaI18n.t('nav_mi_panel') : 'Mi Panel';
          }
        }
      }
    } catch (e) {
      // Not logged in, keep defaults
    }
  },

  /* ── Update user info (call from app pages after auth) ── */
  setUser(name, initials, unreadCount) {
    const avatar = this.navEl?.querySelector('.syneria-nav__avatar');
    if (avatar) {
      avatar.textContent = initials || '';
      avatar.title = name || '';
    }
    const notifDot = this.navEl?.querySelector('.syneria-nav__notif .dot');
    if (notifDot) {
      notifDot.style.display = unreadCount > 0 ? '' : 'none';
    }
  }
};
