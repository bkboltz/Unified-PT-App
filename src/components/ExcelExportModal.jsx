import React, { useState, useMemo, useEffect } from 'react';
import { toLocalDateKey, parseSheetTimestamp } from '../services/api';
import { downloadXlsxFile } from '../utils/xlsxExport';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

function formatShortDate(dateKey) {
  if (!dateKey) return '—';
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return dateKey;
  return dt.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function buildDateKey(year, monthIndex, day) {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export default function ExcelExportModal({
  isOpen,
  exportType, // 'checkins' | 'scores'
  allCheckIns = [],
  allScores = [],
  todayKey,
  onClose
}) {
  const effectiveToday = todayKey || toLocalDateKey(new Date());
  const isScores = exportType === 'scores';
  const records = isScores ? allScores : allCheckIns;

  // 'today' | 'range' | 'all'
  const [scope, setScope] = useState('today');
  const [rangeStart, setRangeStart] = useState(effectiveToday);
  const [rangeEnd, setRangeEnd] = useState(effectiveToday);
  const [selectingStep, setSelectingStep] = useState('done'); // 'awaiting_end' | 'done'

  // Calendar visible month/year
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  // Map of dateKey -> record count for calendar activity dots
  const dateCountsMap = useMemo(() => {
    const map = new Map();
    for (const item of records) {
      if (!item.dateKey) continue;
      map.set(item.dateKey, (map.get(item.dateKey) || 0) + 1);
    }
    return map;
  }, [records]);

  // Reset defaults sensibly when modal opens
  useEffect(() => {
    if (isOpen) {
      const todayCount = dateCountsMap.get(effectiveToday) || 0;
      // Default to 'today' if today has records, or keep 'today' selected ready to switch
      setScope('today');

      // Find latest date with data so the calendar starts on an active month
      const sortedDates = Array.from(dateCountsMap.keys()).sort((a, b) =>
        b.localeCompare(a)
      );
      const defaultRefDate =
        todayCount > 0 ? effectiveToday : sortedDates[0] || effectiveToday;

      setRangeStart(defaultRefDate);
      setRangeEnd(defaultRefDate);
      setSelectingStep('done');

      const [y, m] = defaultRefDate.split('-').map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [isOpen, exportType, effectiveToday, dateCountsMap]);

  // Calendar grid generation for (viewYear, viewMonth)
  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = buildDateKey(viewYear, viewMonth, day);
      cells.push({
        day,
        dateKey,
        count: dateCountsMap.get(dateKey) || 0
      });
    }
    return cells;
  }, [viewYear, viewMonth, dateCountsMap]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDayClick = (clickedKey) => {
    if (selectingStep === 'done' || !rangeStart) {
      // First tap: set start and end to this date
      setRangeStart(clickedKey);
      setRangeEnd(clickedKey);
      setSelectingStep('awaiting_end');
    } else {
      // Second tap: complete the range
      if (clickedKey < rangeStart) {
        setRangeEnd(rangeStart);
        setRangeStart(clickedKey);
      } else {
        setRangeEnd(clickedKey);
      }
      setSelectingStep('done');
    }
  };

  const applyQuickRange = (daysBack) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - daysBack);
    const startKey = toLocalDateKey(start);
    const endKey = toLocalDateKey(end);
    setRangeStart(startKey);
    setRangeEnd(endKey);
    setSelectingStep('done');
    setViewYear(end.getFullYear());
    setViewMonth(end.getMonth());
  };

  // Filtered records based on selected option
  const todayRecords = useMemo(() => {
    return records.filter((r) => r.dateKey === effectiveToday);
  }, [records, effectiveToday]);

  const rangeRecords = useMemo(() => {
    if (!rangeStart || !rangeEnd) return [];
    const minKey = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
    const maxKey = rangeStart <= rangeEnd ? rangeEnd : rangeStart;
    return records.filter((r) => r.dateKey >= minKey && r.dateKey <= maxKey);
  }, [records, rangeStart, rangeEnd]);

  const selectedRecords = useMemo(() => {
    if (scope === 'today') return todayRecords;
    if (scope === 'range') return rangeRecords;
    return records;
  }, [scope, todayRecords, rangeRecords, records]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const suffix =
      scope === 'today'
        ? effectiveToday
        : scope === 'range'
        ? rangeStart === rangeEnd
          ? rangeStart
          : `${rangeStart}_to_${rangeEnd}`
        : 'All_History';

    if (isScores) {
      const headers = [
        'Date/Time',
        'Rank',
        'First Name',
        'Last Name',
        'Sex',
        'Age',
        'WHtR',
        'Cardio Component',
        'Time/Shuttles',
        'Points',
        'Strength Component',
        'Reps',
        'Score',
        'Core Components',
        'Reps/Time',
        'Score',
        'Total Score',
        'Pass/Fail'
      ];

      const rows = selectedRecords.map((s) => [
        s.timestamp || s.dateKey,
        s.rank,
        s.firstName,
        s.lastName,
        s.gender,
        s.age ?? '',
        s.whtrExempt ? 'Exempt' : s.whtrPts ?? '',
        s.cardioExempt ? 'Exempt' : s.cardioType,
        s.cardioExempt ? 'Exempt' : s.cardioInput,
        s.cardioExempt
          ? 'Exempt'
          : s.isWalk
          ? s.walkPassed
            ? 'Pass (Walk)'
            : 'Fail (Walk)'
          : s.cardioPts ?? '',
        s.upperExempt ? 'Exempt' : s.upperType,
        s.upperExempt ? 'Exempt' : s.upperInput,
        s.upperExempt ? 'Exempt' : s.upperPts ?? '',
        s.coreExempt ? 'Exempt' : s.coreType,
        s.coreExempt ? 'Exempt' : s.coreInput,
        s.coreExempt ? 'Exempt' : s.corePts ?? '',
        s.status === 'Exempt' ? 'Exempt' : s.totalScore ?? '',
        s.status
      ]);

      downloadXlsxFile({
        filename: `PT_Scores_${suffix}.xlsx`,
        sheetName: 'PT Scores',
        headers,
        rows
      });
    } else {
      const headers = [
        'Date/Time',
        'Date',
        'Time',
        'Rank',
        'First Name',
        'Last Name',
        'Check-in Method'
      ];

      const rows = selectedRecords.map((c) => {
        const dt = parseSheetTimestamp(c.timestamp);
        const timeStr = !dt
          ? ''
          : dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return [
          c.timestamp,
          c.dateKey,
          timeStr,
          c.rank,
          c.firstName,
          c.lastName,
          c.method || 'QR Scan'
        ];
      });

      downloadXlsxFile({
        filename: `PT_CheckIns_${suffix}.xlsx`,
        sheetName: 'Check-Ins',
        headers,
        rows
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-slate-700 overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white">
              Download {isScores ? 'PT Scores' : 'Check-Ins'} (.xlsx)
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Select which timeframe to include in the Excel file
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-3 max-h-[78vh] overflow-y-auto">
          {/* Option 1: Today's Data */}
          <button
            type="button"
            onClick={() => setScope('today')}
            className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
              scope === 'today'
                ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-500 shadow-xs'
                : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  scope === 'today'
                    ? 'border-blue-600 bg-blue-600'
                    : 'border-gray-400 dark:border-slate-500'
                }`}
              >
                {scope === 'today' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                  1. Today&apos;s {isScores ? 'Scores' : 'Check-Ins'}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-slate-400">
                  {formatShortDate(effectiveToday)}
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200">
              {todayRecords.length} {todayRecords.length === 1 ? 'row' : 'rows'}
            </span>
          </button>

          {/* Option 2: Specific Date Range + Interactive Mobile Calendar */}
          <div
            className={`rounded-xl border transition-all overflow-hidden ${
              scope === 'range'
                ? 'border-blue-600 bg-blue-50/30 dark:bg-slate-800 dark:border-blue-500 shadow-xs'
                : 'border-gray-200 dark:border-slate-700'
            }`}
          >
            <button
              type="button"
              onClick={() => setScope('range')}
              className="w-full p-3.5 text-left flex items-center justify-between gap-3 hover:bg-gray-50/60 dark:hover:bg-slate-700/40"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    scope === 'range'
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-400 dark:border-slate-500'
                  }`}
                >
                  {scope === 'range' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                    2. Specific Date Range
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-slate-400">
                    {rangeStart === rangeEnd
                      ? formatShortDate(rangeStart)
                      : `${formatShortDate(rangeStart)} → ${formatShortDate(rangeEnd)}`}
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200">
                {rangeRecords.length} {rangeRecords.length === 1 ? 'row' : 'rows'}
              </span>
            </button>

            {/* Expandable Touch-Friendly Calendar */}
            {scope === 'range' && (
              <div className="p-3.5 border-t border-gray-200/80 dark:border-slate-700 bg-white dark:bg-slate-800/90 space-y-3">
                {/* Selected Start / End Summary Pill Row */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div
                    className={`p-2 rounded-lg border ${
                      selectingStep === 'done'
                        ? 'border-blue-200 dark:border-slate-600 bg-blue-50/50 dark:bg-slate-700/60'
                        : 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-slate-400 block">
                      Start Date
                    </span>
                    <span className="text-xs font-extrabold text-gray-900 dark:text-white">
                      {formatShortDate(rangeStart)}
                    </span>
                  </div>
                  <div
                    className={`p-2 rounded-lg border ${
                      selectingStep === 'awaiting_end'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 animate-pulse'
                        : 'border-blue-200 dark:border-slate-600 bg-blue-50/50 dark:bg-slate-700/60'
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-slate-400 block">
                      {selectingStep === 'awaiting_end' ? 'Tap End Date' : 'End Date'}
                    </span>
                    <span className="text-xs font-extrabold text-gray-900 dark:text-white">
                      {formatShortDate(rangeEnd)}
                    </span>
                  </div>
                </div>

                {/* Quick Range Chips */}
                <div className="flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyQuickRange(7)}
                    className="flex-1 py-1 px-2 rounded-md text-[11px] font-semibold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200"
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickRange(30)}
                    className="flex-1 py-1 px-2 rounded-md text-[11px] font-semibold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200"
                  >
                    Last 30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickRange(90)}
                    className="flex-1 py-1 px-2 rounded-md text-[11px] font-semibold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200"
                  >
                    Last 90 Days
                  </button>
                </div>

                {/* Month / Year Switcher */}
                <div className="flex items-center justify-between px-1 pt-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-600 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-95"
                  >
                    ←
                  </button>
                  <div className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </div>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-600 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-95"
                  >
                    →
                  </button>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 text-center">
                  {WEEKDAYS.map((wd) => (
                    <div
                      key={wd}
                      className="text-[10px] font-bold text-gray-400 dark:text-slate-500 py-1"
                    >
                      {wd}
                    </div>
                  ))}
                </div>

                {/* Clickable Day Grid */}
                <div className="grid grid-cols-7 gap-y-1 text-center">
                  {calendarCells.map((cell, idx) => {
                    if (!cell) {
                      return <div key={`empty-${idx}`} className="h-10" />;
                    }

                    const isStart = cell.dateKey === rangeStart;
                    const isEnd = cell.dateKey === rangeEnd;
                    const isInRange =
                      cell.dateKey > rangeStart && cell.dateKey < rangeEnd;
                    const isToday = cell.dateKey === effectiveToday;
                    const hasData = cell.count > 0;

                    return (
                      <button
                        key={cell.dateKey}
                        type="button"
                        onClick={() => handleDayClick(cell.dateKey)}
                        className={`relative h-10 flex flex-col items-center justify-center text-xs font-bold transition-all select-none ${
                          isStart || isEnd
                            ? 'bg-blue-600 text-white rounded-xl shadow-xs z-10'
                            : isInRange
                            ? 'bg-blue-100/80 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
                            : 'text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60 rounded-xl'
                        }`}
                      >
                        <span className={isToday && !isStart && !isEnd ? 'underline font-extrabold text-blue-600 dark:text-blue-400' : ''}>
                          {cell.day}
                        </span>
                        {/* Activity Dot for dates that have Check-Ins or Scores */}
                        {hasData && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                              isStart || isEnd
                                ? 'bg-white'
                                : 'bg-emerald-500 dark:bg-emerald-400'
                            }`}
                            title={`${cell.count} records on ${cell.dateKey}`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-slate-500 pt-1">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Date has
                    recorded {isScores ? 'scores' : 'check-ins'}
                  </span>
                  <span>Tap once for 1 day, tap twice for range</span>
                </div>
              </div>
            )}
          </div>

          {/* Option 3: All Historical Data */}
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
              scope === 'all'
                ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-500 shadow-xs'
                : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  scope === 'all'
                    ? 'border-blue-600 bg-blue-600'
                    : 'border-gray-400 dark:border-slate-500'
                }`}
              >
                {scope === 'all' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                  3. All Historical Data
                </div>
                <div className="text-[11px] text-gray-500 dark:text-slate-400">
                  Complete archive from Google Sheets
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200">
              {records.length} {records.length === 1 ? 'row' : 'rows'}
            </span>
          </button>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-200/70 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={selectedRecords.length === 0}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-sm transition-all active:scale-[0.98]"
          >
            Download .xlsx ({selectedRecords.length}{' '}
            {selectedRecords.length === 1 ? 'Row' : 'Rows'})
          </button>
        </div>
      </div>
    </div>
  );
}
