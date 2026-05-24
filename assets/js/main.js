/* ============================================================
   JOSEPHINE LOUNGE — Optimized Main JS
   Phases: passive listeners · deferred slides · mobile-safe parallax
   audio on-demand · debounced scroll · lazy wave bars
   ============================================================ */

(function () {
  'use strict';

  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Navigation: debounced scroll state ────────────────────── */
  const nav = document.getElementById('nav');
  let scrollRaf = null;

  function updateNav() {
    nav.classList.toggle('scrolled', window.scrollY > 60);
    scrollRaf = null;
  }

  window.addEventListener('scroll', () => {
    if (!scrollRaf) scrollRaf = requestAnimationFrame(updateNav);
  }, { passive: true });

  updateNav();

  /* ── Mobile menu ───────────────────────────────────────────── */
  const toggle    = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  function openMenu() {
    toggle.classList.add('active');
    mobileMenu.classList.add('open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    toggle.classList.remove('active');
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', () =>
    mobileMenu.classList.contains('open') ? closeMenu() : openMenu()
  );

  mobileLinks.forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) closeMenu();
  });

  /* ── Hero slideshow — pure CSS crossfade, no JS animation ─── */
  const slides = document.querySelectorAll('.hero-slide');
  let current = 0;
  const SLIDE_HOLD = 7000;

  // Lazy-load non-critical hero backgrounds after the first paint.
  function activateHeroSlides() {
    slides.forEach((slide, i) => {
      if (i > 0 && slide.dataset.bg) {
        slide.style.backgroundImage = `url('${slide.dataset.bg}')`;
      }
    });
  }

  function nextSlide() {
    slides[current].classList.remove('active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('active');
  }

  if (slides.length > 1) {
    // Load inactive slides after page is interactive
    if ('requestIdleCallback' in window) {
      requestIdleCallback(activateHeroSlides, { timeout: 2000 });
    } else {
      setTimeout(activateHeroSlides, 1500);
    }
    if (!prefersReducedMotion) {
      setInterval(nextSlide, SLIDE_HOLD);
    }
  }

  /* ── Parallax — desktop only, RAF-throttled ────────────────── */
  const heroSlides = document.getElementById('heroSlides');
  if (heroSlides && !isMobile && !prefersReducedMotion) {
    let parallaxRaf = null;
    window.addEventListener('scroll', () => {
      if (!parallaxRaf) {
        parallaxRaf = requestAnimationFrame(() => {
          const y = window.scrollY;
          if (y < window.innerHeight) {
            heroSlides.style.transform = `translateY(${y * 0.2}px)`;
          }
          parallaxRaf = null;
        });
      }
    }, { passive: true });
  }

  /* ── Scroll reveal (IntersectionObserver) ──────────────────── */
  const revealTargets = document.querySelectorAll(
    '.reveal, .reveal-left, .reveal-right, .reveal-scale'
  );

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    revealTargets.forEach(el => io.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add('visible'));
  }

  /* ── Staggered children delay ──────────────────────────────── */
  document.querySelectorAll('[data-stagger]').forEach(container => {
    container.querySelectorAll('.reveal, .reveal-left, .reveal-right')
      .forEach((child, i) => { child.style.transitionDelay = `${i * 120}ms`; });
  });

  /* ── Active nav highlight on scroll ───────────────────────── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  const sectionIO = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.style.color = link.getAttribute('href') === `#${id}` ? 'var(--gold)' : '';
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => sectionIO.observe(s));

  /* ── Wave bars — randomised only when section enters view ──── */
  const musicSection = document.getElementById('music');
  if (musicSection) {
    const waveIO = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        document.querySelectorAll('.wave-bar').forEach(bar => {
          bar.style.animationDuration = `${1.2 + Math.random() * 0.8}s`;
          bar.style.animationDelay    = `${Math.random() * 0.6}s`;
        });
        waveIO.disconnect();
      }
    }, { threshold: 0.3 });
    waveIO.observe(musicSection);
  }

  /* ── Background audio — starts only after a user gesture ───── */
  const audio = document.getElementById('bgAudio');
  if (audio) {
    audio.volume = 0.35;
    const startOnInteraction = () => {
      audio.play().catch(() => {});
      ['click', 'touchstart', 'keydown'].forEach(evt =>
        document.removeEventListener(evt, startOnInteraction)
      );
    };
    ['click', 'touchstart', 'keydown'].forEach(evt =>
      document.addEventListener(evt, startOnInteraction, { once: true, passive: true })
    );

    // Pause when hero leaves viewport
    const heroSection = document.getElementById('hero');
    if (heroSection) {
      new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) audio.pause();
        else audio.play().catch(() => {});
      }, { threshold: 0.05 }).observe(heroSection);
    }
  }

  /* ── Toast notification system ────────────────────────────── */
  const toastEl = document.getElementById('toast');
  let toastTimer = null;

  function showToast(message, type = 'info', duration = 4000) {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.className = 'toast';                 // reset classes
    toastEl.textContent = message;
    // Force reflow so transition fires even for repeated calls
    void toastEl.offsetWidth;
    toastEl.classList.add(type, 'show');
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, duration);
  }

  /* ── WhatsApp reservation form ─────────────────────────────── */
  const resForm = document.getElementById('resForm');
  const whatsappBtn = document.getElementById('whatsappSubmit');
  const reservationSuccess = document.getElementById('reservationSuccess');
  const reservationWhatsAppLink = document.getElementById('reservationWhatsAppLink');
  const dateInput = document.getElementById('res-date');
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxyCTKaZMis5CexOKllmZpBCcY2fwnkVh6OXQasUfVWoA0ovqCy-Wjr-naXVHCQsaCCIg/exec';

  if (dateInput) {
    dateInput.min = new Date().toISOString().slice(0, 10);
  }

  /* Field-level validation helper */
  function validateField(inputId, errorId, test) {
    const el  = document.getElementById(inputId);
    const err = document.getElementById(errorId);
    const ok  = test(el ? el.value.trim() : '');
    if (el) {
      el.classList.toggle('error', !ok);
      el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    }
    if (err) err.classList.toggle('visible', !ok);
    return ok;
  }

  /* Clear error state on input */
  ['res-name', 'res-phone', 'res-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        el.classList.remove('error');
        el.setAttribute('aria-invalid', 'false');
        const errEl = document.getElementById('err-' + id.replace('res-', ''));
        if (errEl) errEl.classList.remove('visible');
      });
    }
  });

  if (resForm && whatsappBtn) {
    resForm.addEventListener('submit', async e => {
      e.preventDefault();

      /* ── Collect values ── */
      const name     = (document.getElementById('res-name')?.value     || '').trim();
      const phone    = (document.getElementById('res-phone')?.value    || '').trim();
      const date     = (document.getElementById('res-date')?.value     || '');
      const guests   = (document.getElementById('res-guests')?.value   || '');
      const occasion = (document.getElementById('res-occasion')?.value || '');
      const email    = (document.getElementById('res-email')?.value    || '').trim();
      const arrival  = (document.getElementById('res-arrival')?.value  || '');
      const referral = (document.getElementById('res-referral')?.value || '');
      const notes    = (document.getElementById('res-notes')?.value    || '').trim();
      const sourcePage = window.location.href.split('#')[0];

      /* ── Validate required fields ── */
      const okName  = validateField('res-name',  'err-name',  v => v.length >= 2);
      const okPhone = validateField('res-phone', 'err-phone', v => v.replace(/\D/g, '').length >= 10);
      const okDate  = validateField('res-date',  'err-date',  v => v.length > 0 && (!dateInput?.min || v >= dateInput.min));

      if (!okName || !okPhone || !okDate) {
        showToast('Please complete the required fields above.', 'error', 4000);
        // Scroll first error into view
        const firstErr = document.querySelector('.form-input.error');
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      /* ── Loading state ── */
      const originalLabel = whatsappBtn.textContent;
      whatsappBtn.disabled = true;
      whatsappBtn.textContent = 'Sending…';
      if (reservationSuccess) reservationSuccess.hidden = true;

      /* ── Build WhatsApp message ── */
      const msg = [
        '*Josephine Lounge Reservation Request*', '',
        `*Name:* ${name}`,
        `*Phone:* ${phone}`,
        `*Date:* ${date}`,
        guests   ? `*Party Size:* ${guests}`       : '',
        arrival  ? `*Arrival:* ${arrival}`         : '',
        occasion ? `*Occasion:* ${occasion}`        : '',
        email    ? `*Email:* ${email}`             : '',
        referral ? `*Heard via:* ${referral}`      : '',
        notes    ? `*Notes:* ${notes}`             : '',
      ].filter(Boolean).join('\n');

      /* ── Submit to CRM (Apps Script / Google Sheets) ── */
      try {
        const res = await fetch(SCRIPT_URL, {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            type: 'reservation',
            name, phone, date, guests, occasion,
            email, arrival, referral, notes,
            sourcePage,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'CRM error');

        /* ── Success ── */
        showToast('Your reservation was received.', 'success', 5000);
        whatsappBtn.textContent = '✦ Reservation Sent';

        if (reservationWhatsAppLink) {
          reservationWhatsAppLink.href = `https://wa.me/16789734441?text=${encodeURIComponent(msg)}`;
        }
        if (reservationSuccess) reservationSuccess.hidden = false;
        resForm.reset();
        setTimeout(() => { whatsappBtn.textContent = originalLabel; }, 1600);

      } catch (err) {
        showToast('We could not send your reservation. Please try again.', 'error', 5000);
        whatsappBtn.textContent = originalLabel;
      } finally {
        whatsappBtn.disabled = false;
      }
    });
  }


  /* ── Hidden admin access (triple-click copyright) ──────── */
  const footerCopy = document.querySelector('.footer-copy');
  if (footerCopy) {
    let clickCount = 0, clickTimer = null;
    footerCopy.addEventListener('click', () => {
      clickCount++;
      if (clickTimer) clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { clickCount = 0; }, 800);
      if (clickCount >= 3) {
        window.location.href = 'admin/login.html';
        clickCount = 0;
      }
    });
  }

})();
