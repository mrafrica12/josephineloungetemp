/* ============================================================
   JOSEPHINE LOUNGE — Admin Dashboard JS
   Connects to Google Apps Script backend
   ============================================================ */

(function () {
  'use strict';

  // ─── Configuration ─────────────────────────────────────────
  // After deploying Apps Script, replace this URL with your Web App URL
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxyCTKaZMis5CexOKllmZpBCcY2fwnkVh6OXQasUfVWoA0ovqCy-Wjr-naXVHCQsaCCIg/exec';

  // ─── Auth Guard ────────────────────────────────────────────
  const token  = sessionStorage.getItem('jl_admin_token');
  const expiry = sessionStorage.getItem('jl_admin_expiry');

  if (!token || !expiry || new Date() >= new Date(expiry)) {
    window.location.href = 'login.html';
  }

  // ─── State ─────────────────────────────────────────────────
  let currentView = 'overview';
  let currentData = null;

  // ─── Init ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    startClock();
    loadView('overview');
  });

  // ─── Live Clock ────────────────────────────────────────────
  function startClock() {
    const el = document.getElementById('liveTime');
    if (!el) return;
    const tick = () => {
      el.textContent = new Date().toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
      });
    };
    tick();
    setInterval(tick, 30000);
  }

  // ─── Navigation ────────────────────────────────────────────
  window.showView = function (view, btn) {
    currentView = view;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const titles = {
      overview: 'Dashboard', reservations: 'Reservations', events: 'Events',
      customers: 'Customers', staff: 'Staff', ban_list: 'Ban List',
      inventory: 'Inventory', payments: 'Payments', incidents: 'Incidents',
      marketing: 'Marketing', logs: 'Activity Logs',
    };
    document.getElementById('pageTitle').textContent = titles[view] || view;

    closeSidebar();
    loadView(view);
  };

  window.refreshView = function () {
    loadView(currentView);
  };

  // ─── View Loader ───────────────────────────────────────────
  async function loadView(view) {
    showLoading();
    try {
      if (view === 'overview') {
        const data = await api('overview');
        renderOverview(data);
      } else {
        const actionMap = {
          reservations: 'reservations', events: 'events', customers: 'customers',
          staff: 'staff', ban_list: 'ban_list', inventory: 'inventory',
          payments: 'payments', incidents: 'incidents', marketing: 'marketing',
          logs: 'logs',
        };
        const data = await api(actionMap[view] || view);
        renderTable(view, data);
      }
    } catch (e) {
      showError(e.message);
    }
  }

  // ─── API Call ──────────────────────────────────────────────
  async function api(action, method = 'GET', body = null) {
    const url = `${SCRIPT_URL}?action=${action}&token=${encodeURIComponent(token)}`;

    const opts = { method };
    if (body) {
      opts.method = 'POST';
      opts.body = JSON.stringify({ ...body, adminToken: token });
      opts.headers = { 'Content-Type': 'application/json' };
    }

    const res = await fetch(url, opts);
    const data = await res.json();

    if (!data.success) {
      if (data.error === 'Unauthorized') {
        sessionStorage.clear();
        window.location.href = 'login.html';
      }
      throw new Error(data.error || 'Unknown error');
    }

    return data;
  }

  // ─── Overview / Dashboard ──────────────────────────────────
  function renderOverview(data) {
    const s = data.stats || {};
    const recentRes = data.recentReservations || [];
    const lowStock  = data.lowStock || [];

    const html = `
      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Tonight's Bookings</div>
          <div class="stat-value">${s.tonightReservations ?? '—'}</div>
          <div class="stat-sub">Confirmed + Pending</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Awaiting Approval</div>
          <div class="stat-value amber">${s.pendingApprovals ?? '—'}</div>
          <div class="stat-sub">Reservations pending</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Guests</div>
          <div class="stat-value">${s.totalCustomers ?? '—'}</div>
          <div class="stat-sub">All-time customers</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">7-Day Revenue</div>
          <div class="stat-value green">$${formatMoney(s.weekRevenue)}</div>
          <div class="stat-sub">Last 7 days</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Open Incidents</div>
          <div class="stat-value ${s.openIncidents > 0 ? 'red' : ''}">${s.openIncidents ?? 0}</div>
          <div class="stat-sub">Unresolved</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Low Stock Items</div>
          <div class="stat-value ${s.lowStockItems > 0 ? 'amber' : ''}">${s.lowStockItems ?? 0}</div>
          <div class="stat-sub">Needs reorder</div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <div class="action-card" onclick="openModal('paymentModal')">
          <div class="action-icon">💳</div>
          <div class="action-label">Record Payment</div>
        </div>
        <div class="action-card" onclick="openModal('incidentModal')">
          <div class="action-icon">⚠️</div>
          <div class="action-label">Incident Report</div>
        </div>
        <div class="action-card" onclick="showView('reservations', null)">
          <div class="action-icon">📅</div>
          <div class="action-label">Reservations</div>
        </div>
        <div class="action-card" onclick="showView('inventory', null)">
          <div class="action-icon">📦</div>
          <div class="action-label">Inventory</div>
        </div>
        <div class="action-card" onclick="showView('customers', null)">
          <div class="action-icon">👥</div>
          <div class="action-label">Customers</div>
        </div>
        <div class="action-card" onclick="whatsappOpen()">
          <div class="action-icon">💬</div>
          <div class="action-label">WhatsApp</div>
        </div>
      </div>

      <!-- Two-column panels -->
      <div class="panel-grid">

        <!-- Recent Reservations -->
        <div class="panel panel-wide">
          <div class="panel-header">
            <span class="panel-title">Recent Reservations</span>
            <button class="panel-action" onclick="showView('reservations', null)">View All →</button>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Guests</th>
                  <th>Occasion</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${recentRes.length === 0
                  ? `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted)">No reservations yet</td></tr>`
                  : recentRes.map(r => `
                    <tr>
                      <td>
                        <strong>${esc(r.name)}</strong><br>
                        <small style="color:var(--text-muted)">${esc(r.phone)}</small>
                      </td>
                      <td>${esc(r.date)}</td>
                      <td>${r.guests || '—'}</td>
                      <td>${esc(r.occasion) || '—'}</td>
                      <td><span class="badge ${badgeClass(r.status)}">${esc(r.status)}</span></td>
                      <td>
                        <button class="btn btn-sm btn-outline" onclick="whatsappContact('${esc(r.phone)}','${esc(r.name)}')">💬</button>
                      </td>
                    </tr>
                  `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Low Stock -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Low Stock Alert</span>
            <button class="panel-action" onclick="showView('inventory', null)">View All →</button>
          </div>
          <div class="panel-body">
            ${lowStock.length === 0
              ? `<div class="empty-state"><div class="empty-icon">✓</div><p>All stock levels OK</p></div>`
              : lowStock.map(item => {
                  const pct = Math.round((item.current / Math.max(item.reorder, 1)) * 100);
                  const cls = item.current === 0 ? 'critical' : 'low';
                  return `
                    <div class="stock-item">
                      <span class="stock-name">${esc(item.item)}</span>
                      <span class="stock-qty ${cls}">${item.current} left</span>
                    </div>
                  `;
                }).join('')}
          </div>
        </div>

        <!-- Revenue by Category -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Revenue Breakdown</span>
            <button class="panel-action" onclick="showView('payments', null)">View All →</button>
          </div>
          <div class="panel-body" id="revBreakdown">
            <div class="empty-state"><div class="empty-icon">💳</div><p>Record payments to see breakdown</p></div>
          </div>
        </div>

      </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
    currentData = data;
  }

  // ─── Generic Table Renderer ────────────────────────────────
  function renderTable(view, data) {
    // Events get a custom card-style management view
    if (view === 'events') {
      renderEventsManage(data);
      return;
    }

    const rows    = data.rows || [];
    const headers = data.headers || [];
    const total   = data.total || rows.length;

    const columnConfig = getColumnConfig(view);

    const html = `
      <div class="panel">
        <div class="toolbar">
          <input class="search-input" type="text" placeholder="Search ${view}…" oninput="filterTable(this.value)" id="searchInput">
          ${getFilterControls(view)}
          <span style="font-size:0.75rem;color:var(--text-muted);margin-left:auto">${total} records</span>
        </div>
        <div class="table-wrap">
          <table class="data-table" id="mainTable">
            <thead>
              <tr>
                ${columnConfig.map(c => `<th>${c.label}</th>`).join('')}
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="tableBody">
              ${rows.length === 0
                ? `<tr><td colspan="${columnConfig.length + 1}" style="text-align:center;padding:3rem;color:var(--text-muted)">No data found</td></tr>`
                : rows.map(row => `
                  <tr>
                    ${columnConfig.map(c => `<td>${renderCell(c, row)}</td>`).join('')}
                    <td>${getRowActions(view, row)}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
    currentData = data;
  }

  // ─── Column Configurations ─────────────────────────────────
  function getColumnConfig(view) {
    const configs = {
      reservations: [
        { key: 'Timestamp', label: 'Date/Time', type: 'date' },
        { key: 'Name',      label: 'Name',      type: 'bold' },
        { key: 'Phone',     label: 'Phone',      type: 'phone' },
        { key: 'Date',      label: 'Event Date', type: 'text' },
        { key: 'Guests',    label: 'Guests',     type: 'text' },
        { key: 'Occasion',  label: 'Occasion',   type: 'text' },
        { key: 'Status',    label: 'Status',     type: 'badge' },
      ],
      customers: [
        { key: 'Created At', label: 'Joined',       type: 'date' },
        { key: 'Name',       label: 'Name',         type: 'bold' },
        { key: 'Phone',      label: 'Phone',        type: 'phone' },
        { key: 'Email',      label: 'Email',        type: 'text' },
        { key: 'Source',     label: 'Source',       type: 'text' },
        { key: 'Visit Count',label: 'Visits',       type: 'text' },
        { key: 'Last Visit', label: 'Last Visit',   type: 'date' },
        { key: 'Status',     label: 'Status',       type: 'badge' },
      ],
      events: [
        { key: 'Flyer',      label: 'Flyer',        type: 'flyer' },
        { key: 'Event Name', label: 'Event',        type: 'bold' },
        { key: 'Date',       label: 'Date',         type: 'text' },
        { key: 'Day of Week',label: 'Day',          type: 'text' },
        { key: 'Headliner',  label: 'Headliner',    type: 'text' },
        { key: 'Cover Price',label: 'Cover',        type: 'money' },
        { key: 'VIP Price',  label: 'VIP',          type: 'money' },
        { key: 'Status',     label: 'Status',       type: 'badge' },
      ],
      inventory: [
        { key: 'Item Name',    label: 'Item',         type: 'bold' },
        { key: 'Category',     label: 'Category',     type: 'text' },
        { key: 'Current Stock',label: 'Stock',        type: 'stock' },
        { key: 'Unit',         label: 'Unit',         type: 'text' },
        { key: 'Reorder Level',label: 'Reorder At',   type: 'text' },
        { key: 'Supplier',     label: 'Supplier',     type: 'text' },
        { key: 'Last Updated', label: 'Updated',      type: 'date' },
      ],
      staff: [
        { key: 'Staff ID', label: 'ID',         type: 'text' },
        { key: 'Name',     label: 'Name',       type: 'bold' },
        { key: 'Role',     label: 'Role',       type: 'text' },
        { key: 'Phone',    label: 'Phone',      type: 'phone' },
        { key: 'Status',   label: 'Status',     type: 'badge' },
      ],
      payments: [
        { key: 'Timestamp', label: 'Time',       type: 'date' },
        { key: 'Amount',    label: 'Amount',     type: 'money' },
        { key: 'Category',  label: 'Category',   type: 'text' },
        { key: 'Method',    label: 'Method',     type: 'text' },
        { key: 'Customer',  label: 'Customer',   type: 'text' },
        { key: 'Notes',     label: 'Notes',      type: 'text' },
      ],
      incidents: [
        { key: 'Timestamp',        label: 'Date/Time',   type: 'date' },
        { key: 'Type',             label: 'Type',        type: 'text' },
        { key: 'Severity',         label: 'Severity',    type: 'badge' },
        { key: 'Description',      label: 'Description', type: 'truncate' },
        { key: 'Reported By',      label: 'Reported By', type: 'text' },
        { key: 'Status',           label: 'Status',      type: 'badge' },
      ],
      marketing: [
        { key: 'Timestamp', label: 'Date',    type: 'date' },
        { key: 'Name',      label: 'Name',    type: 'bold' },
        { key: 'Phone',     label: 'Phone',   type: 'phone' },
        { key: 'Source',    label: 'Source',  type: 'text' },
        { key: 'Interest',  label: 'Interest',type: 'text' },
        { key: 'Status',    label: 'Status',  type: 'badge' },
      ],
      ban_list: [
        { key: 'Added At',    label: 'Date',        type: 'date' },
        { key: 'Name',        label: 'Name',        type: 'bold' },
        { key: 'Description', label: 'Description', type: 'truncate' },
        { key: 'Reason',      label: 'Reason',      type: 'truncate' },
        { key: 'Added By',    label: 'Added By',    type: 'text' },
        { key: 'Status',      label: 'Status',      type: 'badge' },
      ],
      logs: [
        { key: 'Timestamp', label: 'Time',    type: 'date' },
        { key: 'Action',    label: 'Action',  type: 'text' },
        { key: 'Status',    label: 'Status',  type: 'badge' },
        { key: 'Details',   label: 'Details', type: 'truncate' },
      ],
    };

    return configs[view] || [];
  }

  function renderCell(col, row) {
    const val = row[col.key];
    const safe = esc(val ?? '');

    switch (col.type) {
      case 'bold':
        return `<strong>${safe}</strong>`;
      case 'date':
        return `<span style="color:var(--text-muted);font-size:0.78rem">${safe}</span>`;
      case 'badge':
        return `<span class="badge ${badgeClass(val)}">${safe}</span>`;
      case 'money':
        return val ? `<span style="color:var(--green);font-weight:600">$${formatMoney(val)}</span>` : '—';
      case 'phone':
        return val ? `<a href="tel:${safe}" style="color:var(--text-muted)">${safe}</a>` : '—';
      case 'stock':
        const cls = Number(val) === 0 ? 'critical' : Number(val) <= 5 ? 'low' : '';
        return `<span class="stock-qty ${cls}">${safe}</span>`;
      case 'truncate':
        return `<span title="${safe}" style="max-width:200px;display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${safe}</span>`;
      case 'flyer': {
        // Special case: col.key is 'Flyer' but data is in 'Thumb URL' / 'Drive File ID'
        const thumbUrl    = row['Thumb URL']    || '';
        const driveFileId = row['Drive File ID']|| '';
        const flyerUrl    = row['Flyer URL']    || '';
        const thumbSrc    = thumbUrl || (driveFileId ? `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w120` : '');
        if (!thumbSrc && !flyerUrl) {
          return `<span style="font-size:1.1rem;opacity:0.2">📄</span>`;
        }
        return `<a href="${esc(flyerUrl || '#')}" target="_blank" rel="noopener noreferrer">
          <img src="${esc(thumbSrc)}" alt="Flyer" class="ev-flyer-thumb" width="60" style="border-radius:4px;height:70px;object-fit:cover">
        </a>`;
      }
      default:
        return safe || '—';
    }
  }

  function getRowActions(view, row) {
    const phone = row['Phone'] || row['phone'] || '';
    const name  = row['Name']  || row['name']  || '';
    const actions = [];

    if (phone) {
      actions.push(`<button class="btn btn-sm btn-outline" onclick="whatsappContact('${esc(phone)}','${esc(name)}')" title="WhatsApp">💬</button>`);
    }
    if (view === 'reservations') {
      actions.push(`<button class="btn btn-sm btn-gold" onclick="confirmReservation('${esc(name)}','${esc(phone)}')" title="Confirm">✓</button>`);
    }
    if (view === 'incidents') {
      actions.push(`<button class="btn btn-sm btn-outline" onclick="openModal('incidentModal')" title="New">+</button>`);
    }

    return actions.join(' ') || '—';
  }

  function getFilterControls(view) {
    if (view === 'reservations') {
      return `
        <select class="filter-select" onchange="filterByStatus(this.value)">
          <option value="">All Status</option>
          <option>Pending</option>
          <option>Confirmed</option>
          <option>Cancelled</option>
        </select>
      `;
    }
    if (view === 'inventory') {
      return `
        <select class="filter-select" onchange="filterByCategory(this.value)">
          <option value="">All Categories</option>
          <option>Spirits</option>
          <option>Champagne</option>
          <option>Beer</option>
          <option>Mixers</option>
          <option>Supplies</option>
          <option>Produce</option>
        </select>
      `;
    }
    if (view === 'incidents') {
      return `
        <select class="filter-select" onchange="filterByStatus(this.value)">
          <option value="">All Status</option>
          <option>Open</option>
          <option>Resolved</option>
        </select>
      `;
    }
    return '';
  }

  // ─── Table Search / Filter ─────────────────────────────────
  window.filterTable = function (query) {
    const q = query.toLowerCase();
    document.querySelectorAll('#tableBody tr').forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(q) ? '' : 'none';
    });
  };

  window.filterByStatus = function (status) {
    document.querySelectorAll('#tableBody tr').forEach(row => {
      if (!status) { row.style.display = ''; return; }
      const badgeEl = row.querySelector('.badge');
      const val = badgeEl ? badgeEl.textContent.trim() : '';
      row.style.display = val === status ? '' : 'none';
    });
  };

  window.filterByCategory = function (cat) {
    document.querySelectorAll('#tableBody tr').forEach(row => {
      if (!cat) { row.style.display = ''; return; }
      const cells = row.querySelectorAll('td');
      // Category is typically 2nd column in inventory
      const catCell = cells[1] ? cells[1].textContent.trim() : '';
      row.style.display = catCell === cat ? '' : 'none';
    });
  };

  // ─── Quick Actions / Modals ────────────────────────────────
  window.openModal = function (id) {
    document.getElementById(id).classList.add('visible');
  };

  window.closeModal = function (id) {
    document.getElementById(id).classList.remove('visible');
  };

  window.submitPayment = async function () {
    const amount   = document.getElementById('pay-amount').value;
    const method   = document.getElementById('pay-method').value;
    const category = document.getElementById('pay-category').value;
    const customer = document.getElementById('pay-customer').value;
    const notes    = document.getElementById('pay-notes').value;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      toast('Enter a valid amount', 'error');
      return;
    }

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          type: 'payment_update',
          adminToken: token,
          amount, method, category, customer, notes,
          recordedBy: 'Admin Dashboard',
        }),
      });
      closeModal('paymentModal');
      toast(`$${formatMoney(amount)} recorded ✓`, 'success');
      // Reset
      document.getElementById('pay-amount').value = '';
      document.getElementById('pay-customer').value = '';
      document.getElementById('pay-notes').value = '';
    } catch (e) {
      toast('Error recording payment', 'error');
    }
  };

  window.submitIncident = async function () {
    const type        = document.getElementById('inc-type').value;
    const severity    = document.getElementById('inc-severity').value;
    const description = document.getElementById('inc-description').value;
    const persons     = document.getElementById('inc-persons').value;
    const action      = document.getElementById('inc-action').value;
    const reporter    = document.getElementById('inc-reporter').value;
    const addBan      = document.getElementById('inc-ban').value === 'yes';

    if (!description || !reporter) {
      toast('Fill in description and reporter name', 'error');
      return;
    }

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          type: 'incident_report',
          adminToken: token,
          type: type, severity, description,
          personsInvolved: persons,
          actionTaken: action,
          reportedBy: reporter,
          addToBanList: addBan,
          personName: addBan ? persons : '',
          reason: description,
        }),
      });
      closeModal('incidentModal');
      toast('Incident report filed ✓', 'success');
      // Reset
      document.getElementById('inc-description').value = '';
      document.getElementById('inc-persons').value = '';
      document.getElementById('inc-action').value = '';
      document.getElementById('inc-reporter').value = '';
    } catch (e) {
      toast('Error filing incident', 'error');
    }
  };

  // ─── Events Management View ────────────────────────────────

  function renderEventsManage(data) {
    const rows  = data.rows || [];
    const total = data.total || rows.length;

    const cardHtml = rows.length === 0
      ? `<div class="empty-state" style="grid-column:1/-1">
           <div class="empty-icon">📅</div>
           <p>No events yet — click "Add Event" to publish your first one.</p>
         </div>`
      : rows.map(ev => {
          const evId     = esc(ev['Event ID']     || '');
          const evName   = esc(ev['Event Name']   || '');
          const evDate   = esc(ev['Date']          || '');
          const evDay    = esc(ev['Day of Week']   || '');
          const evHead   = esc(ev['Headliner']     || '');
          const evStatus = ev['Status']            || 'Upcoming';
          const fileId   = ev['Drive File ID']     || '';
          const flyerUrl = esc(ev['Flyer URL']     || '');
          const thumbUrl = esc(ev['Thumb URL']     || (fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w300` : ''));
          const coverP   = ev['Cover Price']       || 0;
          const vipP     = ev['VIP Price']         || 0;

          const thumbHtml = thumbUrl
            ? `<img src="${thumbUrl}" alt="Flyer" style="width:100%;height:180px;object-fit:cover;display:block">`
            : `<div style="width:100%;height:180px;background:linear-gradient(135deg,#0d0d0d,#1a1408);display:flex;align-items:center;justify-content:center;font-size:2.5rem;opacity:0.3">📄</div>`;

          return `
            <div class="panel" style="overflow:hidden">
              ${flyerUrl
                ? `<a href="${flyerUrl}" target="_blank" rel="noopener noreferrer" title="View flyer PDF">${thumbHtml}</a>`
                : thumbHtml}
              <div class="panel-body" style="padding:1rem">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem;margin-bottom:0.5rem">
                  <strong style="font-size:0.9rem;color:var(--text);line-height:1.3">${evName}</strong>
                  <span class="badge ${badgeClass(evStatus)}" style="flex-shrink:0">${esc(evStatus)}</span>
                </div>
                <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.3rem">
                  ${evDay ? evDay + ' · ' : ''}${evDate}
                </p>
                ${evHead ? `<p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.3rem">🎵 ${evHead}</p>` : ''}
                <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.85rem">
                  Cover $${formatMoney(coverP)} · VIP from $${formatMoney(vipP)}
                </p>
                <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
                  <select class="filter-select" style="flex:1;font-size:0.72rem;padding:0.4rem 0.6rem"
                    onchange="updateEventStatus('${evId}', this.value)">
                    ${['Upcoming','Planning','Live','Sold Out','Past','Draft','Cancelled'].map(s =>
                      `<option ${s === evStatus ? 'selected' : ''}>${s}</option>`
                    ).join('')}
                  </select>
                  ${flyerUrl ? `<a href="${flyerUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline" title="View file">📄</a>` : ''}
                  <button class="btn btn-sm btn-danger" onclick="deleteEvent('${evId}','${evName}')" title="Delete event">✕</button>
                </div>
              </div>
            </div>
          `;
        }).join('');

    const html = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:0.75rem">
        <span style="font-size:0.78rem;color:var(--text-muted)">${total} event${total !== 1 ? 's' : ''} total</span>
        <div style="display:flex;gap:0.75rem;align-items:center">
          <a href="../events.html" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">↗ View Public Page</a>
          <button class="btn btn-gold btn-sm" onclick="openModal('addEventModal')">+ Add Event</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem">
        ${cardHtml}
      </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
    currentData = data;
  }

  // ─── Event CRUD actions ────────────────────────────────────

  window.updateEventStatus = async function (eventId, status) {
    try {
      const res  = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ type: 'update_event_status', adminToken: token, eventId, status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast(`Status updated to "${status}" ✓`, 'success');
    } catch (e) {
      toast('Failed to update status', 'error');
    }
  };

  window.deleteEvent = async function (eventId, eventName) {
    if (!confirm(`Delete "${eventName}"? This cannot be undone.`)) return;
    try {
      const res  = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ type: 'delete_event', adminToken: token, eventId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast('Event deleted ✓', 'success');
      loadView('events');
    } catch (e) {
      toast('Failed to delete event', 'error');
    }
  };

  // ─── Event File Handling ───────────────────────────────────

  let flyerBase64 = '';
  let flyerName   = '';
  let flyerMimeType = '';

  window.handleFlyerSelect = function (input) {
    const file = input.files[0];
    if (!file) return;

    // Validate size (10MB limit)
    const maxMB = 10;
    if (file.size > maxMB * 1024 * 1024) {
      toast(`File too large. Max ${maxMB}MB for event files.`, 'error');
      input.value = '';
      return;
    }

    flyerName = file.name;
    flyerMimeType = file.type || 'application/octet-stream';
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);

    // Read as base64
    const reader = new FileReader();
    reader.onload = e => {
      flyerBase64 = e.target.result; // Includes data:<mime>;base64,... prefix

      // Update drop zone UI
      const zone = document.getElementById('flyerDropZone');
      zone.classList.add('has-file');
      document.getElementById('flyerPrompt').style.display     = 'none';
      document.getElementById('flyerPreviewWrap').style.display = 'block';
      document.getElementById('flyerFileName').textContent = `📄 ${flyerName}`;
      document.getElementById('flyerFileSize').textContent = `${sizeMB} MB · ${flyerMimeType} — ready to upload`;
    };
    reader.readAsDataURL(file);
  };

  window.clearFlyer = function () {
    flyerBase64 = '';
    flyerName   = '';
    flyerMimeType = '';
    document.getElementById('flyerInput').value = '';
    document.getElementById('flyerDropZone').classList.remove('has-file');
    document.getElementById('flyerPrompt').style.display      = 'block';
    document.getElementById('flyerPreviewWrap').style.display = 'none';
  };

  // Drag-and-drop support on the drop zone
  document.addEventListener('DOMContentLoaded', () => {
    const zone = document.getElementById('flyerDropZone');
    if (!zone) return;

    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) {
        const input = document.getElementById('flyerInput');
        // Programmatically assign to input using DataTransfer
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        window.handleFlyerSelect(input);
      }
    });
  });

  // ─── Publish Event ─────────────────────────────────────────

  window.submitEvent = async function () {
    const eventName = document.getElementById('ev-name').value.trim();
    const date      = document.getElementById('ev-date').value;

    if (!eventName) {
      toast('Event name is required', 'error');
      document.getElementById('ev-name').focus();
      return;
    }
    if (!date) {
      toast('Please select a date', 'error');
      document.getElementById('ev-date').focus();
      return;
    }

    // Auto-detect day of week from date
    let dayOfWeek = document.getElementById('ev-day').value;
    if (!dayOfWeek && date) {
      const d   = new Date(date + 'T00:00:00');
      dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
    }

    const payload = {
      type:        'upload_event',
      adminToken:  token,
      eventName,
      date,
      dayOfWeek,
      eventType:   document.getElementById('ev-type').value,
      status:      document.getElementById('ev-status').value,
      headliner:   document.getElementById('ev-headliner').value.trim(),
      startTime:   document.getElementById('ev-start').value,
      endTime:     document.getElementById('ev-end').value,
      coverPrice:  document.getElementById('ev-cover').value || 0,
      vipPrice:    document.getElementById('ev-vip').value   || 0,
      capacity:    document.getElementById('ev-capacity').value || 350,
      description: document.getElementById('ev-desc').value.trim(),
      flyerBase64: flyerBase64 || '',
      flyerName:   flyerName   || '',
      flyerMimeType: flyerMimeType || '',
    };

    // Show progress UI
    const btn      = document.getElementById('publishEventBtn');
    const progress = document.getElementById('uploadProgress');
    const statusEl = document.getElementById('uploadStatus');
    const bar      = document.getElementById('uploadBar');

    btn.disabled = true;
    btn.textContent = flyerBase64 ? 'Uploading…' : 'Publishing…';
    progress.style.display = 'block';
    statusEl.textContent = flyerBase64 ? 'Uploading flyer to Google Drive…' : 'Publishing event…';

    // Animate progress bar for visual feedback
    setTimeout(() => { bar.style.width = '40%'; }, 100);
    if (flyerBase64) {
      setTimeout(() => { bar.style.width = '75%'; statusEl.textContent = 'Saving to Drive…'; }, 1500);
    }
    setTimeout(() => { bar.style.width = '90%'; statusEl.textContent = 'Saving to Events sheet…'; }, flyerBase64 ? 3000 : 800);

    try {
      const res  = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || 'Upload failed');

      bar.style.width = '100%';
      statusEl.textContent = 'Done!';

      setTimeout(() => {
        closeModal('addEventModal');
        resetEventForm();
        toast(`"${eventName}" is now live on your events page ✓`, 'success');
        // Refresh events view if currently visible
        if (currentView === 'events') loadView('events');
      }, 600);

    } catch (e) {
      progress.style.display = 'none';
      bar.style.width = '0%';
      btn.disabled = false;
      btn.textContent = 'Publish Event';
      toast('Error: ' + e.message, 'error');
    }
  };

  function resetEventForm() {
    ['ev-name','ev-headliner','ev-desc','ev-cover','ev-vip','ev-capacity'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('ev-date').value    = '';
    document.getElementById('ev-day').value     = '';
    document.getElementById('ev-type').value    = 'Regular Night';
    document.getElementById('ev-status').value  = 'Upcoming';
    document.getElementById('ev-start').value   = '20:00';
    document.getElementById('ev-end').value     = '02:30';
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('publishEventBtn').disabled = false;
    document.getElementById('publishEventBtn').textContent = 'Publish Event';
    clearFlyer();
  }

  window.confirmReservation = function (name, phone) {
    const msg = encodeURIComponent(
      `Hi ${name}! Your reservation at Josephine Lounge is confirmed. ` +
      `We look forward to hosting you. For any questions, reply here. — Josephine Lounge Team 🥂`
    );
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}`, '_blank', 'noopener');
  };

  window.whatsappContact = function (phone, name) {
    const clean = phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hi ${name || 'there'}! Thank you for choosing Josephine Lounge.`);
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank', 'noopener');
  };

  window.whatsappOpen = function () {
    window.open('https://wa.me/16789734441', '_blank', 'noopener');
  };

  // ─── Sidebar (mobile) ──────────────────────────────────────
  window.openSidebar = function () {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('visible');
    document.body.style.overflow = 'hidden';
  };

  window.closeSidebar = function () {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('visible');
    document.body.style.overflow = '';
  };

  // ─── Auth ──────────────────────────────────────────────────
  window.logout = function () {
    sessionStorage.clear();
    window.location.href = 'login.html';
  };

  // ─── Utilities ─────────────────────────────────────────────
  function showLoading() {
    document.getElementById('pageContent').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;padding:4rem;gap:1rem">
        <div class="loading-spin"></div>
        <span style="color:var(--text-muted);font-size:0.82rem">Loading…</span>
      </div>
    `;
  }

  function showError(msg) {
    document.getElementById('pageContent').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p style="color:var(--red)">${esc(msg)}</p>
        <button class="btn btn-outline" style="margin-top:1rem" onclick="refreshView()">Try Again</button>
      </div>
    `;
  }

  function badgeClass(status) {
    const s = (status || '').toLowerCase();
    if (['pending', 'registered', 'new lead', 'new'].some(v => s.includes(v))) return 'badge-pending';
    if (['confirmed', 'active', 'resolved', 'success'].some(v => s.includes(v)))return 'badge-confirmed';
    if (['cancelled', 'open', 'critical', 'failed', 'error'].some(v => s.includes(v))) return 'badge-cancelled';
    if (['inactive', 'closed'].some(v => s.includes(v))) return 'badge-inactive';
    return 'badge-new';
  }

  function formatMoney(val) {
    const n = parseFloat(val) || 0;
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.toast = function (msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  };

})();
