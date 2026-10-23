/**
 * Google Sheets & Apps Script Web App Client
 * Handles score submissions, QR/manual check-ins, live attendance feeds, and direct PT score analytics.
 */

export const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbz1SM4xMT2494GP2Sc4kGPWvt7W4vfFzhDDNwqO0fI9liMaXZ_HQnLni3zzqKxGo_kB/exec';

export const SPREADSHEET_ID = '1MV481IOSrWeUvYMrEfCWeXnCfoNnDuhplrsq_CNkJys';

export const EXCEL_EXPORT_URLS = {
  scores: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=xlsx&gid=0`,
  checkins: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=xlsx&gid=1146342773`
};

export const CSV_EXPORT_URLS = {
  scores: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`,
  scoresGviz: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=0`,
  checkins: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=1146342773`,
  checkinsGviz: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=1146342773`
};

const OFFICER_RANKS = new Set([
  '2d Lt',
  '1st Lt',
  'Capt',
  'Maj',
  'Lt Col',
  'Col',
  'Brig Gen',
  'Maj Gen',
  'Lt Gen',
  'Gen'
]);

/**
 * RFC-4180 compliant CSV parser that handles quoted strings, commas inside quotes, and CRLF/LF newlines.
 */
export function parseCsvRows(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\r' && next === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

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
    timestamp: new Date().toLocaleString('en-US')
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
    timestamp: new Date().toLocaleString('en-US')
  };
  return postToAppsScript(payload);
}

/**
 * Parses a timestamp from Google Sheets, handling both US locale
 * ("4/28/2026, 8:24:12 AM") and 24-hour DD/MM/YYYY locales
 * ("28/04/2026, 08:24:12" or "08/09/2026, 7:30:56").
 */
export function parseSheetTimestamp(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }

  const str = String(dateInput).trim();
  const slashMatch = str.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?)?/i
  );

  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    const hasLeadingZeroFirst =
      slashMatch[1].length === 2 && slashMatch[1].startsWith('0');
    const hasAmPm = Boolean(slashMatch[7]);
    const hasTime = slashMatch[4] !== undefined;

    // Treat as DD/MM/YYYY if first number > 12, or if formatted by a 24h
    // DD/MM/YYYY locale (leading zero on day + 24h time without AM/PM)
    const isDayFirst =
      first > 12 || (second <= 12 && hasLeadingZeroFirst && hasTime && !hasAmPm);

    const month = isDayFirst ? second : first;
    const day = isDayFirst ? first : second;

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      let hours = slashMatch[4] !== undefined ? Number(slashMatch[4]) : 0;
      const mins = slashMatch[5] !== undefined ? Number(slashMatch[5]) : 0;
      const secs = slashMatch[6] !== undefined ? Number(slashMatch[6]) : 0;
      const mer = (slashMatch[7] || '').toUpperCase();

      if (mer === 'PM' && hours < 12) hours += 12;
      if (mer === 'AM' && hours === 12) hours = 0;

      const dt = new Date(year, month - 1, day, hours, mins, secs);
      if (!isNaN(dt.getTime())) return dt;
    }
  }

  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Formats a Date object or date string as a local YYYY-MM-DD string.
 */
export function toLocalDateKey(dateInput) {
  const d = parseSheetTimestamp(dateInput);
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a numeric point value or returns null when Exempt/invalid.
 */
function parsePointValue(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (!s || s.toLowerCase().includes('exempt')) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/**
 * Normalizes a raw 18-column row from the PT Scores Google Sheet (GID 0).
 * Columns:
 * 0: Date/Time | 1: Rank | 2: First Name | 3: Last Name | 4: Sex | 5: Age
 * 6: WHtR | 7: Cardio Component | 8: Time/Shuttles | 9: Points
 * 10: Strength Component | 11: Reps | 12: Score
 * 13: Core Components | 14: Reps/Time | 15: Score
 * 16: Total Score | 17: Pass/Fail
 */
function normalizeScoreRow(cols, idx) {
  const timestamp = String(cols[0] || '').trim();
  const rank = String(cols[1] || '').trim();
  const firstName = String(cols[2] || '').trim();
  const lastName = String(cols[3] || '').trim();
  const gender = String(cols[4] || '').trim().toLowerCase() || 'male';
  const ageRaw = parseInt(cols[5], 10);
  const age = isNaN(ageRaw) ? null : ageRaw;

  const whtrRaw = String(cols[6] ?? '').trim();
  const whtrPts = parsePointValue(whtrRaw);
  const whtrExempt = whtrRaw.toLowerCase() === 'exempt';

  const cardioType = String(cols[7] || '').trim() || '2-Mile Run';
  const cardioInput = String(cols[8] || '').trim();
  const cardioRaw = String(cols[9] ?? '').trim();
  const cardioPts = parsePointValue(cardioRaw);
  const cardioExempt =
    cardioType.toLowerCase() === 'exempt' || cardioRaw.toLowerCase() === 'exempt';

  const upperType = String(cols[10] || '').trim() || 'Standard Push-ups';
  const upperInput = String(cols[11] || '').trim();
  const upperRaw = String(cols[12] ?? '').trim();
  const upperPts = parsePointValue(upperRaw);
  const upperExempt =
    upperType.toLowerCase() === 'exempt' || upperRaw.toLowerCase() === 'exempt';

  const coreType = String(cols[13] || '').trim() || 'Standard Sit-ups';
  const coreInput = String(cols[14] || '').trim();
  const coreRaw = String(cols[15] ?? '').trim();
  const corePts = parsePointValue(coreRaw);
  const coreExempt =
    coreType.toLowerCase() === 'exempt' || coreRaw.toLowerCase() === 'exempt';

  const totalRaw = String(cols[16] ?? '').trim();
  const totalScore = parsePointValue(totalRaw);
  const passFailRaw = String(cols[17] || '').trim();

  const dateKey = toLocalDateKey(timestamp);
  const dateObj = parseSheetTimestamp(timestamp);
  const epochMs = !dateObj ? 0 : dateObj.getTime();
  const isWalk = cardioType.toLowerCase().includes('walk');

  let status = 'Pass';
  if (
    passFailRaw.toLowerCase() === 'exempt' ||
    totalRaw.toLowerCase() === 'exempt'
  ) {
    status = 'Exempt';
  } else if (passFailRaw.toLowerCase() === 'fail') {
    status = 'Fail';
  } else if (passFailRaw.toLowerCase() === 'pass') {
    status = 'Pass';
  } else if (totalScore !== null && totalScore < 75) {
    status = 'Fail';
  }

  let tier = 'Satisfactory';
  if (status === 'Exempt') {
    tier = 'Exempt';
  } else if (status === 'Fail') {
    tier = 'Fail';
  } else if (!isWalk && totalScore !== null && totalScore >= 90) {
    tier = 'Excellent';
  } else {
    tier = 'Satisfactory';
  }

  // Diagnostic failure / point-loss reasons
  const failureReasons = [];

  if (!cardioExempt && !isWalk && cardioPts === 0) {
    failureReasons.push(
      `Cardio Min Failed (${cardioType}${cardioInput ? `: ${cardioInput}` : ''})`
    );
  } else if (isWalk && cardioRaw.toLowerCase().includes('fail')) {
    failureReasons.push(`Walk Time Exceeded (${cardioInput || 'Fail'})`);
  }

  if (!upperExempt && upperPts === 0) {
    failureReasons.push(
      `Strength Min Failed (${upperType}${upperInput ? `: ${upperInput}` : ''})`
    );
  }

  if (!coreExempt && corePts === 0) {
    failureReasons.push(
      `Core Min Failed (${coreType}${coreInput ? `: ${coreInput}` : ''})`
    );
  }

  if (status === 'Fail' && totalScore !== null && totalScore < 75) {
    if (failureReasons.length === 0) {
      failureReasons.push(`Composite Below 75 (${totalScore} pts)`);
    } else {
      failureReasons.push(`Total: ${totalScore} pts`);
    }
  }

  // Identify lowest-performing non-exempt component by % of max points
  const componentPerformances = [];
  if (!whtrExempt && whtrPts !== null) {
    componentPerformances.push({
      name: 'Body Comp',
      pts: whtrPts,
      max: 20,
      pct: (whtrPts / 20) * 100
    });
  }
  if (!cardioExempt && !isWalk && cardioPts !== null) {
    componentPerformances.push({
      name: 'Cardio',
      pts: cardioPts,
      max: 50,
      pct: (cardioPts / 50) * 100
    });
  }
  if (!upperExempt && upperPts !== null) {
    componentPerformances.push({
      name: 'Strength',
      pts: upperPts,
      max: 15,
      pct: (upperPts / 15) * 100
    });
  }
  if (!coreExempt && corePts !== null) {
    componentPerformances.push({
      name: 'Core',
      pts: corePts,
      max: 15,
      pct: (corePts / 15) * 100
    });
  }

  componentPerformances.sort((a, b) => a.pct - b.pct);
  const weakestComponent = componentPerformances[0] || null;

  const rankCategory = OFFICER_RANKS.has(rank) ? 'Officer' : 'Enlisted';
  const fullName = `${firstName} ${lastName}`.trim();
  const memberKey = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;

  return {
    id: `score-${idx}-${dateKey}`,
    timestamp,
    dateKey,
    epochMs,
    rank,
    rankCategory,
    firstName,
    lastName,
    fullName,
    memberKey,
    gender,
    age,
    whtrPts,
    whtrExempt,
    cardioType,
    cardioInput,
    cardioPts,
    cardioExempt,
    isWalk,
    walkPassed: isWalk ? !cardioRaw.toLowerCase().includes('fail') : null,
    upperType,
    upperInput,
    upperPts,
    upperExempt,
    coreType,
    coreInput,
    corePts,
    coreExempt,
    totalScore,
    status,
    tier,
    failureReasons,
    weakestComponent
  };
}

/**
 * Fetches all PT test scores directly from the Google Sheet (GID 0).
 */
export async function fetchPtScores() {
  const urlsToTry = [CSV_EXPORT_URLS.scores, CSV_EXPORT_URLS.scoresGviz];

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const csvText = await res.text();
      const rows = parseCsvRows(csvText);
      if (rows.length <= 1) {
        return { success: true, scores: [] };
      }

      // Skip header row (index 0)
      const dataRows = rows.slice(1);
      const parsed = dataRows
        .map((cols, idx) => normalizeScoreRow(cols, idx))
        .filter((item) => item.dateKey && (item.lastName || item.firstName));

      // Sort newest first
      parsed.sort((a, b) => {
        if (b.dateKey !== a.dateKey) return b.dateKey.localeCompare(a.dateKey);
        return b.epochMs - a.epochMs;
      });

      return {
        success: true,
        scores: parsed
      };
    } catch (err) {
      console.warn('Direct CSV score fetch attempt failed for', url, err);
    }
  }

  return {
    success: false,
    scores: []
  };
}

/**
 * Fetches check-ins from the Google Sheet (both today's and full history).
 * Uses Direct Google Sheets CSV first for speed, with Apps Script endpoint fallback.
 */
export async function fetchLiveCheckIns() {
  const todayKey = toLocalDateKey(new Date());

  // 1. Try fast direct CSV read from GID 1146342773 first, then Apps Script
  try {
    const res = await fetch(CSV_EXPORT_URLS.checkins);
    if (res.ok) {
      const csvText = await res.text();
      const rows = parseCsvRows(csvText);
      if (rows.length > 1) {
        const normalized = rows
          .slice(1)
          .map((cols) => {
            const ts = String(cols[0] || '').trim();
            return {
              timestamp: ts,
              dateKey: toLocalDateKey(ts),
              rank: String(cols[1] || '').trim(),
              firstName: String(cols[2] || '').trim(),
              lastName: String(cols[3] || '').trim(),
              method: String(cols[4] || 'QR Scan').trim()
            };
          })
          .filter((item) => item.timestamp && item.dateKey && (item.lastName || item.firstName));

        const allReversed = [...normalized].reverse();
        const todayFiltered = allReversed.filter((item) => item.dateKey === todayKey);

        return {
          success: true,
          data: todayFiltered,
          allCheckIns: allReversed,
          todayKey
        };
      }
    }
  } catch (csvErr) {
    console.warn('Direct CSV check-in fetch fallback to Apps Script:', csvErr);
  }

  // 2. Fallback to Apps Script JSON endpoint
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?type=checkins`);
    const data = await res.json();
    if (Array.isArray(data)) {
      const normalized = data
        .map((item) => {
          const explicitTime =
            item['Date/Time'] || item.Timestamp || item.timestamp || item.dateTime || '';

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

      const allReversed = [...normalized].reverse();
      const todayFiltered = allReversed.filter((item) => item.dateKey === todayKey);

      return {
        success: true,
        data: todayFiltered,
        allCheckIns: allReversed,
        todayKey
      };
    }
    return { success: true, data: [], allCheckIns: [], todayKey };
  } catch (err) {
    console.error('Error fetching live check-ins:', err);
    return {
      success: false,
      error: err,
      data: [],
      allCheckIns: [],
      todayKey
    };
  }
}
