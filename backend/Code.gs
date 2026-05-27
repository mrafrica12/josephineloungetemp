/**
 * JOSEPHINE LOUNGE — UmojaServ CRM Backend
 * Single Google Apps Script endpoint powering all operations
 *
 * Supported form types:
 *   reservation · birthday_booking · event_rsvp · customer
 *   inventory_update · inventory_count · staff_clockin
 *   payment_update · incident_report · marketing_lead
 *
 * Deploy as: Web App → Execute as Me → Who has access: Anyone
 *
 * IMPORTANT: After deploying, copy the Web App URL into admin.js
 *            Never expose this URL publicly — keep it in admin.js only
 */

// ─── Configuration ────────────────────────────────────────────────────────────
const CONFIG = {
  SPREADSHEET_ID: '1b7JLMV6XF0BGbBAfievF027n9ZiCLixPKTsAKj_NLfc',
  TIMEZONE: 'America/New_York',
  VERSION: '1.0.0',
  WHATSAPP_NUMBER: '16789734441',
};

// Sheet name constants
const SHEETS = {
  DASHBOARD:   'Dashboard',
  RESERVATIONS:'Reservations',
  CUSTOMERS:   'Customers',
  EVENTS:      'Events',
  INVENTORY:   'Inventory',
  INV_COUNTS:  'Inventory Counts',
  STAFF:       'Staff',
  PAYROLL:     'Payroll',
  REVENUE:     'Revenue',
  EXPENSES:    'Expenses',
  MARKETING:   'Marketing',
  PROMOTERS:   'Promoters',
  PAYMENTS:    'Payments',
  INCIDENTS:   'Incidents',
  BAN_LIST:    'Ban List',
  LOST_FOUND:  'Lost & Found',
  SETTINGS:    'Settings',
  LOGS:        'Logs',
};


// ─── Entry Points ─────────────────────────────────────────────────────────────

/**
 * doPost — Receives data from all public forms + admin write actions
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const type = (data.type || '').toLowerCase().trim();
    const token = data.adminToken || null;

    // Admin-only write routes require auth
    const adminRoutes = ['inventory_update', 'inventory_count', 'staff_clockin',
                         'payment_update', 'incident_report', 'upload_event',
                         'delete_event', 'update_event_status'];
    if (adminRoutes.includes(type)) {
      if (!verifyAdmin(token)) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
      }
    }

    // Route to handler
    let result;
    switch (type) {
      case 'reservation':        result = handleReservation(data);       break;
      case 'birthday_booking':   result = handleBirthdayBooking(data);   break;
      case 'event_rsvp':         result = handleEventRsvp(data);         break;
      case 'customer':           result = handleCustomer(data);          break;
      case 'inventory_update':   result = handleInventoryUpdate(data);   break;
      case 'inventory_count':    result = handleInventoryCount(data);    break;
      case 'staff_clockin':      result = handleStaffClockin(data);      break;
      case 'payment_update':     result = handlePaymentUpdate(data);     break;
      case 'incident_report':    result = handleIncidentReport(data);    break;
      case 'marketing_lead':     result = handleMarketingLead(data);     break;
      case 'upload_event':       result = handleEventUpload(data);       break;
      case 'delete_event':       result = handleEventDelete(data);       break;
      case 'update_event_status':result = handleEventStatusUpdate(data); break;
      default:
        return jsonResponse({ success: false, error: 'Unknown form type: ' + type }, 400);
    }

    logEntry(type, 'success', JSON.stringify(data).substring(0, 200));
    return jsonResponse({ success: true, ...result });

  } catch (err) {
    logEntry('doPost', 'error', err.message);
    return jsonResponse({ success: false, error: 'Server error: ' + err.message }, 500);
  }
}

/**
 * doGet — Serves both public and admin data
 *
 * Public (no token): get_events, login
 * Admin (token required): overview, reservations, customers, etc.
 */
function doGet(e) {
  try {
    const action = (e.parameter && e.parameter.action) || 'overview';

    // ── Public endpoints — no auth required ──────────────────
    if (action === 'login') {
      const result = adminLogin(e.parameter.password);
      return jsonResponse({ success: true, ...result });
    }

    if (action === 'get_events') {
      const result = getPublicEvents();
      return jsonResponse({ success: true, ...result });
    }

    // ── Admin endpoints — token required ─────────────────────
    const token = (e.parameter && e.parameter.token) || '';
    if (!verifyAdmin(token)) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
    }

    let result;
    switch (action) {
      case 'overview':      result = getOverview();                        break;
      case 'reservations':  result = getSheet(SHEETS.RESERVATIONS, 200);  break;
      case 'customers':     result = getSheet(SHEETS.CUSTOMERS, 200);     break;
      case 'events':        result = getSheet(SHEETS.EVENTS, 100);        break;
      case 'inventory':     result = getSheet(SHEETS.INVENTORY, 300);     break;
      case 'staff':         result = getSheet(SHEETS.STAFF, 100);         break;
      case 'revenue':       result = getSheet(SHEETS.REVENUE, 100);       break;
      case 'payments':      result = getSheet(SHEETS.PAYMENTS, 100);      break;
      case 'incidents':     result = getSheet(SHEETS.INCIDENTS, 100);     break;
      case 'marketing':     result = getSheet(SHEETS.MARKETING, 200);     break;
      case 'logs':          result = getSheet(SHEETS.LOGS, 100);          break;
      case 'ban_list':      result = getSheet(SHEETS.BAN_LIST, 100);      break;
      default:
        return jsonResponse({ success: false, error: 'Unknown action' }, 400);
    }

    return jsonResponse({ success: true, ...result });

  } catch (err) {
    logEntry('doGet', 'error', err.message);
    return jsonResponse({ success: false, error: 'Server error: ' + err.message }, 500);
  }
}


// ─── Admin Auth ───────────────────────────────────────────────────────────────

/**
 * Called as ?action=login&password=XXX  (no token needed at login step)
 * Returns a session token valid for 8 hours
 */
function adminLogin(password) {
  if (!password) return { authenticated: false };

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const settings = ss.getSheetByName(SHEETS.SETTINGS);
  const storedHash = settings.getRange('B3').getValue(); // Row 3: admin_password_hash (row 2 is venue_name)

  const inputHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  ).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');

  if (inputHash !== storedHash) {
    logEntry('login', 'failed', 'Bad password attempt');
    return { authenticated: false };
  }

  // Generate session token: store in Settings B4 with expiry B5
  const token = Utilities.getUuid();
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 8);

  settings.getRange('B4').setValue(token);
  settings.getRange('B5').setValue(expiry.toISOString());

  logEntry('login', 'success', 'Admin logged in');
  return { authenticated: true, token, expiry: expiry.toISOString() };
}

function verifyAdmin(token) {
  if (!token) return false;
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const settings = ss.getSheetByName(SHEETS.SETTINGS);
    const storedToken = settings.getRange('B4').getValue();
    const expiry = new Date(settings.getRange('B5').getValue());

    return token === storedToken && new Date() < expiry;
  } catch (e) {
    return false;
  }
}

/**
 * One-time helper — run this manually in the Apps Script editor to set your password
 * 1. Open Code.gs in Apps Script editor
 * 2. Change 'YourPasswordHere' to your desired password
 * 3. Run this function once
 * 4. It writes the hash to Settings sheet B3 (admin_password_hash row)
 */
function setAdminPassword() {
  const password = 'YourPasswordHere'; // CHANGE THIS before running
  const hash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  ).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const settings = ss.getSheetByName(SHEETS.SETTINGS);
  settings.getRange('B3').setValue(hash); // Row 3 = admin_password_hash
  Logger.log('Password hash set: ' + hash);
}


function debugLogin() {
  const testPassword = 'YourPasswordHere'; // ← put your actual password here
  const ss       = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const settings = ss.getSheetByName(SHEETS.SETTINGS);

  const storedHash = settings.getRange('B3').getValue();
  const inputHash  = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    testPassword,
    Utilities.Charset.UTF_8
  ).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');

  Logger.log('Stored  hash (B3): ' + storedHash);
  Logger.log('Input   hash:      ' + inputHash);
  Logger.log('Match?             ' + (storedHash === inputHash));
  Logger.log('B3 cell raw value: ' + JSON.stringify(storedHash));
}

// ─── Form Handlers ────────────────────────────────────────────────────────────

/**
 * Reservations sheet — expected header row (Row 1):
 * Timestamp | Reservation ID | Full Name | Phone | Email | Preferred Date |
 * Arrival Time | Party Size | Occasion | Referral Source | Special Requests |
 * Source Page | Status | Follow-Up Required | Last Contacted | Notes
 */
function handleReservation(data) {
  const required = ['name', 'phone', 'date'];
  validateRequired(data, required);
  const reservationId = generateId('RES');

  const row = [
    new Date(),                          // A: Timestamp
    reservationId,                        // B: Reservation ID
    sanitize(data.name),                 // C: Full Name
    sanitize(data.phone),                // D: Phone
    sanitize(data.email || ''),          // E: Email
    data.date,                           // F: Preferred Date
    sanitize(data.arrival || ''),        // G: Arrival Time
    sanitize(data.guests || ''),         // H: Party Size
    sanitize(data.occasion || ''),       // I: Occasion
    sanitize(data.referral || ''),       // J: Referral Source
    sanitize(data.notes || ''),          // K: Special Requests
    sanitize(data.sourcePage || 'Website'), // L: Source Page
    'New Inquiry',                       // M: Status
    'Yes',                               // N: Follow-Up Required
    '',                                  // O: Last Contacted
    '',                                  // P: Notes
  ];

  appendRow(SHEETS.RESERVATIONS, row);
  upsertCustomer(data.name, data.phone, data.email, 'Reservation');

  return { message: 'Reservation received', id: reservationId };
}

function handleBirthdayBooking(data) {
  validateRequired(data, ['name', 'phone', 'date']);
  const reservationId = generateId('BDY');

  const row = [
    new Date(),
    reservationId,
    sanitize(data.name),
    sanitize(data.phone),
    sanitize(data.email || ''),
    data.date,
    sanitize(data.arrival || ''),
    data.guests || '',
    sanitize(data.package || 'Birthday'),
    sanitize(data.source || 'Website'),
    sanitize(data.notes || ''),
    sanitize(data.sourcePage || 'Website'),
    'New Inquiry',
    'Yes',
    '',
    sanitize(data.honoree || ''),
  ];

  appendRow(SHEETS.RESERVATIONS, row);
  upsertCustomer(data.name, data.phone, data.email, 'Birthday');
  return { message: 'Birthday booking received', id: reservationId };
}

function handleEventRsvp(data) {
  validateRequired(data, ['name', 'phone', 'eventId']);
  const reservationId = generateId('EVT');

  const row = [
    new Date(),
    reservationId,
    sanitize(data.name),
    sanitize(data.phone),
    sanitize(data.email || ''),
    data.date || '',
    sanitize(data.arrival || ''),
    data.guests || 1,
    sanitize(data.eventId),
    sanitize(data.referral || ''),
    sanitize(data.notes || ''),
    sanitize(data.sourcePage || 'Events Page'),
    'New Inquiry',
    'Yes',
    '',
    'Event RSVP',
  ];

  appendRow(SHEETS.RESERVATIONS, row);
  upsertCustomer(data.name, data.phone, data.email, 'Event RSVP');
  return { message: 'RSVP confirmed', id: reservationId };
}

function handleCustomer(data) {
  validateRequired(data, ['name', 'phone']);
  upsertCustomer(data.name, data.phone, data.email, data.source || 'Direct');
  return { message: 'Customer profile updated' };
}

function handleInventoryUpdate(data) {
  validateRequired(data, ['item', 'quantity', 'category']);

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.INVENTORY);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const nameCol = headers.indexOf('Item Name');
  const qtyCol  = headers.indexOf('Current Stock');

  // Find existing row by item name
  for (let i = 1; i < values.length; i++) {
    if (values[i][nameCol] === sanitize(data.item)) {
      sheet.getRange(i + 1, qtyCol + 1).setValue(Number(data.quantity));
      sheet.getRange(i + 1, headers.indexOf('Last Updated') + 1).setValue(new Date());
      sheet.getRange(i + 1, headers.indexOf('Updated By') + 1).setValue(sanitize(data.updatedBy || 'Admin'));
      return { message: 'Inventory updated for ' + data.item };
    }
  }

  // New item — append
  const row = [
    new Date(),
    sanitize(data.item),
    sanitize(data.category),
    Number(data.quantity),
    data.unit || 'units',
    data.reorderLevel || 10,
    data.cost || '',
    sanitize(data.supplier || ''),
    new Date(),
    sanitize(data.updatedBy || 'Admin'),
  ];
  appendRow(SHEETS.INVENTORY, row);
  return { message: 'New inventory item added: ' + data.item };
}

function handleInventoryCount(data) {
  validateRequired(data, ['item', 'counted', 'countedBy']);

  const row = [
    new Date(),
    sanitize(data.item),
    sanitize(data.category || ''),
    Number(data.expected || 0),
    Number(data.counted),
    Number(data.counted) - Number(data.expected || 0),  // Variance
    sanitize(data.countedBy),
    sanitize(data.notes || ''),
  ];

  appendRow(SHEETS.INV_COUNTS, row);
  return { message: 'Inventory count recorded' };
}

function handleStaffClockin(data) {
  validateRequired(data, ['staffId', 'action']); // action: 'in' or 'out'

  const row = [
    new Date(),
    sanitize(data.staffId),
    sanitize(data.staffName || ''),
    data.action.toLowerCase() === 'in' ? 'Clock In' : 'Clock Out',
    new Date(),
    sanitize(data.notes || ''),
  ];

  appendRow(SHEETS.PAYROLL, row);
  return { message: `Staff ${data.action} recorded for ${data.staffId}` };
}

function handlePaymentUpdate(data) {
  validateRequired(data, ['amount', 'category', 'method']);

  const row = [
    new Date(),
    generateId('PAY'),
    Number(data.amount),
    sanitize(data.category),  // e.g. 'Cover', 'VIP', 'Bar', 'Event'
    sanitize(data.method),    // e.g. 'Cash', 'Card', 'Zelle', 'CashApp'
    sanitize(data.customer || ''),
    sanitize(data.notes || ''),
    sanitize(data.recordedBy || 'Admin'),
  ];

  appendRow(SHEETS.PAYMENTS, row);
  updateRevenueLog(data.amount, data.category);
  return { message: 'Payment recorded', amount: data.amount };
}

function handleIncidentReport(data) {
  validateRequired(data, ['type', 'description', 'reportedBy']);

  const row = [
    new Date(),
    generateId('INC'),
    sanitize(data.type),         // 'Security', 'Medical', 'Property', 'Other'
    sanitize(data.severity || 'Medium'), // 'Low', 'Medium', 'High', 'Critical'
    sanitize(data.description),
    sanitize(data.personsInvolved || ''),
    sanitize(data.actionTaken || ''),
    sanitize(data.reportedBy),
    'Open',                      // Status
    '',                          // Resolved By
    '',                          // Resolved At
  ];

  appendRow(SHEETS.INCIDENTS, row);

  // Auto-add to ban list if flagged
  if (data.addToBanList && data.personName) {
    appendRow(SHEETS.BAN_LIST, [
      new Date(),
      sanitize(data.personName),
      sanitize(data.personDescription || ''),
      sanitize(data.reason || data.description),
      sanitize(data.reportedBy),
      'Active',
    ]);
  }

  return { message: 'Incident report filed', id: generateId('INC') };
}

function handleMarketingLead(data) {
  validateRequired(data, ['name', 'phone']);

  const row = [
    new Date(),
    sanitize(data.name),
    sanitize(data.phone),
    sanitize(data.email || ''),
    sanitize(data.source || 'Website'),  // 'Website', 'Instagram', 'Referral', etc.
    sanitize(data.interest || ''),
    sanitize(data.promoterId || ''),
    'New Lead',
    '',
  ];

  appendRow(SHEETS.MARKETING, row);
  upsertCustomer(data.name, data.phone, data.email, data.source || 'Marketing');
  return { message: 'Lead captured', id: generateId('MKT') };
}

// ─── Event Upload (Drive-backed) ──────────────────────────────────────────────

/**
 * Saves an event to the Events sheet.
 * If an event file is included (base64), saves it to Google Drive and makes it public.
 *
 * data fields:
 *   eventName, date, dayOfWeek, type, headliner, startTime, endTime,
 *   capacity, coverPrice, vipPrice, description, status,
 *   flyerBase64 (optional), flyerName (optional), flyerMimeType (optional)
 */
function handleEventUpload(data) {
  validateRequired(data, ['eventName', 'date']);

  let flyerUrl    = '';
  let driveFileId = '';
  let thumbUrl    = '';

  // ── Upload event file to Drive ────────────────────────────
  if (data.flyerBase64 && data.flyerBase64.length > 0) {
    const folder   = getOrCreateEventsFolder();
    const fileName = sanitize(data.flyerName || (data.eventName + ' Event File'));

    const mimeMatch = String(data.flyerBase64).match(/^data:([^;]+);base64,/);
    const mimeType = sanitize(data.flyerMimeType || (mimeMatch && mimeMatch[1]) || 'application/octet-stream');
    const base64Clean = String(data.flyerBase64).replace(/^data:[^;]+;base64,/, '');

    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Clean),
      mimeType,
      fileName
    );

    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    driveFileId = file.getId();
    flyerUrl    = `https://drive.google.com/file/d/${driveFileId}/view`;
    thumbUrl    = `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w600`;
  }

  const eventId = generateId('EVT');

  const row = [
    eventId,
    sanitize(data.eventName),
    data.date,
    sanitize(data.dayOfWeek || ''),
    sanitize(data.eventType || 'Regular Night'),
    sanitize(data.headliner || ''),
    sanitize(data.startTime || '20:00'),
    sanitize(data.endTime   || '02:30'),
    Number(data.capacity    || 350),
    0,  // RSVP Count starts at 0
    Number(data.coverPrice  || 0),
    Number(data.vipPrice    || 0),
    sanitize(data.status    || 'Upcoming'),
    sanitize(data.description || ''),
    flyerUrl,
    driveFileId,
    thumbUrl,
    new Date(),  // Created At
  ];

  appendRow(SHEETS.EVENTS, row);

  return {
    message:     'Event published successfully',
    eventId,
    flyerUrl,
    thumbUrl,
    driveFileId,
  };
}

/**
 * Deletes an event's Drive file and removes its row from the Events sheet.
 */
function handleEventDelete(data) {
  validateRequired(data, ['eventId']);

  const ss     = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet  = ss.getSheetByName(SHEETS.EVENTS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol   = headers.indexOf('Event ID');
  const fileCol = headers.indexOf('Drive File ID');

  for (let i = 1; i < values.length; i++) {
    if (values[i][idCol] === sanitize(data.eventId)) {
      // Delete from Drive if file exists
      const fileId = values[i][fileCol];
      if (fileId) {
        try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e) {}
      }
      sheet.deleteRow(i + 1);
      return { message: 'Event deleted: ' + data.eventId };
    }
  }

  throw new Error('Event not found: ' + data.eventId);
}

/**
 * Updates the Status column of an event row.
 */
function handleEventStatusUpdate(data) {
  validateRequired(data, ['eventId', 'status']);

  const ss     = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet  = ss.getSheetByName(SHEETS.EVENTS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol     = headers.indexOf('Event ID');
  const statusCol = headers.indexOf('Status');

  for (let i = 1; i < values.length; i++) {
    if (values[i][idCol] === sanitize(data.eventId)) {
      sheet.getRange(i + 1, statusCol + 1).setValue(sanitize(data.status));
      return { message: 'Status updated to: ' + data.status };
    }
  }

  throw new Error('Event not found: ' + data.eventId);
}

/**
 * Returns upcoming events for the public events page.
 * No auth required — only returns non-cancelled, non-past events.
 */
function getPublicEvents() {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.EVENTS);

  if (!sheet) return { events: [] };

  const data    = sheet.getDataRange().getValues();
  if (data.length < 2) return { events: [] };

  const headers = data[0];
  const today   = new Date();
  today.setHours(0, 0, 0, 0);

  const hiddenStatuses = ['Cancelled', 'Draft'];

  const events = data.slice(1)
    .filter(row => {
      const status    = String(row[headers.indexOf('Status')] || '');
      const eventDate = new Date(row[headers.indexOf('Date')]   || '');
      if (hiddenStatuses.includes(status)) return false;
      // Show events from today onwards; also show events without a parseable date
      if (!isNaN(eventDate.getTime()) && eventDate < today) return false;
      return true;
    })
    .sort((a, b) => {
      const dA = new Date(a[headers.indexOf('Date')] || '');
      const dB = new Date(b[headers.indexOf('Date')] || '');
      return dA - dB;
    })
    .map(row => ({
      eventId:     row[headers.indexOf('Event ID')]    || '',
      eventName:   row[headers.indexOf('Event Name')]  || '',
      date:        row[headers.indexOf('Date')]         || '',
      dayOfWeek:   row[headers.indexOf('Day of Week')] || '',
      type:        row[headers.indexOf('Type')]         || '',
      headliner:   row[headers.indexOf('Headliner')]    || '',
      startTime:   row[headers.indexOf('Start Time')]   || '',
      endTime:     row[headers.indexOf('End Time')]     || '',
      coverPrice:  row[headers.indexOf('Cover Price')]  || 0,
      vipPrice:    row[headers.indexOf('VIP Price')]    || 0,
      status:      row[headers.indexOf('Status')]       || '',
      description: row[headers.indexOf('Description')]  || '',
      flyerUrl:    row[headers.indexOf('Flyer URL')]    || '',
      driveFileId: row[headers.indexOf('Drive File ID')]|| '',
      thumbUrl:    row[headers.indexOf('Thumb URL')]    || '',
    }));

  return { events };
}

/**
 * Gets or creates a "Josephine Events" folder in the script owner's Drive.
 */
function getOrCreateEventsFolder() {
  const folderName = 'Josephine Lounge — Event Flyers';
  const folders    = DriveApp.getFoldersByName(folderName);

  if (folders.hasNext()) {
    return folders.next();
  }

  const folder = DriveApp.createFolder(folderName);
  // Make folder viewable by anyone so thumbnail URLs work
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return folder;
}


// ─── Admin Data Fetchers ──────────────────────────────────────────────────────

function getOverview() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  // Tonight's reservations (today's date)
  const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  const resSheet = ss.getSheetByName(SHEETS.RESERVATIONS);
  const resData  = resSheet.getDataRange().getValues();

  let tonightCount = 0, pendingCount = 0;
  for (let i = 1; i < resData.length; i++) {
    const rowDate = resData[i][5] ? String(resData[i][5]).substring(0, 10) : '';
    if (rowDate === today) tonightCount++;
    if (resData[i][12] === 'New Inquiry') pendingCount++;
  }

  // Total customers
  const custSheet = ss.getSheetByName(SHEETS.CUSTOMERS);
  const totalCustomers = Math.max(0, custSheet.getLastRow() - 1);

  // This week's revenue
  const paySheet = ss.getSheetByName(SHEETS.PAYMENTS);
  const payData  = paySheet.getDataRange().getValues();
  const weekAgo  = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  let weekRevenue = 0;
  for (let i = 1; i < payData.length; i++) {
    const rowDate = new Date(payData[i][0]);
    if (rowDate >= weekAgo) weekRevenue += Number(payData[i][2]) || 0;
  }

  // Open incidents
  const incSheet = ss.getSheetByName(SHEETS.INCIDENTS);
  const incData  = incSheet.getDataRange().getValues();
  let openIncidents = 0;
  for (let i = 1; i < incData.length; i++) {
    if (incData[i][8] === 'Open') openIncidents++;
  }

  // Recent reservations (last 20)
  const recentRes = resData.slice(1).slice(-20).reverse().map(r => ({
    timestamp:  r[0],
    id:         r[1],
    name:       r[2],
    phone:      r[3],
    date:       r[5],
    guests:     r[7],
    occasion:   r[8],
    status:     r[12],
  }));

  // Low inventory items
  const invSheet = ss.getSheetByName(SHEETS.INVENTORY);
  const invData  = invSheet.getDataRange().getValues();
  const lowStock = [];
  for (let i = 1; i < invData.length; i++) {
    const current = Number(invData[i][3]);
    const reorder = Number(invData[i][5]);
    if (current <= reorder) {
      lowStock.push({ item: invData[i][1], current, reorder, category: invData[i][2] });
    }
  }

  return {
    stats: {
      tonightReservations: tonightCount,
      pendingApprovals: pendingCount,
      totalCustomers,
      weekRevenue: weekRevenue.toFixed(2),
      openIncidents,
      lowStockItems: lowStock.length,
    },
    recentReservations: recentRes,
    lowStock: lowStock.slice(0, 10),
    generatedAt: new Date().toISOString(),
  };
}

function getSheet(sheetName, limit) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { rows: [], headers: [], error: 'Sheet not found: ' + sheetName };

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { rows: [], headers: data[0] || [] };

  const headers = data[0];
  const rows    = data.slice(1).slice(-limit).reverse().map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] instanceof Date
        ? Utilities.formatDate(row[i], CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm')
        : row[i];
    });
    return obj;
  });

  return { headers, rows, total: data.length - 1 };
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

function appendRow(sheetName, row) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);
  sheet.appendRow(row);
}

function upsertCustomer(name, phone, email, source) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.CUSTOMERS);
    const data  = sheet.getDataRange().getValues();
    const phoneCol = 2; // Column C (0-indexed: 2)

    const cleanPhone = sanitize(phone).replace(/\D/g, '');

    for (let i = 1; i < data.length; i++) {
      const existing = String(data[i][phoneCol]).replace(/\D/g, '');
      if (existing === cleanPhone) {
        // Update visit count + last visit
        const visits = (Number(data[i][6]) || 0) + 1;
        sheet.getRange(i + 1, 7).setValue(visits);
        sheet.getRange(i + 1, 8).setValue(new Date());
        return;
      }
    }

    // New customer
    sheet.appendRow([
      new Date(),
      sanitize(name),
      sanitize(phone),
      sanitize(email || ''),
      sanitize(source),
      '',       // Notes
      1,        // Visit count
      new Date(), // Last visit
      'Active',
    ]);
  } catch (e) {
    // Non-critical — log but don't throw
    logEntry('upsertCustomer', 'warning', e.message);
  }
}

function updateRevenueLog(amount, category) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.REVENUE);
    const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
    const data  = sheet.getDataRange().getValues();

    // Find today's row
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).substring(0, 10) === today && data[i][1] === sanitize(category)) {
        const total = (Number(data[i][2]) || 0) + Number(amount);
        sheet.getRange(i + 1, 3).setValue(total);
        return;
      }
    }

    // New row for today
    sheet.appendRow([today, sanitize(category), Number(amount), 1]);
  } catch (e) {
    logEntry('updateRevenueLog', 'warning', e.message);
  }
}

function sanitize(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/[<>'"]/g, '')      // Strip HTML/injection chars
    .replace(/[\r\n\t]/g, ' ')  // Flatten newlines
    .trim()
    .substring(0, 500);          // Hard cap
}

function validateRequired(data, fields) {
  for (const field of fields) {
    if (!data[field] || String(data[field]).trim() === '') {
      throw new Error('Missing required field: ' + field);
    }
  }
}

function generateId(prefix) {
  const ts = new Date().getTime().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

function jsonResponse(obj, status) {
  const output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function logEntry(action, status, details) {
  try {
    appendRow(SHEETS.LOGS, [
      new Date(),
      action,
      status,
      details || '',
    ]);
  } catch (e) {
    // Silently fail — logging should never break the main flow
  }
}
