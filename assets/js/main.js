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
  let lastScroll = 0;
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
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    toggle.classList.remove('active');
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
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

  // Phase 2: Lazy-load hero slides 2-4 background images
  // Browser only fetches slide 1 on parse; others set after load
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

  /* ── Background audio — autoplay on load ──────────────────── */
  const audio = document.getElementById('bgAudio');
  if (audio) {
    audio.volume = 0.35;

    audio.play().catch(() => {
      // Browser blocked autoplay — start on first user gesture
      const startOnInteraction = () => {
        audio.play().catch(() => {});
        ['click', 'touchstart', 'keydown'].forEach(evt =>
          document.removeEventListener(evt, startOnInteraction)
        );
      };
      ['click', 'touchstart', 'keydown'].forEach(evt =>
        document.addEventListener(evt, startOnInteraction, { once: true, passive: true })
      );
    });

    // Pause when hero leaves viewport
    const heroSection = document.getElementById('hero');
    if (heroSection) {
      new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) audio.pause();
        else audio.play().catch(() => {});
      }, { threshold: 0.05 }).observe(heroSection);
    }
  }

  /* ── WhatsApp reservation form ─────────────────────────────── */
  const whatsappBtn = document.getElementById('whatsappSubmit');
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxyCTKaZMis5CexOKllmZpBCcY2fwnkVh6OXQasUfVWoA0ovqCy-Wjr-naXVHCQsaCCIg/exec';

  if (whatsappBtn) {
    whatsappBtn.addEventListener('click', async () => {
      const name     = document.getElementById('res-name').value.trim();
      const phone    = document.getElementById('res-phone').value.trim();
      const date     = document.getElementById('res-date').value;
      const guests   = document.getElementById('res-guests').value;
      const occasion = document.getElementById('res-occasion').value;
      const notes    = document.getElementById('res-notes').value.trim();

      if (!name || !phone || !date) {
        alert('Please fill in your name, phone number, and preferred date.');
        return;
      }

      const originalLabel = whatsappBtn.textContent;
      whatsappBtn.disabled = true;
      whatsappBtn.textContent = 'Sending...';

      const msg = [
        '*Josephine Lounge Reservation Request*', '',
        `*Name:* ${name}`, `*Phone:* ${phone}`, `*Date:* ${date}`,
        guests   ? `*Party Size:* ${guests}`   : '',
        occasion ? `*Occasion:* ${occasion}`   : '',
        notes    ? `*Notes:* ${notes}`         : '',
      ].filter(Boolean).join('\n');

      try {
        const res = await fetch(SCRIPT_URL, {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            type: 'reservation',
            name,
            phone,
            date,
            guests,
            occasion,
            notes,
          }),
        });
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || 'Reservation could not be sent.');
        }

        whatsappBtn.textContent = 'Sent to Josephine';
        const openWhatsApp = confirm('Your reservation was sent to Josephine Lounge. Would you like to continue on WhatsApp?');

        if (openWhatsApp) {
          window.open(`https://wa.me/16789734441?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
        }

        document.getElementById('resForm').reset();
        whatsappBtn.textContent = originalLabel;
      } catch (e) {
        alert('We could not send your reservation yet. Please try again or contact us on WhatsApp.');
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
