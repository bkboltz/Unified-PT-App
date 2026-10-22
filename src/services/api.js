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
 * Formats a Date object as a local YYYY-MM-DD string.
 */
export function toLocalDateKey(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Fetches check-ins from the Google Sheet (both today's and full history).
 */
export async function fetchLiveCheckIns() {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?type=checkins`);
    const data = await res.json();
    if (Array.isArray(data)) {
      const normalized = data
        .map((item) => {
          const explicitTime =
            item['Date/Time'] || item.Timestamp || item.timestamp || item.dateTime || '';

          // Shifted format fallback: item.Rank contains a date string when Date/Time header was missing
          const isShifted = !explicitTime && item.Rank && !isNaN(Date.parse(item.Rank));
          if (isShifted) {
            const ts = item.Rank;
            return {
              timestamp: ts,
              dateKey: toLocalDateKey(ts),
              rank: String(item['First Name'] || '').trim(),
              firstName: String(item['Last Name'] || '').trim(),
              lastName: String(item['Check-in Method'] || '').trim(),
              method: String(item[''] || item.method || 'QR Scan').trim()
            };
          }

          const ts = explicitTime;
          return {
            timestamp: ts,
            dateKey: toLocalDateKey(ts),
            rank: String(item.Rank || item.rank || '').trim(),
            firstName: String(item['First Name'] || item.firstName || '').trim(),
            lastName: String(item['Last Name'] || item.lastName || '').trim(),
            method: String(item['Check-in Method'] || item.method || 'QR Scan').trim()
          };
        })
        .filter((item) => item.timestamp && item.dateKey && (item.lastName || item.firstName));

      const todayKey = toLocalDateKey(new Date());
      const allReversed = [...normalized].reverse();
      const todayFiltered = allReversed.filter((item) => item.dateKey === todayKey);

      return {
        success: true,
        data: todayFiltered,
        allCheckIns: allReversed,
        todayKey
      };
    }
    return { success: true, data: [], allCheckIns: [], todayKey: toLocalDateKey(new Date()) };
  } catch (err) {
    console.error('Error fetching live check-ins:', err);
    return {
      success: false,
      error: err,
      data: [],
      allCheckIns: [],
      todayKey: toLocalDateKey(new Date())
    };
  }
}
