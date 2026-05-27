/**
 * JOSEPHINE LOUNGE — Sheet Initializer
 *
 * Run setupAllSheets() ONCE from the Apps Script editor to create
 * all 18 tabs with correct headers and formatting.
 *
 * Steps:
 *   1. Open your Google Spreadsheet
 *   2. Extensions > Apps Script
 *   3. Paste both Code.gs and SheetSetup.gs
 *   4. Set CONFIG.SPREADSHEET_ID in Code.gs to your Sheet ID
 *   5. Run setupAllSheets() from this file
 *   6. Run setAdminPassword() from Code.gs with your chosen password
 *   7. Deploy as Web App
 */

function setupAllSheets() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  const schemas = {

    'Dashboard': {
      headers: ['Metric', 'Value', 'Last Updated'],
      freeze: 1,
      color: '#1a1a1a',
      rows: [
        ['Tonight Reservations', '=COUNTIFS(Reservations!F:F,TEXT(TODAY(),"yyyy-mm-dd"))', new Date()],
        ['Total Customers',       '=COUNTA(Customers!B:B)-1',                               new Date()],
        ['This Week Revenue',     '=SUMIFS(Payments!C:C,Payments!A:A,">="&TODAY()-7)',       new Date()],
        ['Pending Reservations',  '=COUNTIF(Reservations!M:M,"New Inquiry")',               new Date()],
        ['Open Incidents',        '=COUNTIF(Incidents!I:I,"Open")',                         new Date()],
        ['Active Staff',          '=COUNTIF(Staff!I:I,"Active")',                           new Date()],
        ['Low Stock Items',       '=SUMPRODUCT((Inventory!D2:D1000<=Inventory!F2:F1000)*1)',new Date()],
      ]
    },

    'Reservations': {
      headers: ['Timestamp','Reservation ID','Full Name','Phone','Email','Preferred Date','Arrival Time','Party Size','Occasion','Referral Source','Special Requests','Source Page','Status','Follow-Up Required','Last Contacted','Notes'],
      freeze: 1,
      color: '#0d1b2a',
      widths: [140, 130, 170, 130, 190, 120, 110, 110, 150, 150, 240, 220, 130, 140, 140, 220],
    },

    'Customers': {
      headers: ['Created At','Name','Phone','Email','Source','Notes','Visit Count','Last Visit','Status'],
      freeze: 1,
      color: '#1a0d2e',
      widths: [140, 160, 130, 200, 120, 220, 90, 140, 90],
    },

    'Events': {
      headers: ['Event ID','Event Name','Date','Day of Week','Type','Headliner','Start Time','End Time','Capacity','RSVP Count','Cover Price','VIP Price','Status','Description','Flyer URL','Drive File ID','Thumb URL','Created At'],
      freeze: 1,
      color: '#1a0a00',
      widths: [110, 200, 110, 110, 120, 160, 100, 100, 90, 90, 100, 100, 100, 220, 280, 200, 280, 140],
      sampleData: [
        ['EVT-001','Friday Night AfroBeat', '2026-06-06','Friday','Regular Night','DJ Kofi','20:00','02:30',350,0,20,150,'Upcoming','AfroBeat, Afropop and Amapiano all night','','','',new Date()],
        ['EVT-002','World Cup Watch Party', '2026-06-15','Monday','Special Event','Live Band','16:00','00:00',200,0,10,100,'Planning','Watch the World Cup opener live with Atlanta\'s most vibrant crowd','','','',new Date()],
        ['EVT-003','Saturday Vibes',        '2026-06-07','Saturday','Regular Night','DJ Amara','20:00','02:30',350,0,20,150,'Upcoming','Your favourite Saturday night experience','','','',new Date()],
      ]
    },

    'Inventory': {
      headers: ['Added At','Item Name','Category','Current Stock','Unit','Reorder Level','Cost/Unit','Supplier','Last Updated','Updated By'],
      freeze: 1,
      color: '#0d1a0d',
      widths: [140,180,120,110,80,110,100,160,140,130],
      sampleData: [
        [new Date(),'Hennessy VS 750ml','Spirits',12,'Bottles',6,32,'Atlanta Spirits Co.',new Date(),'Setup'],
        [new Date(),'Don Julio 1942','Spirits',6,'Bottles',3,95,'Premium Distributors',new Date(),'Setup'],
        [new Date(),'Moët & Chandon Imperial','Champagne',24,'Bottles',12,38,'Luxury Wines ATL',new Date(),'Setup'],
        [new Date(),'Ace of Spades Brut','Champagne',12,'Bottles',6,185,'Luxury Wines ATL',new Date(),'Setup'],
        [new Date(),'Grey Goose Vodka','Spirits',18,'Bottles',8,28,'Atlanta Spirits Co.',new Date(),'Setup'],
        [new Date(),'Patron Silver','Tequila',10,'Bottles',4,40,'Premium Distributors',new Date(),'Setup'],
        [new Date(),'Bombay Sapphire','Gin',8,'Bottles',4,22,'Atlanta Spirits Co.',new Date(),'Setup'],
        [new Date(),'Johnnie Walker Black','Whiskey',15,'Bottles',6,30,'Premium Distributors',new Date(),'Setup'],
        [new Date(),'Club Soda','Mixers',48,'Cans',24,0.75,'Restaurant Depot',new Date(),'Setup'],
        [new Date(),'Cranberry Juice','Mixers',24,'Liters',12,3.50,'Restaurant Depot',new Date(),'Setup'],
        [new Date(),'Fresh Limes','Produce',5,'Bags (20ct)',3,4,'Local Market',new Date(),'Setup'],
        [new Date(),'Cocktail Napkins','Supplies',500,'Units',200,0.05,'Restaurant Depot',new Date(),'Setup'],
        [new Date(),'VIP Wristbands','Supplies',200,'Units',50,0.25,'Event Supplies',new Date(),'Setup'],
        [new Date(),'Solo Cups 12oz','Supplies',1000,'Units',300,0.08,'Restaurant Depot',new Date(),'Setup'],
      ]
    },

    'Inventory Counts': {
      headers: ['Timestamp','Item Name','Category','Expected','Counted','Variance','Counted By','Notes'],
      freeze: 1,
      color: '#0d1a0d',
      widths: [140,180,120,90,90,90,140,220],
    },

    'Staff': {
      headers: ['Staff ID','Name','Role','Phone','Email','Start Date','Hourly Rate','Emergency Contact','Status','Notes'],
      freeze: 1,
      color: '#1a1a0d',
      widths: [100,160,130,130,200,110,100,200,90,220],
      sampleData: [
        ['STF-001','[Manager Name]','General Manager','404-XXX-XXXX','','2024-01-01',0,'','Active','Owner/Manager'],
        ['STF-002','[Bartender 1]','Bartender','404-XXX-XXXX','','2024-01-01',18,'','Active','Lead bar'],
        ['STF-003','[Security 1]','Security','404-XXX-XXXX','','2024-01-01',20,'','Active','Door'],
        ['STF-004','[DJ Name]',   'DJ',       '404-XXX-XXXX','','2024-01-01',250,'','Active','Friday/Saturday'],
      ]
    },

    'Payroll': {
      headers: ['Timestamp','Staff ID','Staff Name','Action','Clock Time','Notes'],
      freeze: 1,
      color: '#1a1a0d',
      widths: [140,100,160,100,140,220],
    },

    'Revenue': {
      headers: ['Date','Category','Amount','Transaction Count','Notes'],
      freeze: 1,
      color: '#0d1a1a',
      widths: [120,160,120,140,220],
    },

    'Expenses': {
      headers: ['Date','Category','Description','Amount','Vendor','Receipt #','Paid By','Notes'],
      freeze: 1,
      color: '#1a0d0d',
      widths: [120,140,220,110,160,100,130,220],
    },

    'Marketing': {
      headers: ['Timestamp','Name','Phone','Email','Source','Interest','Promoter ID','Status','Notes'],
      freeze: 1,
      color: '#1a001a',
      widths: [140,160,130,200,120,180,110,110,220],
    },

    'Promoters': {
      headers: ['Promoter ID','Name','Phone','Email','Instagram','Commission Rate','Total Leads','Total Paid','Status','Notes'],
      freeze: 1,
      color: '#1a001a',
      widths: [110,160,130,200,160,120,90,100,90,220],
    },

    'Payments': {
      headers: ['Timestamp','Payment ID','Amount','Category','Method','Customer','Notes','Recorded By'],
      freeze: 1,
      color: '#0d1a0d',
      widths: [140,120,110,140,100,160,220,130],
    },

    'Incidents': {
      headers: ['Timestamp','Incident ID','Type','Severity','Description','Persons Involved','Action Taken','Reported By','Status','Resolved By','Resolved At'],
      freeze: 1,
      color: '#1a0d0d',
      widths: [140,120,130,100,280,200,200,140,90,140,140],
    },

    'Ban List': {
      headers: ['Added At','Name','Description','Reason','Added By','Status','Notes'],
      freeze: 1,
      color: '#1a0000',
      widths: [140,160,220,280,140,90,220],
    },

    'Lost & Found': {
      headers: ['Date Found','Description','Location Found','Owner Name','Owner Phone','Returned','Returned To','Return Date','Notes'],
      freeze: 1,
      color: '#0d0d1a',
      widths: [120,220,160,160,130,90,160,120,220],
    },

    'Settings': {
      headers: ['Key','Value','Description'],
      freeze: 1,
      color: '#111111',
      rows: [
        ['venue_name',         'Josephine Lounge',         'Venue display name'],
        ['admin_password_hash','',                          'Run setAdminPassword() to set'],
        ['admin_session_token','',                          'Auto-managed — do not edit'],
        ['admin_session_expiry','',                         'Auto-managed — do not edit'],
        ['whatsapp_number',    '16789734441',               'WhatsApp contact number'],
        ['venue_address',      '3277 Buford Highway, Brookhaven, GA 30329', 'Full address'],
        ['venue_phone',        '(678) 973-4441',            'Display phone'],
        ['timezone',           'America/New_York',          'Server timezone'],
        ['script_version',     '1.0.0',                     'Apps Script version'],
        ['setup_complete',     'TRUE',                      'Set to TRUE after setup'],
      ]
    },

    'Logs': {
      headers: ['Timestamp','Action','Status','Details'],
      freeze: 1,
      color: '#111111',
      widths: [160,160,90,400],
    },

  };

  const results = [];

  for (const [name, schema] of Object.entries(schemas)) {
    try {
      let sheet = ss.getSheetByName(name);

      // Create if missing
      if (!sheet) {
        sheet = ss.insertSheet(name);
        Logger.log('Created sheet: ' + name);
      } else {
        sheet.clearContents();
        Logger.log('Cleared existing sheet: ' + name);
      }

      // Set headers
      sheet.getRange(1, 1, 1, schema.headers.length)
        .setValues([schema.headers])
        .setBackground('#c9a84c')
        .setFontColor('#0a0a0a')
        .setFontWeight('bold')
        .setFontFamily('Arial')
        .setFontSize(10);

      // Freeze header row
      sheet.setFrozenRows(schema.freeze || 1);

      // Set column widths if provided
      if (schema.widths) {
        schema.widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));
      }

      // Write preset rows
      if (schema.rows && schema.rows.length > 0) {
        sheet.getRange(2, 1, schema.rows.length, schema.headers.length)
          .setValues(schema.rows);
      }

      // Write sample data
      if (schema.sampleData && schema.sampleData.length > 0) {
        sheet.getRange(2, 1, schema.sampleData.length, schema.headers.length)
          .setValues(schema.sampleData);
      }

      // Set tab color
      sheet.setTabColor(schema.color || '#111111');

      // Alternate row shading for data sheets
      if (sheet.getMaxRows() > 2) {
        const rule = SpreadsheetApp.newConditionalFormatRule()
          .whenFormulaSatisfied('=MOD(ROW(),2)=0')
          .setBackground('#1a1a1a')
          .setRanges([sheet.getRange('A2:Z1000')])
          .build();
        sheet.setConditionalFormatRules([rule]);
      }

      results.push({ sheet: name, status: 'OK' });

    } catch (err) {
      results.push({ sheet: name, status: 'ERROR', error: err.message });
      Logger.log('Error on ' + name + ': ' + err.message);
    }
  }

  // Delete the default "Sheet1" if it still exists
  try {
    const def = ss.getSheetByName('Sheet1');
    if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
  } catch (e) {}

  Logger.log('Setup complete: ' + JSON.stringify(results));
  SpreadsheetApp.getUi().alert(
    'Setup Complete!\n\n' +
    results.map(r => r.sheet + ': ' + r.status + (r.error ? ' — ' + r.error : '')).join('\n') +
    '\n\nNext step: Run setAdminPassword() in Code.gs'
  );
}
