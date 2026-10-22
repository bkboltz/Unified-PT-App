import React, { useState, useMemo } from 'react';
import { EXCEL_EXPORT_URLS } from '../services/api';

function formatShortDate(dateKey) {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return dateKey;
  return dt.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatCompactDate(dateKey) {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return dateKey;
  return dt.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Interactive SVG Donut Chart for Pass / Excellent / Satisfactory / Fail breakdown
 */
function ScoreTierDonut({ excellent, satisfactory, fail, exempt, total }) {
  const [activeSlice, setActiveSlice] = useState(null);

  const segments = useMemo(() => {
    const raw = [
      {
        key: 'excellent',
        label: 'Excellent (90+)',
        count: excellent,
        color: '#10b981', // emerald-500
        badgeClass: 'bg-emerald-500',
        textClass: 'text-emerald-600 dark:text-emerald-400'
      },
      {
        key: 'satisfactory',
        label: 'Satisfactory (75–89.9)',
        count: satisfactory,
        color: '#3b82f6', // blue-500
        badgeClass: 'bg-blue-500',
        textClass: 'text-blue-600 dark:text-blue-400'
      },
      {
        key: 'fail',
        label: 'Fail (<75 / Min)',
        count: fail,
        color: '#ef4444', // red-500
        badgeClass: 'bg-red-500',
        textClass: 'text-red-600 dark:text-red-400'
      },
      ...(exempt > 0
        ? [
            {
              key: 'exempt',
              label: 'Full Exempt',
              count: exempt,
              color: '#94a3b8', // slate-400
              badgeClass: 'bg-slate-400',
              textClass: 'text-slate-500 dark:text-slate-400'
            }
          ]
        : [])
    ];

    const radius = 62;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPct = 0;

    return raw.map((seg) => {
      const pct = total > 0 ? seg.count / total : 0;
      const strokeDasharray = `${pct * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedPct * circumference;
      accumulatedPct += pct;
      return {
        ...seg,
        pct: Math.round(pct * 1000) / 10,
        radius,
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [excellent, satisfactory, fail, exempt, total]);

  const highlighted = segments.find((s) => s.key === activeSlice) || null;
  const passCount = excellent + satisfactory + exempt;
  const passRate = total > 0 ? Math.round((passCount / total) * 1000) / 10 : 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      {/* SVG Donut */}
      <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
        <svg className="w-44 h-44 -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r="62"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="20"
            className="text-gray-100 dark:text-slate-700"
          />
          {total > 0 &&
            segments.map((seg) =>
              seg.count > 0 ? (
                <circle
                  key={seg.key}
                  cx="80"
                  cy="80"
                  r={seg.radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={activeSlice === seg.key ? '24' : '20'}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  className="transition-all duration-200 cursor-pointer"
                  onClick={() =>
                    setActiveSlice((prev) => (prev === seg.key ? null : seg.key))
                  }
                />
              ) : null
            )}
        </svg>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
          {highlighted ? (
            <>
              <span className={`text-2xl font-extrabold ${highlighted.textClass}`}>
                {highlighted.pct}%
              </span>
              <span className="text-[11px] font-semibold text-gray-600 dark:text-slate-300 leading-tight mt-0.5">
                {highlighted.count} {highlighted.count === 1 ? 'Airman' : 'Airmen'}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-slate-400 truncate max-w-[100px]">
                {highlighted.label.split(' ')[0]}
              </span>
            </>
          ) : (
            <>
              <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                {passRate}%
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Pass Rate
              </span>
              <span className="text-[10px] text-gray-400 dark:text-slate-400">
                {total} Total Tests
              </span>
            </>
          )}
        </div>
      </div>

      {/* Interactive Legend */}
      <div className="w-full space-y-2">
        {segments.map((seg) => {
          const isSelected = activeSlice === seg.key;
          return (
            <button
              key={seg.key}
              type="button"
              onClick={() =>
                setActiveSlice((prev) => (prev === seg.key ? null : seg.key))
              }
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/60 dark:bg-slate-700/80 shadow-xs'
                  : 'border-gray-100 dark:border-slate-700/70 bg-gray-50/60 dark:bg-slate-800/50 hover:bg-gray-100/70 dark:hover:bg-slate-700/40'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-3 h-3 rounded-full shrink-0 ${seg.badgeClass}`} />
                <span className="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate">
                  {seg.label}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-extrabold text-gray-900 dark:text-white">
                  {seg.count}
                </span>
                <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400 w-11 text-right">
                  ({seg.pct}%)
                </span>
              </div>
            </button>
          );
        })}
        <p className="text-[11px] text-gray-400 dark:text-slate-500 text-center sm:text-left pt-0.5">
          Tap any category above to inspect slice details.
        </p>
      </div>
    </div>
  );
}

/**
 * Mini Pie/Distribution Bar Widget for Exercise Preferences (e.g. Run vs HAMR)
 */
function ExerciseBreakdownCard({ title, items, total }) {
  const colors = [
    { bar: 'bg-blue-600 dark:bg-blue-500', dot: 'bg-blue-600 dark:bg-blue-500' },
    { bar: 'bg-indigo-500 dark:bg-indigo-400', dot: 'bg-indigo-500 dark:bg-indigo-400' },
    { bar: 'bg-teal-500 dark:bg-teal-400', dot: 'bg-teal-500 dark:bg-teal-400' },
    { bar: 'bg-amber-500 dark:bg-amber-400', dot: 'bg-amber-500 dark:bg-amber-400' }
  ];

  return (
    <div className="p-3.5 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-gray-800 dark:text-slate-200">{title}</h4>
        <span className="text-[11px] text-gray-400 dark:text-slate-400">{total} tested</span>
      </div>

      {/* Stacked Horizontal Proportion Bar */}
      <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden flex">
        {items.map((item, idx) => {
          const pct = total > 0 ? (item.count / total) * 100 : 0;
          if (pct <= 0) return null;
          return (
            <div
              key={item.name}
              style={{ width: `${pct}%` }}
              className={`${colors[idx % colors.length].bar} h-full transition-all first:rounded-l-full last:rounded-r-full`}
              title={`${item.name}: ${item.count} (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>

      {/* Breakdown Rows */}
      <div className="space-y-1.5 pt-0.5">
        {items.map((item, idx) => {
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
          const avgPtsStr =
            item.avgPct !== null ? `${Math.round(item.avgPct)}% avg pts` : '';
          return (
            <div
              key={item.name}
              className="flex items-center justify-between text-xs gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    colors[idx % colors.length].dot
                  }`}
                />
                <span className="font-medium text-gray-700 dark:text-slate-300 truncate">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 text-[11px]">
                {avgPtsStr && (
                  <span className="text-gray-400 dark:text-slate-400 hidden sm:inline">
                    {avgPtsStr}
                  </span>
                )}
                <span className="font-bold text-gray-900 dark:text-white">
                  {item.count}
                </span>
                <span className="text-gray-500 dark:text-slate-400 w-9 text-right">
                  ({pct}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Interactive Historical Trend Chart for PT Session Scores & Pass Rates
 */
function HistoricalScoreChart({ sessions }) {
  const [selectedIdx, setSelectedIdx] = useState(
    sessions.length > 0 ? sessions.length - 1 : 0
  );

  if (sessions.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-gray-400 dark:text-slate-500">
        Not enough session history to plot trends.
      </div>
    );
  }

  const safeIdx = Math.min(selectedIdx, sessions.length - 1);
  const activeSession = sessions[safeIdx] || sessions[sessions.length - 1];

  return (
    <div className="space-y-4">
      {/* Selected Session Callout Banner */}
      {activeSession && (
        <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-slate-700/60 border border-blue-100 dark:border-slate-600 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">
              Session: {formatShortDate(activeSession.dateKey)}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-slate-300">
              {activeSession.count} {activeSession.count === 1 ? 'Tester' : 'Testers'} •{' '}
              {activeSession.excellentCount} Excellent • {activeSession.failCount} Failed
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-400">
                Avg Score
              </div>
              <div className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                {activeSession.avgScore} pts
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-400">
                Pass Rate
              </div>
              <div
                className={`text-sm font-extrabold ${
                  activeSession.passRate >= 85
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {activeSession.passRate}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bar + Threshold Visual Chart */}
      <div className="relative pt-4 pb-1 px-1">
        {/* 75 pt Passing Threshold Line */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-red-400/70 dark:border-red-500/60 pointer-events-none flex items-center justify-end pr-1"
          style={{ bottom: `${(75 / 100) * 128 + 24}px` }}
        >
          <span className="text-[9px] font-bold text-red-500 dark:text-red-400 bg-white/90 dark:bg-slate-800/90 px-1 rounded">
            75 Min Pass
          </span>
        </div>

        <div className="flex items-end gap-2 sm:gap-3 h-36 overflow-x-auto pb-1">
          {sessions.map((sess, idx) => {
            const isSelected = idx === safeIdx;
            const heightPx = Math.max(16, Math.round((sess.avgScore / 100) * 128));
            return (
              <button
                key={sess.dateKey}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className="flex-1 min-w-[46px] flex flex-col items-center group focus:outline-none"
              >
                <span
                  className={`text-[10px] font-bold mb-1 transition-colors ${
                    isSelected
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-slate-400'
                  }`}
                >
                  {sess.avgScore}
                </span>
                <div className="w-full max-w-[38px] bg-gray-100 dark:bg-slate-700/60 rounded-t-lg h-32 flex items-end p-0.5">
                  <div
                    style={{ height: `${heightPx}px` }}
                    className={`w-full rounded-t-md transition-all ${
                      isSelected
                        ? 'bg-blue-600 dark:bg-blue-500 shadow-sm'
                        : 'bg-blue-400/70 dark:bg-blue-500/50 group-hover:bg-blue-500'
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] mt-1.5 truncate max-w-[56px] ${
                    isSelected
                      ? 'font-bold text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-slate-400'
                  }`}
                >
                  {formatCompactDate(sess.dateKey)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive Check-In Attendance History Bar Chart
 */
function AttendanceHistoryChart({ checkInSessions }) {
  const recent = useMemo(() => {
    return [...checkInSessions].slice(0, 12).reverse();
  }, [checkInSessions]);

  const maxCount = useMemo(() => {
    return Math.max(1, ...recent.map((s) => s.count));
  }, [recent]);

  if (recent.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-gray-400 dark:text-slate-500">
        No check-in history available yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1.5 sm:gap-2.5 h-36 overflow-x-auto pt-4 pb-1 px-1">
        {recent.map((sess) => {
          const heightPx = Math.max(12, Math.round((sess.count / maxCount) * 116));
          return (
            <div
              key={sess.dateKey}
              className="flex-1 min-w-[38px] flex flex-col items-center"
            >
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                {sess.count}
              </span>
              <div className="w-full max-w-[32px] bg-gray-100 dark:bg-slate-700/60 rounded-t-lg h-28 flex items-end p-0.5">
                <div
                  style={{ height: `${heightPx}px` }}
                  className="w-full rounded-t-md bg-emerald-500 dark:bg-emerald-500/80 transition-all"
                />
              </div>
              <span className="text-[9px] sm:text-[10px] text-gray-500 dark:text-slate-400 mt-1.5 truncate max-w-[48px]">
                {formatCompactDate(sess.dateKey)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PtlAnalyticsTab({
  allScores = [],
  allCheckIns = [],
  isLoadingScores = false,
  onRefresh
}) {
  // Top-level filters
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | '30d' | '90d' | specific YYYY-MM-DD
  const [rankFilter, setRankFilter] = useState('all'); // 'all' | 'Enlisted' | 'Officer'
  const [subView, setSubView] = useState('overview'); // 'overview' | 'trends' | 'failures'

  // Failures & Score Log sub-filters
  const [rosterFilter, setRosterFilter] = useState('failures'); // 'failures' | 'at_risk' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMemberKey, setExpandedMemberKey] = useState(null);

  // Distinct test session dates for the dropdown
  const scoreDates = useMemo(() => {
    const counts = new Map();
    for (const s of allScores) {
      if (!s.dateKey) continue;
      counts.set(s.dateKey, (counts.get(s.dateKey) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateKey, count]) => ({ dateKey, count }));
  }, [allScores]);

  // Apply Timeframe & Rank Tier Filters to Scores
  const filteredScores = useMemo(() => {
    const now = new Date();
    return allScores.filter((s) => {
      if (rankFilter !== 'all' && s.rankCategory !== rankFilter) {
        return false;
      }
      if (dateFilter === 'all') return true;
      if (dateFilter === '30d' || dateFilter === '90d') {
        const days = dateFilter === '30d' ? 30 : 90;
        const [y, m, d] = (s.dateKey || '').split('-').map(Number);
        if (!y || !m || !d) return false;
        const rowDate = new Date(y, m - 1, d);
        const diffDays = (now - rowDate) / (1000 * 60 * 60 * 24);
        return diffDays <= days;
      }
      return s.dateKey === dateFilter;
    });
  }, [allScores, dateFilter, rankFilter]);

  // Aggregate KPIs & Chart Metrics
  const metrics = useMemo(() => {
    const total = filteredScores.length;
    let excellent = 0;
    let satisfactory = 0;
    let fail = 0;
    let exempt = 0;
    let borderlineCount = 0; // Passing but < 80
    let scoreSum = 0;
    let scoredCount = 0;

    // Component sums
    const compStats = {
      whtr: { sum: 0, count: 0, max: 20, label: 'Body Comp (WHtR)' },
      cardio: { sum: 0, count: 0, max: 50, label: 'Cardio' },
      upper: { sum: 0, count: 0, max: 15, label: 'Upper Strength' },
      core: { sum: 0, count: 0, max: 15, label: 'Core Endurance' }
    };

    // Exercise preference maps
    const cardioMap = new Map();
    const upperMap = new Map();
    const coreMap = new Map();

    for (const s of filteredScores) {
      if (s.tier === 'Excellent') excellent++;
      else if (s.tier === 'Satisfactory') satisfactory++;
      else if (s.tier === 'Fail') fail++;
      else exempt++;

      if (s.status === 'Pass' && s.totalScore !== null && s.totalScore < 80) {
        borderlineCount++;
      }

      if (s.totalScore !== null) {
        scoreSum += s.totalScore;
        scoredCount++;
      }

      if (!s.whtrExempt && s.whtrPts !== null) {
        compStats.whtr.sum += s.whtrPts;
        compStats.whtr.count++;
      }
      if (
        !s.cardioExempt &&
        !s.cardioType.toLowerCase().includes('walk') &&
        s.cardioPts !== null
      ) {
        compStats.cardio.sum += s.cardioPts;
        compStats.cardio.count++;
      }
      if (!s.upperExempt && s.upperPts !== null) {
        compStats.upper.sum += s.upperPts;
        compStats.upper.count++;
      }
      if (!s.coreExempt && s.corePts !== null) {
        compStats.core.sum += s.corePts;
        compStats.core.count++;
      }

      // Exercise counts
      if (!s.cardioExempt && s.cardioType) {
        const entry = cardioMap.get(s.cardioType) || { count: 0, pctSum: 0, pctCount: 0 };
        entry.count++;
        if (s.cardioPts !== null && !s.cardioType.toLowerCase().includes('walk')) {
          entry.pctSum += (s.cardioPts / 50) * 100;
          entry.pctCount++;
        }
        cardioMap.set(s.cardioType, entry);
      }

      if (!s.upperExempt && s.upperType) {
        const entry = upperMap.get(s.upperType) || { count: 0, pctSum: 0, pctCount: 0 };
        entry.count++;
        if (s.upperPts !== null) {
          entry.pctSum += (s.upperPts / 15) * 100;
          entry.pctCount++;
        }
        upperMap.set(s.upperType, entry);
      }

      if (!s.coreExempt && s.coreType) {
        const entry = coreMap.get(s.coreType) || { count: 0, pctSum: 0, pctCount: 0 };
        entry.count++;
        if (s.corePts !== null) {
          entry.pctSum += (s.corePts / 15) * 100;
          entry.pctCount++;
        }
        coreMap.set(s.coreType, entry);
      }
    }

    const passCount = excellent + satisfactory + exempt;
    const passRate = total > 0 ? Math.round((passCount / total) * 1000) / 10 : 0;
    const excellentRate = total > 0 ? Math.round((excellent / total) * 1000) / 10 : 0;
    const avgScore = scoredCount > 0 ? Math.round((scoreSum / scoredCount) * 10) / 10 : 0;

    const componentAverages = Object.entries(compStats).map(([key, c]) => {
      const avgPts = c.count > 0 ? Math.round((c.sum / c.count) * 10) / 10 : 0;
      const avgPct = c.count > 0 ? Math.round(((c.sum / c.count) / c.max) * 1000) / 10 : 0;
      return {
        key,
        label: c.label,
        avgPts,
        max: c.max,
        avgPct,
        count: c.count
      };
    });

    const formatExerciseMap = (m) =>
      Array.from(m.entries())
        .map(([name, val]) => ({
          name,
          count: val.count,
          avgPct: val.pctCount > 0 ? val.pctSum / val.pctCount : null
        }))
        .sort((a, b) => b.count - a.count);

    return {
      total,
      excellent,
      satisfactory,
      fail,
      exempt,
      borderlineCount,
      passRate,
      excellentRate,
      avgScore,
      componentAverages,
      cardioExercises: formatExerciseMap(cardioMap),
      upperExercises: formatExerciseMap(upperMap),
      coreExercises: formatExerciseMap(coreMap)
    };
  }, [filteredScores]);

  // Historical PT Test Sessions (chronological for chart)
  const historicalScoreSessions = useMemo(() => {
    const byDate = new Map();
    for (const s of filteredScores) {
      if (!s.dateKey) continue;
      const cur = byDate.get(s.dateKey) || {
        dateKey: s.dateKey,
        count: 0,
        scoreSum: 0,
        scoredCount: 0,
        passCount: 0,
        excellentCount: 0,
        failCount: 0
      };
      cur.count++;
      if (s.totalScore !== null) {
        cur.scoreSum += s.totalScore;
        cur.scoredCount++;
      }
      if (s.status !== 'Fail') cur.passCount++;
      else cur.failCount++;
      if (s.tier === 'Excellent') cur.excellentCount++;
      byDate.set(s.dateKey, cur);
    }

    return Array.from(byDate.values())
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .map((sess) => ({
        ...sess,
        avgScore:
          sess.scoredCount > 0
            ? Math.round((sess.scoreSum / sess.scoredCount) * 10) / 10
            : 0,
        passRate:
          sess.count > 0 ? Math.round((sess.passCount / sess.count) * 1000) / 10 : 0
      }));
  }, [filteredScores]);

  // Check-In Attendance Sessions summary
  const checkInSessions = useMemo(() => {
    const counts = new Map();
    for (const item of allCheckIns) {
      if (!item.dateKey) continue;
      counts.set(item.dateKey, (counts.get(item.dateKey) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateKey, count]) => ({ dateKey, count }));
  }, [allCheckIns]);

  // Lookup map of Airman -> all historical PT scores and check-ins
  const memberHistoryMap = useMemo(() => {
    const map = new Map();
    for (const s of allScores) {
      const entry = map.get(s.memberKey) || { scores: [], checkIns: 0 };
      entry.scores.push(s);
      map.set(s.memberKey, entry);
    }
    for (const c of allCheckIns) {
      const key = `${(c.firstName || '').toLowerCase()}_${(c.lastName || '').toLowerCase()}`;
      const entry = map.get(key) || { scores: [], checkIns: 0 };
      entry.checkIns++;
      map.set(key, entry);
    }
    return map;
  }, [allScores, allCheckIns]);

  // Filtered Roster for Sub-View 3 (Failures / At-Risk / All Scores)
  const displayedScoreLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return filteredScores.filter((s) => {
      if (rosterFilter === 'failures' && s.status !== 'Fail') return false;
      if (
        rosterFilter === 'at_risk' &&
        !(s.status === 'Fail' || (s.totalScore !== null && s.totalScore < 80))
      ) {
        return false;
      }
      if (!q) return true;
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.rank.toLowerCase().includes(q) ||
        s.dateKey.includes(q)
      );
    });
  }, [filteredScores, rosterFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Sticky / Compact Filter & Sub-Navigation Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-3.5 space-y-3">
        {/* Top Row: Session/Timeframe Selector + Rank Filter + Refresh */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-2 text-xs font-bold text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Time ({allScores.length} Tests)</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <optgroup label="By PT Test Session Date">
                {scoreDates.map(({ dateKey, count }) => (
                  <option key={dateKey} value={dateKey}>
                    {formatShortDate(dateKey)} ({count} {count === 1 ? 'Test' : 'Tests'})
                  </option>
                ))}
              </optgroup>
            </select>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoadingScores}
              className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 shrink-0"
              title="Refresh Google Sheets Data"
            >
              <svg
                className={`w-4 h-4 ${isLoadingScores ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>

          {/* Rank Tier Pills */}
          <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-slate-700/70 p-1 rounded-lg">
            {['all', 'Enlisted', 'Officer'].map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setRankFilter(tier)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  rankFilter === tier
                    ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-xs'
                    : 'text-gray-600 dark:text-slate-300 hover:text-gray-900'
                }`}
              >
                {tier === 'all' ? 'All Ranks' : tier}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-View Switcher Pills */}
        <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-gray-100 dark:border-slate-700/70">
          <button
            type="button"
            onClick={() => setSubView('overview')}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              subView === 'overview'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-slate-300 hover:bg-gray-100'
            }`}
          >
            <span>Overview &amp; Pies</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('trends')}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              subView === 'trends'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-slate-300 hover:bg-gray-100'
            }`}
          >
            <span>Trends</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('failures')}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              subView === 'failures'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-slate-300 hover:bg-gray-100'
            }`}
          >
            <span>Failures &amp; Log</span>
            {metrics.fail > 0 && (
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
                  subView === 'failures'
                    ? 'bg-white text-red-600'
                    : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                }`}
              >
                {metrics.fail}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards (2x2 on Mobile, 4x1 on Desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="text-[11px] font-semibold text-gray-500 dark:text-slate-400">
            Pass Rate
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {metrics.passRate}%
            </span>
            <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500">
              {metrics.total - metrics.fail}/{metrics.total}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
            {metrics.excellentRate}% Excellent (90+)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="text-[11px] font-semibold text-gray-500 dark:text-slate-400">
            Average Score
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
              {metrics.avgScore}
            </span>
            <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500">
              / 100
            </span>
          </div>
          <div className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
            {metrics.excellent} Scored 90.0+
          </div>
        </div>

        <div
          onClick={() => {
            setSubView('failures');
            setRosterFilter('failures');
          }}
          className="bg-white dark:bg-slate-800 p-3.5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 cursor-pointer hover:border-red-300 dark:hover:border-red-700 transition-colors"
        >
          <div className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 flex items-center justify-between">
            <span>Failures</span>
            <span className="text-[10px] text-red-500 font-bold">View →</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-red-600 dark:text-red-400">
              {metrics.fail}
            </span>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              +{metrics.borderlineCount} &lt;80
            </span>
          </div>
          <div className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
            Tap to inspect reasons
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="text-[11px] font-semibold text-gray-500 dark:text-slate-400">
            Total Check-Ins
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {allCheckIns.length}
            </span>
            <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500">
              {checkInSessions.length} days
            </span>
          </div>
          <div className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
            Avg{' '}
            {checkInSessions.length > 0
              ? Math.round(allCheckIns.length / checkInSessions.length)
              : 0}{' '}
            / session
          </div>
        </div>
      </div>

      {/* SUB-VIEW 1: OVERVIEW & PIE/DONUT CHARTS */}
      {subView === 'overview' && (
        <div className="space-y-4">
          {/* Score Distribution Donut Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                  Squadron Pass / Fail &amp; Tier Breakdown
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Distribution of official PT scores from Google Sheets
                </p>
              </div>
            </div>

            <ScoreTierDonut
              excellent={metrics.excellent}
              satisfactory={metrics.satisfactory}
              fail={metrics.fail}
              exempt={metrics.exempt}
              total={metrics.total}
            />
          </div>

          {/* Component Performance Averages (Spot Squadron Weak Spots) */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 sm:p-5 space-y-3.5">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                Component Score Averages (% of Max Points)
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Identifies which fitness component costs Airmen the most points
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {metrics.componentAverages.map((comp) => {
                const barColor =
                  comp.avgPct >= 90
                    ? 'bg-emerald-500'
                    : comp.avgPct >= 80
                    ? 'bg-blue-500'
                    : 'bg-amber-500';
                return (
                  <div key={comp.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-800 dark:text-slate-200">
                        {comp.label}
                      </span>
                      <span className="font-semibold text-gray-600 dark:text-slate-300">
                        Avg <strong className="text-gray-900 dark:text-white">{comp.avgPts}</strong> /{' '}
                        {comp.max} pts ({comp.avgPct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, comp.avgPct)}%` }}
                        className={`h-full rounded-full transition-all ${barColor}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Exercise Selection Breakdown Cards */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 sm:p-5 space-y-3.5">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                Component Exercise Preferences
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Standard vs alternative event selection across tested Airmen
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ExerciseBreakdownCard
                title="Cardio Event"
                items={metrics.cardioExercises}
                total={metrics.total}
              />
              <ExerciseBreakdownCard
                title="Upper Body Event"
                items={metrics.upperExercises}
                total={metrics.total}
              />
              <ExerciseBreakdownCard
                title="Core Event"
                items={metrics.coreExercises}
                total={metrics.total}
              />
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: HISTORICAL TRENDS & ATTENDANCE */}
      {subView === 'trends' && (
        <div className="space-y-4">
          {/* Historical PT Score Graph */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 sm:p-5 space-y-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                Historical PT Score &amp; Pass Rate by Session
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Tap any session bar below to inspect that test date&apos;s average score and pass rate
              </p>
            </div>

            <HistoricalScoreChart sessions={historicalScoreSessions} />
          </div>

          {/* Historical Check-In Attendance Graph */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                  Recent PT Check-In Attendance
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Member attendance across the last {Math.min(12, checkInSessions.length)} PT sessions
                </p>
              </div>
            </div>

            <AttendanceHistoryChart checkInSessions={checkInSessions} />
          </div>

          {/* Session-by-Session Summary Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                PT Test Session Breakdown
              </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-slate-700/60">
              {[...historicalScoreSessions].reverse().map((sess) => (
                <div
                  key={sess.dateKey}
                  className="px-4 py-3 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">
                      {formatShortDate(sess.dateKey)}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400">
                      {sess.count} tested • {sess.excellentCount} Excellent • {sess.failCount} Fail
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="block font-extrabold text-blue-600 dark:text-blue-400">
                        {sess.avgScore} avg
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-slate-400">
                        {sess.passRate}% Pass
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: FAILURES, AT-RISK WATCHLIST & SEARCHABLE SCORE LOG */}
      {subView === 'failures' && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-3.5 space-y-3">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRosterFilter('failures')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  rosterFilter === 'failures'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                }`}
              >
                Failures Only ({metrics.fail})
              </button>
              <button
                type="button"
                onClick={() => setRosterFilter('at_risk')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  rosterFilter === 'at_risk'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                }`}
              >
                Fails + Borderline &lt;80 ({metrics.fail + metrics.borderlineCount})
              </button>
              <button
                type="button"
                onClick={() => setRosterFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  rosterFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                }`}
              >
                All Scores ({metrics.total})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Airman by name, rank, or date..."
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/70 pl-3 pr-8 py-2 text-xs text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Score / Failure Cards List */}
          <div className="space-y-2.5">
            {displayedScoreLogs.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 py-10 px-4 text-center">
                <p className="text-sm font-bold text-gray-700 dark:text-slate-300">
                  No matching PT records found
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  Try switching the filter above to &ldquo;All Scores&rdquo; or clearing the search box.
                </p>
              </div>
            ) : (
              displayedScoreLogs.map((item) => {
                const isFail = item.status === 'Fail';
                const isBorderline =
                  !isFail && item.totalScore !== null && item.totalScore < 80;
                const isExpanded = expandedMemberKey === item.id;
                const history = memberHistoryMap.get(item.memberKey) || {
                  scores: [],
                  checkIns: 0
                };

                return (
                  <div
                    key={item.id}
                    className={`bg-white dark:bg-slate-800 rounded-xl shadow-xs border transition-all overflow-hidden ${
                      isFail
                        ? 'border-red-200 dark:border-red-900/70'
                        : isBorderline
                        ? 'border-amber-200 dark:border-amber-900/60'
                        : 'border-gray-100 dark:border-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedMemberKey(isExpanded ? null : item.id)
                      }
                      className="w-full p-3.5 text-left space-y-2.5 hover:bg-gray-50/60 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      {/* Top Header: Name, Date, Score Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {item.rank} {item.lastName}, {item.firstName}
                            </span>
                            <span className="text-[11px] text-gray-400 dark:text-slate-400">
                              • {formatShortDate(item.dateKey)}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                            Age {item.age ?? 'N/A'} ({item.gender}) • {history.checkIns} Total Check-Ins
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                              isFail
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                : isBorderline
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                : item.tier === 'Excellent'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                            }`}
                          >
                            {item.totalScore ?? 'Exempt'} ({item.status})
                          </span>
                        </div>
                      </div>

                      {/* Failure / Weakest Component Diagnostic Badges */}
                      {(item.failureReasons.length > 0 || item.weakestComponent) && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.failureReasons.map((reason, rIdx) => (
                            <span
                              key={rIdx}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800/60"
                            >
                              ⚠ {reason}
                            </span>
                          ))}
                          {item.weakestComponent && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
                              Lowest: {item.weakestComponent.name} ({item.weakestComponent.pts}/
                              {item.weakestComponent.max} pts)
                            </span>
                          )}
                        </div>
                      )}

                      {/* Compact 4-Component Pill Grid */}
                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        <div
                          className={`p-1.5 rounded-lg text-center border ${
                            !item.whtrExempt && item.whtrPts === 0
                              ? 'bg-red-50/70 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                              : 'bg-gray-50 dark:bg-slate-700/40 border-gray-100 dark:border-slate-700'
                          }`}
                        >
                          <div className="text-[10px] text-gray-400 dark:text-slate-400">
                            WHtR
                          </div>
                          <div className="text-xs font-bold text-gray-800 dark:text-slate-200">
                            {item.whtrExempt ? 'Ex' : `${item.whtrPts ?? 0}/20`}
                          </div>
                        </div>

                        <div
                          className={`p-1.5 rounded-lg text-center border ${
                            !item.cardioExempt && item.cardioPts === 0
                              ? 'bg-red-50/70 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                              : 'bg-gray-50 dark:bg-slate-700/40 border-gray-100 dark:border-slate-700'
                          }`}
                        >
                          <div className="text-[10px] text-gray-400 dark:text-slate-400 truncate">
                            {item.cardioType.replace('2-Mile ', '')}
                          </div>
                          <div className="text-xs font-bold text-gray-800 dark:text-slate-200">
                            {item.cardioExempt ? 'Ex' : `${item.cardioPts ?? 0}/50`}
                          </div>
                        </div>

                        <div
                          className={`p-1.5 rounded-lg text-center border ${
                            !item.upperExempt && item.upperPts === 0
                              ? 'bg-red-50/70 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                              : 'bg-gray-50 dark:bg-slate-700/40 border-gray-100 dark:border-slate-700'
                          }`}
                        >
                          <div className="text-[10px] text-gray-400 dark:text-slate-400 truncate">
                            {item.upperType.replace('Standard ', '')}
                          </div>
                          <div className="text-xs font-bold text-gray-800 dark:text-slate-200">
                            {item.upperExempt ? 'Ex' : `${item.upperPts ?? 0}/15`}
                          </div>
                        </div>

                        <div
                          className={`p-1.5 rounded-lg text-center border ${
                            !item.coreExempt && item.corePts === 0
                              ? 'bg-red-50/70 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                              : 'bg-gray-50 dark:bg-slate-700/40 border-gray-100 dark:border-slate-700'
                          }`}
                        >
                          <div className="text-[10px] text-gray-400 dark:text-slate-400 truncate">
                            {item.coreType.replace('Standard ', '')}
                          </div>
                          <div className="text-xs font-bold text-gray-800 dark:text-slate-200">
                            {item.coreExempt ? 'Ex' : `${item.corePts ?? 0}/15`}
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Expandable Member Raw Values & Multi-Test History */}
                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 pt-2 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80 space-y-2.5 text-xs">
                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                          <div>
                            <span className="text-gray-400 block">Cardio Raw:</span>
                            <span className="font-semibold text-gray-800 dark:text-slate-200">
                              {item.cardioType}: {item.cardioInput || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Strength Raw:</span>
                            <span className="font-semibold text-gray-800 dark:text-slate-200">
                              {item.upperType}: {item.upperInput || 'N/A'} reps
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Core Raw:</span>
                            <span className="font-semibold text-gray-800 dark:text-slate-200">
                              {item.coreType}: {item.coreInput || 'N/A'}
                            </span>
                          </div>
                        </div>

                        {history.scores.length > 1 && (
                          <div className="pt-2 border-t border-gray-200/70 dark:border-slate-700">
                            <div className="text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                              Member PT Test History ({history.scores.length} Tests)
                            </div>
                            <div className="space-y-1">
                              {history.scores.map((h) => (
                                <div
                                  key={h.id}
                                  className="flex items-center justify-between text-[11px] py-1 px-2 rounded bg-white dark:bg-slate-700/60"
                                >
                                  <span className="text-gray-600 dark:text-slate-300">
                                    {formatShortDate(h.dateKey)}
                                  </span>
                                  <span
                                    className={`font-bold ${
                                      h.status === 'Fail'
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-emerald-600 dark:text-emerald-400'
                                    }`}
                                  >
                                    {h.totalScore} pts ({h.status})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Spreadsheet Download Links Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        <a
          href={EXCEL_EXPORT_URLS.scores}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl shadow-xs text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all"
        >
          Download PT Scores (.xlsx)
        </a>
        <a
          href={EXCEL_EXPORT_URLS.checkins}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl shadow-xs text-xs font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
        >
          Download Check-Ins (.xlsx)
        </a>
      </div>
    </div>
  );
}
