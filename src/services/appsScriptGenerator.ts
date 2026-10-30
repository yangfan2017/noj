export interface AppsScriptConfigOptions {
  spreadsheetId?: string;
  sheetName?: string;
  appUrl?: string;
}

export const generateAppsScriptCode = (options: AppsScriptConfigOptions): string => {
  const currentOrigin = options.appUrl || window.location.origin;
  const webhookEndpoint = `${currentOrigin}/api/attendance/webhook`;

  return `/**
 * =========================================================================
 * CIT COMPUTER TRAINING INSTITUTE, BOMDILA
 * Smart Attendance Management - Instant Google Form Sync Script
 * =========================================================================
 * 
 * JAB BHI KOI STUDENT QR SCAN KARKE FORM SUBMIT KAREGA:
 * Yeh script khud ba khud naye data ko CIT Attendance Software mein bhej dega!
 * 
 * KAISE SETUP KAREIN (Only 2 Minutes):
 * 1. Apne Attendance wale Google Sheet mein jayein.
 * 2. Top menu mein click karein: Extensions -> Apps Script
 * 3. Purana code hata kar yeh poora code paste kar dein.
 * 4. Upar 'Save' icon (Ctrl+S) dabayein.
 * 5. Baayein taraf 'Triggers' icon (Alarm Clock) par click karein:
 *    - Click 'Add Trigger' (Neeche right side blue button)
 *    - 'Choose which function to run': onFormSubmitTrigger
 *    - 'Select event source': From spreadsheet
 *    - 'Select event type': On form submit
 *    - Click 'Save' aur Google permission allow kar dein.
 * 
 * Bas! Ab jab bhi student QR scan karke submit karega, data turant software mein aayega!
 * =========================================================================
 */

var WEBHOOK_URL = "${webhookEndpoint}";

/**
 * Trigger: Runs automatically within seconds whenever a student submits the Google Form!
 */
function onFormSubmitTrigger(e) {
  try {
    var namedValues = e ? e.namedValues : null;
    var values = e ? e.values : null;

    // Fallback: If run manually or without event parameters, get latest row
    if (!namedValues && !values) {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        var rowData = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];
        namedValues = {};
        for (var i = 0; i < headers.length; i++) {
          namedValues[headers[i]] = [rowData[i]];
        }
      }
    }

    Logger.log("Sending response to CIT Attendance App: " + JSON.stringify(namedValues));

    var payload = JSON.stringify({
      source: "google_form_instant_trigger",
      timestamp: new Date().toISOString(),
      namedValues: namedValues,
      values: values
    });

    var options = {
      method: "post",
      contentType: "application/json",
      payload: payload,
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    Logger.log("Server response: " + response.getContentText());
  } catch (error) {
    Logger.log("Error in onFormSubmitTrigger: " + error.toString());
  }
}

/**
 * Ek Click mein purane sabhi historical attendance records ko software mein bhejne ke liye:
 * Apps Script editor mein 'syncAllPastRecords' select karke 'Run' dabayein!
 */
function syncAllPastRecords() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    if (!data || data.length < 2) {
      Logger.log("No attendance data found in sheet.");
      return;
    }

    var headers = data[0];
    Logger.log("Total records to sync: " + (data.length - 1));

    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var namedValues = {};
      for (var c = 0; c < headers.length; c++) {
        var headerName = headers[c];
        var cellVal = row[c];
        if (cellVal instanceof Date) {
          cellVal = Utilities.formatDate(cellVal, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
        }
        namedValues[headerName] = [cellVal];
      }

      var payload = JSON.stringify({
        source: "google_sheet_bulk_sync",
        namedValues: namedValues
      });

      UrlFetchApp.fetch(WEBHOOK_URL, {
        method: "post",
        contentType: "application/json",
        payload: payload,
        muteHttpExceptions: true
      });
    }

    Logger.log("All past records successfully synced to CIT Attendance Software!");
  } catch (err) {
    Logger.log("Sync error: " + err.toString());
  }
}
`;
};
