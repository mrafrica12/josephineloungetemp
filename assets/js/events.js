/* ============================================================
   JOSEPHINE LOUNGE — Events Page JS
   Fetches upcoming events from Apps Script and renders cards
   ============================================================ */

(function () {
  'use strict';

  // After deploying Apps Script, set this to your Web App URL
  // Same URL as admin.js — you only need one deployment
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxyCTKaZMis5CexOKllmZpBCcY2fwnkVh6OXQasUfVWoA0ovqCy-Wjr-naXVHCQsaCCIg/exec';

  const grid = document.getElementById('eventsGrid');

  // ── Fetch & render on load ──────────────────────────────────
  loadEvents();

  async function loadEvents() {
    try {
      const res  = await fetch(`${SCRIPT_URL}?action=get_events`);
      const data = await res.json();

      if (!data.success) throw new Error(data.error || 'Failed to load events');

      renderEvents(data.events || []);
    } catch (e) {
      // If script URL not set, render placeholder cards for development
      if (SCRIPT_URL.includes('YOUR_APPS_SCRIPT')) {
        renderPlaceholders();
      } else {
        renderError();
      }
    }
  }

  // ── Render event cards ──────────────────────────────────────
  function renderEvents(events) {
    if (events.length === 0) {
      grid.innerHTML = `
        <div class="events-empty">
          <div class="events-empty-icon">𝄞</div>
          <h3>More nights coming soon</h3>
          <p>Follow us on Instagram @JosephineATL for announcements</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = events.map((ev, i) => buildCard(ev, i)).join('');

    // Animate cards in with IntersectionObserver
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

      document.querySelectorAll('.event-card').forEach(card => io.observe(card));
    } else {
      document.querySelectorAll('.event-card').forEach(c => c.classList.add('visible'));
    }
  }

  // ── Build a single event card ───────────────────────────────
  function buildCard(ev, index) {
    const flyerSection = buildFlyerSection(ev);
    const ribbon       = buildRibbon(ev);
    const dateStr      = formatDate(ev.date);
    const timeStr      = ev.startTime ? `Doors ${ev.startTime} – ${ev.endTime || '02:30'}` : 'Doors 8:00 PM';
    const rsvpMsg      = encodeURIComponent(
      `Hi Josephine Lounge! I'd like to RSVP for *${ev.eventName}* on ${ev.date || dateStr}. Please let me know if tables are available.`
    );
    const delayStyle = `animation-delay:${index * 80}ms`;

    const coverLabel = ev.coverPrice > 0
      ? `<span class="price-tag">Cover <span class="price-amount">$${formatPrice(ev.coverPrice)}</span></span>`
      : `<span class="price-tag free">Cover <span class="price-amount">Free</span></span>`;

    const vipLabel = ev.vipPrice > 0
      ? `<span class="price-tag">VIP from <span class="price-amount">$${formatPrice(ev.vipPrice)}</span></span>`
      : '';

    const descHtml = ev.description
      ? `<p class="event-desc">${esc(ev.description)}</p>`
      : '';

    const flyerLinkHtml = ev.flyerUrl
      ? `<a href="${esc(ev.flyerUrl)}" target="_blank" rel="noopener noreferrer" class="btn-flyer-link" title="View full flyer (PDF)">⤢</a>`
      : '';

    return `
      <article class="event-card" style="${delayStyle}" aria-label="${esc(ev.eventName)}">
        ${flyerSection}
        ${ribbon}
        <div class="event-body">
          <div class="event-meta-row">
            <span class="event-day">${esc(ev.dayOfWeek || getDayFromDate(ev.date))}</span>
            ${dateStr ? `<span class="event-meta-sep" aria-hidden="true"></span><span class="event-date-str">${dateStr}</span>` : ''}
          </div>
          <h2 class="event-name">${esc(ev.eventName)}</h2>
          ${ev.headliner ? `<p class="event-headliner">Headliner: <strong>${esc(ev.headliner)}</strong></p>` : ''}
          ${descHtml}
          <div class="event-pricing">
            ${coverLabel}
            ${vipLabel}
          </div>
          <p class="event-time">${timeStr}</p>
          <div class="event-ctas">
            <a href="https://wa.me/16789734441?text=${rsvpMsg}"
               target="_blank" rel="noopener noreferrer"
               class="btn-rsvp">
              💬 RSVP via WhatsApp
            </a>
            ${flyerLinkHtml}
          </div>
        </div>
      </article>
    `;
  }

  // ── Flyer section (Drive thumbnail or default art) ──────────
  function buildFlyerSection(ev) {
    // Build thumbnail URL from Drive file ID
    const hasFlyer = ev.driveFileId && ev.driveFileId.length > 0;
    const thumbSrc = hasFlyer
      ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(ev.driveFileId)}&sz=w600`
      : (ev.thumbUrl || '');

    const flyerTarget = ev.flyerUrl || '#';

    if (hasFlyer || ev.thumbUrl) {
      return `
        <div class="event-flyer">
          <img
            src="${esc(thumbSrc)}"
            alt="${esc(ev.eventName)} event flyer"
            loading="lazy"
            decoding="async"
            onerror="this.parentElement.innerHTML=buildDefaultFlyer('${esc(ev.eventName)}','${esc(formatDate(ev.date))}')"
          >
          ${ev.flyerUrl ? `
            <div class="flyer-overlay">
              <a href="${esc(flyerTarget)}" target="_blank" rel="noopener noreferrer" class="flyer-view-btn">
                View Flyer
              </a>
            </div>
          ` : ''}
        </div>
      `;
    }

    // No flyer — show default branded card art
    return `
      <div class="event-flyer">
        <div class="event-flyer-default">
          <picture>
            <source srcset="assets/logo/logo.webp" type="image/webp">
            <img src="assets/logo/logo.png" alt="" class="flyer-logo" aria-hidden="true" width="60" height="60">
          </picture>
          <p class="flyer-name">${esc(ev.eventName)}</p>
          <p class="flyer-date">${esc(formatDate(ev.date) || ev.dayOfWeek || '')}</p>
        </div>
      </div>
    `;
  }

  // Called from onerror inline — replaces broken img with default art
  window.buildDefaultFlyer = function (name, dateStr) {
    return `
      <div class="event-flyer-default">
        <picture>
          <source srcset="assets/logo/logo.webp" type="image/webp">
          <img src="assets/logo/logo.png" alt="" class="flyer-logo" aria-hidden="true" width="60" height="60">
        </picture>
        <p class="flyer-name">${esc(name)}</p>
        <p class="flyer-date">${esc(dateStr)}</p>
      </div>
    `;
  };

  // ── Status ribbon ───────────────────────────────────────────
  function buildRibbon(ev) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(ev.date || '');
    const isTonight = !isNaN(eventDate.getTime()) &&
      eventDate.toDateString() === today.toDateString();

    if (isTonight) {
      return '<div class="event-ribbon ribbon-tonight" aria-label="Tonight">Tonight</div>';
    }
    if (ev.status === 'Sold Out') {
      return '<div class="event-ribbon ribbon-sold-out" aria-label="Sold Out">Sold Out</div>';
    }
    if (ev.status === 'Planning') {
      return '<div class="event-ribbon ribbon-planning" aria-label="Coming Soon">Coming Soon</div>';
    }
    return '<div class="event-ribbon ribbon-upcoming" aria-label="Upcoming">Upcoming</div>';
  }

  // ── Development placeholders ────────────────────────────────
  function renderPlaceholders() {
    const sampleEvents = [
      {
        eventName: 'Monarch Saturdays',
        date: getNextWeekend(6), // Saturday
        dayOfWeek: 'Saturday',
        headliner: 'DJ Amara',
        startTime: '20:00', endTime: '02:30',
        coverPrice: 20, vipPrice: 150,
        status: 'Upcoming',
        description: 'Atlanta\'s most electric Saturday night AfroBeat experience.',
        flyerUrl: '', driveFileId: '', thumbUrl: '',
      },
      {
        eventName: 'Soft Life Sunday',
        date: getNextWeekend(0), // Sunday
        dayOfWeek: 'Sunday',
        headliner: 'DJ Kofi',
        startTime: '20:00', endTime: '02:30',
        coverPrice: 15, vipPrice: 120,
        status: 'Upcoming',
        description: 'Unwind in luxury. Afropop, Amapiano and premium bottle service.',
        flyerUrl: '', driveFileId: '', thumbUrl: '',
      },
      {
        eventName: 'World Cup Watch Party',
        date: '2026-06-15',
        dayOfWeek: 'Monday',
        headliner: 'Live Band + DJ',
        startTime: '16:00', endTime: '00:00',
        coverPrice: 10, vipPrice: 100,
        status: 'Planning',
        description: 'Watch the World Cup opener with Atlanta\'s most vibrant crowd. AfroBeat halftime show.',
        flyerUrl: '', driveFileId: '', thumbUrl: '',
      },
    ];
    renderEvents(sampleEvents);
  }

  function renderError() {
    grid.innerHTML = `
      <div class="events-empty">
        <div class="events-empty-icon">⚠</div>
        <h3>Events unavailable</h3>
        <p>Please try again later or contact us via WhatsApp</p>
      </div>
    `;
  }

  // ── Utilities ───────────────────────────────────────────────
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00'); // Force local parse
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function formatPrice(val) {
    const n = parseFloat(val) || 0;
    return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2);
  }

  function getDayFromDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  }

  function getNextWeekend(targetDay) {
    const d = new Date();
    const day = d.getDay();
    const diff = (targetDay - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();
