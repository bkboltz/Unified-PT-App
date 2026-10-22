import {
  runTable,
  hamrTable,
  walkTable,
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
 * Converts a "MM:SS", "M:SS", ":SS", or "SS" time string into total seconds.
 */
export function timeToSeconds(timeStr, fallback = 9999) {
  if (!timeStr || typeof timeStr !== 'string') return fallback;
  const s = timeStr.replace(/>|=|<|\*/g, '').trim();
  if (!s.includes(':')) {
    if (/^\d{1,2}$/.test(s)) {
      const onlySecs = Number(s);
      if (onlySecs >= 0 && onlySecs < 60) return onlySecs;
    }
    return fallback;
  }
  const [minsStr, secsStr] = s.split(':');
  if (!secsStr || secsStr.length !== 2) return fallback;
  const mins = minsStr === '' ? 0 : Number(minsStr);
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
 * Rounds waist circumference down to the nearest 0.5 inch per DAFMAN 36-2905.
 */
export function roundWaistDown(waistInches) {
  const w = Number(waistInches);
  if (!w || isNaN(w) || w <= 0) return 0;
  return Math.floor((w + 1e-9) * 2) / 2;
}

/**
 * Calculates full Waist-to-Height Ratio (WHtR) details (points, truncated ratio, risk tier, rounded waist).
 * DAFMAN 36-2905 Para 3.15.4.2: Waist is rounded down to nearest 0.5", and WHtR is truncated (not rounded) to 2 decimal places.
 * Max points: 20.0
 */
export function calculateWhtrDetails(heightInches, waistInches) {
  const h = Number(heightInches);
  const w = roundWaistDown(waistInches);
  if (!h || !w || h <= 0 || w <= 0) {
    return { points: 0, ratio: null, ratioFormatted: null, risk: null, roundedWaist: 0 };
  }
  const r = Math.floor((w / h) * 100 + 1e-9) / 100;
  const points =
    r <= 0.49
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

  const risk = r <= 0.49 ? 'Low Risk' : r <= 0.54 ? 'Moderate Risk' : 'High Risk';

  return {
    points,
    ratio: r,
    ratioFormatted: r.toFixed(2),
    risk,
    roundedWaist: w
  };
}

/**
 * Calculates Waist-to-Height Ratio (WHtR) points according to USAF standards.
 * DAFMAN 36-2905 Para 3.15.4.2: WHtR results are truncated (not rounded) to the first two decimal points.
 * Max points: 20.0
 */
export function calculateWhtr(heightInches, waistInches) {
  return calculateWhtrDetails(heightInches, waistInches).points;
}

/**
 * Evaluates 2.0 Kilometer Walk Pass/Fail status per Page 11 of USAF PFRA Scoring Charts.
 */
export function evaluateWalk(gender, age, value) {
  if (!age || !value) return { passed: false, maxTime: null };
  const bracket = getAgeBracket(age);
  const gKey = gender === 'male' ? 'm' : 'f';
  const row = walkTable[bracket];
  if (!row) return { passed: false, maxTime: null };
  const maxTime = row[gKey];
  const userSec = timeToSeconds(value, 9999);
  const maxSec = timeToSeconds(maxTime, 0);
  return {
    passed: userSec <= maxSec,
    maxTime
  };
}

/**
 * Returns the official minimum passing requirement string for a component, age, and gender.
 */
export function getComponentMinimum(type, gender, age) {
  if (!age) return null;
  const bracket = getAgeBracket(age);
  const gKey = gender === 'male' ? 'm' : 'f';

  if (type === 'run') {
    const table = runTable[bracket];
    return table ? `Max ${table[table.length - 1][gKey]} (35.0 pts)` : null;
  }
  if (type === 'hamr') {
    const table = hamrTable[bracket];
    return table ? `Min ${table[table.length - 1][gKey]} shuttles (35.0 pts)` : null;
  }
  if (type === 'walk') {
    const row = walkTable[bracket];
    return row ? `Max ${row[gKey]}` : null;
  }
  if (type === 'pushups') {
    const table = pushupsTable[bracket];
    return table ? `Min ${table[table.length - 1][gKey]} reps (2.5 pts)` : null;
  }
  if (type === 'hrPushups') {
    const table = hrPushupsTable[bracket];
    return table ? `Min ${table[table.length - 1][gKey]} reps (2.5 pts)` : null;
  }
  if (type === 'situps') {
    const table = situpsTable[bracket];
    return table ? `Min ${table[table.length - 1][gKey]} reps (2.5 pts)` : null;
  }
  if (type === 'crunches') {
    const table = crunchesTable[bracket];
    return table ? `Min ${table[table.length - 1][gKey]} reps (2.5 pts)` : null;
  }
  if (type === 'plank') {
    const table = plankTable[bracket];
    return table ? `Min ${table[table.length - 1][gKey]} (2.5 pts)` : null;
  }
  return null;
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
 * When one or more components are exempt (AF Form 469) or when 2.0km Walk is used, composite score is scaled:
 *   Composite Score = (Total Points Earned / Total Possible Points of Non-Exempt Scored Components) * 100
 */
export function calculateCompositeScore(
  { whtr = 0, cardio = 0, upper = 0, core = 0, cardioType = 'run', walkPassed = null },
  exemptions = { whtr: false, cardio: false, upper: false, core: false }
) {
  const isWalk = !exemptions.cardio && cardioType === 'walk';
  const maxWeights = { whtr: 20, cardio: isWalk ? 0 : 50, upper: 15, core: 15 };
  const rawScores = { whtr, cardio: isWalk ? 0 : cardio, upper, core };

  let earnedPoints = 0;
  let possiblePoints = 0;

  for (const key of ['whtr', 'cardio', 'upper', 'core']) {
    if (!exemptions[key] && maxWeights[key] > 0) {
      earnedPoints += Number(rawScores[key] || 0);
      possiblePoints += maxWeights[key];
    }
  }

  const walkFailed = isWalk && walkPassed === false;

  if (possiblePoints === 0) {
    if (isWalk) {
      return {
        whtr: 'Exempt',
        cardio: walkPassed ? 'Pass (Walk)' : 'Fail (Walk)',
        upper: 'Exempt',
        core: 'Exempt',
        earnedPoints: 0,
        possiblePoints: 0,
        total: walkPassed ? 'Pass (Walk)' : 'Fail (Walk)',
        passed: Boolean(walkPassed),
        isFullExempt: false,
        hasZeroComponent: !walkPassed,
        statusText: walkPassed
          ? 'Passing Score (2.0km Walk Profile)'
          : 'Failing Score: 2.0km Walk Maximum Time Exceeded'
      };
    }

    return {
      whtr: 'Exempt',
      cardio: 'Exempt',
      upper: 'Exempt',
      core: 'Exempt',
      earnedPoints: 0,
      possiblePoints: 0,
      total: 'Exempt',
      passed: true,
      isFullExempt: true,
      hasZeroComponent: false,
      statusText: 'Composite Exemption (All Components Exempt)'
    };
  }

  const total = Math.round(((earnedPoints * 100) / possiblePoints) * 10 + 1e-9) / 10;
  const hasZeroComponent =
    walkFailed ||
    (!exemptions.cardio && !isWalk && cardio === 0) ||
    (!exemptions.upper && upper === 0) ||
    (!exemptions.core && core === 0);
  const passed = total >= 75 && !hasZeroComponent;

  let statusText = 'Passing Score';
  if (!passed) {
    if (walkFailed) {
      statusText = 'Failing Score: 2.0km Walk Maximum Time Exceeded';
    } else if (hasZeroComponent) {
      statusText = 'Failing Score: Minimum Component Threshold Not Met';
    } else {
      statusText = 'Failing Score: Below 75 Total';
    }
  }

  return {
    whtr: exemptions.whtr ? 'Exempt' : whtr,
    cardio: exemptions.cardio
      ? 'Exempt'
      : isWalk
      ? walkPassed
        ? 'Pass (Walk)'
        : 'Fail (Walk)'
      : cardio,
    upper: exemptions.upper ? 'Exempt' : upper,
    core: exemptions.core ? 'Exempt' : core,
    earnedPoints: Number(earnedPoints.toFixed(1)),
    possiblePoints,
    total,
    passed,
    isFullExempt: false,
    hasZeroComponent,
    statusText
  };
}
