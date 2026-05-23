/* ============================================================
   JOSEPHINE LOUNGE — Main JavaScript
   ============================================================ */

(function () {
  'use strict';

  /* ── Navigation: scroll state ──────────────────────────────── */
  const nav = document.getElementById('nav');
  const scrollThreshold = 60;

  function updateNav() {
    if (window.scrollY > scrollThreshold) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  /* ── Mobile menu ───────────────────────────────────────────── */
  const toggle = document.getElementById('navToggle');
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

  toggle.addEventListener('click', () => {
    mobileMenu.classList.contains('open') ? closeMenu() : openMenu();
  });

  mobileLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) closeMenu();
  });

  /* ── Hero slideshow with Ken Burns ─────────────────────────── */
  const slides = document.querySelectorAll('.hero-slide');
  let current = 0;
  const SLIDE_DURATION = 6000;
  const TRANSITION_DURATION = 1200;

  function nextSlide() {
    const prev = current;
    current = (current + 1) % slides.length;

    slides[prev].classList.remove('active');
    slides[prev].style.animation = 'none';

    // Brief pause before applying next Ken Burns
    slides[current].style.animation = 'none';
    slides[current].offsetHeight; // reflow
    slides[current].style.animation = 'kenBurns 7s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards';
    slides[current].classList.add('active');
  }

  if (slides.length > 1) {
    setInterval(nextSlide, SLIDE_DURATION);
  }

  /* ── Scroll reveal (IntersectionObserver) ──────────────────── */
  const revealTargets = document.querySelectorAll(
    '.reveal, .reveal-left, .reveal-right, .reveal-scale'
  );

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    revealTargets.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback: show all immediately
    revealTargets.forEach(el => el.classList.add('visible'));
  }

  /* ── Staggered children delay ──────────────────────────────── */
  document.querySelectorAll('[data-stagger]').forEach(container => {
    const children = container.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    children.forEach((child, i) => {
      child.style.setProperty('--i', i);
      child.style.transitionDelay = `${i * 120}ms`;
    });
  });

  /* ── Subtle parallax on hero ───────────────────────────────── */
  const heroSlides = document.getElementById('heroSlides');
  if (heroSlides && window.matchMedia('(min-width: 769px)').matches) {
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      if (scrolled < window.innerHeight) {
        heroSlides.style.transform = `translateY(${scrolled * 0.25}px)`;
      }
    }, { passive: true });
  }

  /* ── WhatsApp reservation form ─────────────────────────────── */
  const whatsappBtn = document.getElementById('whatsappSubmit');
  if (whatsappBtn) {
    whatsappBtn.addEventListener('click', () => {
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

      const formatted = [
        `*Josephine Lounge Reservation Request*`,
        ``,
        `*Name:* ${name}`,
        `*Phone:* ${phone}`,
        `*Date:* ${date}`,
        guests   ? `*Party Size:* ${guests}`   : '',
        occasion ? `*Occasion:* ${occasion}`   : '',
        notes    ? `*Notes:* ${notes}`         : '',
      ].filter(Boolean).join('\n');

      const number  = '16789734441';
      const encoded = encodeURIComponent(formatted);
      window.open(`https://wa.me/${number}?text=${encoded}`, '_blank', 'noopener');
    });
  }

  /* ── Smooth active nav link highlight on scroll ────────────── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            link.style.color = link.getAttribute('href') === `#${id}`
              ? 'var(--gold)'
              : '';
          });
        }
      });
    },
    { rootMargin: '-40% 0px -55% 0px' }
  );

  sections.forEach(s => sectionObserver.observe(s));

  /* ── Wave bar animation randomisation ─────────────────────── */
  document.querySelectorAll('.wave-bar').forEach(bar => {
    const duration = 1.2 + Math.random() * 0.8;
    const delay    = Math.random() * 0.6;
    bar.style.animationDuration = `${duration}s`;
    bar.style.animationDelay    = `${delay}s`;
  });

  /* ── Background audio — autoplay on load ──────────────────── */
  const audio = document.getElementById('bgAudio');

  if (audio) {
    audio.volume = 0.35;

    audio.play().catch(() => {
      /* Browser blocked autoplay — start on first user interaction */
      const startOnInteraction = () => {
        audio.play();
        document.removeEventListener('click',      startOnInteraction);
        document.removeEventListener('touchstart', startOnInteraction);
        document.removeEventListener('keydown',    startOnInteraction);
      };
      document.addEventListener('click',      startOnInteraction, { once: true });
      document.addEventListener('touchstart', startOnInteraction, { once: true });
      document.addEventListener('keydown',    startOnInteraction, { once: true });
    });
  }

})();
