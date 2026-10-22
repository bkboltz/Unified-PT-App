/**
 * Google Apps Script Web App Client
 * Handles score submissions, QR/manual check-ins, and live attendance feeds.
 */

export const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbz1SM4xMT2494GP2Sc4kGPWvt7W4vfFzhDDNwqO0fI9liMaXZ_HQnLni3zzqKxGo_kB/exec';

export const SPREADSHEET_ID = '1MV481IOSrWeUvYMrEfCWeXnCfoNnDuhplrsq_CNkJys';

export const EXCEL_EXPORT_URLS = {
  scores: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=xlsx&gid=0`,
  checkins: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=xlsx&gid=1146342773`
};

/**
 * Generic POST helper using no-cors mode for Google Apps Script.
 */
async function postToAppsScript(payload) {
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return { success: true };
  } catch (err) {
    console.error('Apps Script Submission Error:', err);
    return { success: false, error: err };
  }
}

/**
 * Submits an official PT score to Google Sheets.
 */
export async function submitScore(scoreData) {
  const payload = {
    type: 'score_submission',
    ...scoreData,
    timestamp: new Date().toLocaleString()
  };
  return postToAppsScript(payload);
}

/**
 * Submits an Airman check-in (QR Scan or Manual Entry).
 */
export async function submitCheckIn({ rank, firstName, lastName, method = 'QR Scan' }) {
  const payload = {
    type: 'checkin',
    rank,
    firstName,
    lastName,
    method,
    timestamp: new Date().toLocaleString()
  };
  return postToAppsScript(payload);
}

/**
 * Fetches active check-ins for today from the Google Sheet.
 */
export async function fetchLiveCheckIns() {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?type=checkins`);
    const data = await res.json();
    if (Array.isArray(data)) {
      const normalized = data.map(item => ({
        timestamp: item.timestamp || item.Rank || '',
        rank: item.rank || item['First Name'] || '',
        firstName: item.firstName || item['Last Name'] || '',
        lastName: item.lastName || item['Check-in Method'] || '',
        method: item.method || item[''] || 'QR Scan'
      }));

      const todayStr = new Date().toLocaleDateString();
      const filtered = normalized.filter(item => {
        if (!item.timestamp) return false;
        return new Date(item.timestamp).toLocaleDateString() === todayStr;
      });
      return { success: true, data: filtered.reverse() };
    }
    return { success: true, data: [] };
  } catch (err) {
    console.error('Error fetching live check-ins:', err);
    return { success: false, error: err, data: [] };
  }
}
