import {
  runTable,
  hamrTable,
  pushupsTable,
  hrPushupsTable,
  situpsTable,
  crunchesTable,
  plankTable
} from '../data/scoringTables.js';

/**
 * Maps an age in years to its official USAF age bracket.
 */
export function getAgeBracket(age) {
  const s = parseInt(age, 10);
  if (isNaN(s)) return 'u25';
  return s < 25
    ? 'u25'
    : s <= 29
    ? '25_29'
    : s <= 34
    ? '30_34'
    : s <= 39
    ? '35_39'
    : s <= 44
    ? '40_44'
    : s <= 49
    ? '45_49'
    : s <= 54
    ? '50_54'
    : s <= 59
    ? '55_59'
    : 'o60';
}

/**
 * Converts a "MM:SS" or "M:SS" time string into total seconds.
 */
export function timeToSeconds(timeStr, fallback = 9999) {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return fallback;
  const s = timeStr.replace(/>|=|<|\*/g, '').trim();
  const [minsStr, secsStr] = s.split(':');
  if (!minsStr || !secsStr || secsStr.length !== 2) return fallback;
  const mins = Number(minsStr);
  const secs = Number(secsStr);
  if (isNaN(mins) || isNaN(secs) || mins < 0 || secs < 0 || secs >= 60) return fallback;
  return mins * 60 + secs;
}

/**
 * Formats user input into M:SS (3 digits) or MM:SS (4 digits) automatically as they type digits.
 */
export function formatTimeInput(val) {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length === 3) {
    return `${digits[0]}:${digits.slice(1)}`;
  }
  if (digits.length > 3) {
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }
  return digits;
}

/**
 * Calculates Waist-to-Height Ratio (WHtR) points according to USAF standards.
 * DAFMAN 36-2905 Para 3.15.4.2: WHtR results are truncated (not rounded) to the first two decimal points.
 * Max points: 20.0
 */
export function calculateWhtr(heightInches, waistInches) {
  if (!heightInches || !waistInches) return 0;
  const r = Math.floor((waistInches / heightInches) * 100 + 1e-9) / 100;
  return r <= 0.49
    ? 20
    : r === 0.50
    ? 19
    : r === 0.51
    ? 18
    : r === 0.52
    ? 17
    : r === 0.53
    ? 16
    : r === 0.54
    ? 15
    : r === 0.55
    ? 12.5
    : r === 0.56
    ? 10
    : r === 0.57
    ? 7.5
    : r === 0.58
    ? 5
    : r === 0.59
    ? 2.5
    : 0;
}

/**
 * Calculates Cardio points for 2-Mile Run or 20M HAMR.
 * Max points: 50.0
 */
export function calculateCardioScore(type, gender, age, value) {
  if (!age || !value) return 0;
  const bracket = getAgeBracket(age);
  const gKey = gender === 'male' ? 'm' : 'f';

  if (type === 'run') {
    const userSec = timeToSeconds(value);
    const table = runTable[bracket];
    if (!table) return 0;
    for (const row of table) {
      if (userSec <= timeToSeconds(row[gKey])) {
        return row.p;
      }
    }
  }

  if (type === 'hamr') {
    const userReps = parseInt(value, 10);
    const table = hamrTable[bracket];
    if (!table) return 0;
    for (const row of table) {
      if (userReps >= row[gKey]) {
        return row.p;
      }
    }
  }

  return 0;
}

/**
 * Calculates Upper Body points for Standard Push-ups or Hand-Release Push-ups.
 * Max points: 15.0
 */
export function calculateUpperScore(type, gender, age, value) {
  if (!age || !value) return 0;
  const bracket = getAgeBracket(age);
  const gKey = gender === 'male' ? 'm' : 'f';
  const userReps = parseInt(value, 10);
  const table = type === 'pushups' ? pushupsTable[bracket] : hrPushupsTable[bracket];
  if (!table) return 0;

  for (const row of table) {
    if (userReps >= row[gKey]) {
      return row.p;
    }
  }
  return 0;
}

/**
 * Calculates Core points for Standard Sit-ups, Cross-Leg Reverse Crunches, or Forearm Plank.
 * Max points: 15.0
 */
export function calculateCoreScore(type, gender, age, value) {
  if (!age || !value) return 0;
  const bracket = getAgeBracket(age);
  const gKey = gender === 'male' ? 'm' : 'f';

  if (type === 'plank') {
    const userSec = timeToSeconds(value, 0);
    const table = plankTable[bracket];
    if (!table) return 0;
    for (const row of table) {
      if (userSec >= timeToSeconds(row[gKey], 0)) {
        return row.p;
      }
    }
  } else {
    const userReps = parseInt(value, 10);
    const table = type === 'situps' ? situpsTable[bracket] : crunchesTable[bracket];
    if (!table) return 0;
    for (const row of table) {
      if (userReps >= row[gKey]) {
        return row.p;
      }
    }
  }

  return 0;
}

/**
 * Calculates composite score and determines USAF pass/fail status.
 * DAFMAN 36-2905 Para 3.1 & 3.7.1: Body Composition does not have a minimum component requirement.
 */
export function calculateCompositeScore({ whtr = 0, cardio = 0, upper = 0, core = 0 }) {
  const total = Number((whtr + cardio + upper + core).toFixed(1));
  const hasZeroComponent = cardio === 0 || upper === 0 || core === 0;
  const passed = total >= 75 && !hasZeroComponent;

  let statusText = 'Passing Score';
  if (!passed) {
    if (hasZeroComponent) {
      statusText = 'Failing Score: Minimum Component Threshold Not Met';
    } else {
      statusText = 'Failing Score: Below 75 Total';
    }
  }

  return {
    whtr,
    cardio,
    upper,
    core,
    total,
    passed,
    hasZeroComponent,
    statusText
  };
}
