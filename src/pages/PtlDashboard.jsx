import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  fetchLiveCheckIns,
  fetchPtScores,
  submitCheckIn,
  toLocalDateKey,
  EXCEL_EXPORT_URLS
} from '../services/api';
import { RANKS } from '../data/scoringTables';
import PtlAnalyticsTab from '../components/PtlAnalyticsTab';

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

export default function PtlDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'analytics'

  // Roster & History State
  const [allCheckIns, setAllCheckIns] = useState([]);
  const [allScores, setAllScores] = useState([]);
  const [todayKey, setTodayKey] = useState(() => toLocalDateKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateKey(new Date()));
  const [rosterSearch, setRosterSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [showManualCheckIn, setShowManualCheckIn] = useState(false);

  // Manual Check-In Form State
  const [manualForm, setManualForm] = useState({
    rank: '',
    firstName: '',
    lastName: ''
  });
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [manualSuccessMsg, setManualSuccessMsg] = useState('');

  // QR Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrTimestamp, setQrTimestamp] = useState(Date.now());

  const checkInUrl = `${window.location.origin}/checkin?t=${qrTimestamp}`;
  const validPin = import.meta.env.VITE_PTL_PIN || '391234';

  // Dynamic QR code auto-refresh every 10 seconds when modal is open
  useEffect(() => {
    let interval;
    if (showQrModal) {
      interval = setInterval(() => {
        setQrTimestamp(Date.now());
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [showQrModal]);

  // Live roster fetching function
  const loadCheckIns = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetchLiveCheckIns();
      if (res.success) {
        setAllCheckIns(Array.isArray(res.allCheckIns) ? res.allCheckIns : []);
        if (res.todayKey) {
          setTodayKey(res.todayKey);
        }
      }
    } catch (err) {
      console.error('Error fetching live check-ins:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Direct Google Sheet PT Scores fetching function
  const loadPtScores = async () => {
    setIsLoadingScores(true);
    try {
      const res = await fetchPtScores();
      if (res.success) {
        setAllScores(Array.isArray(res.scores) ? res.scores : []);
      }
    } catch (err) {
      console.error('Error fetching PT scores:', err);
    } finally {
      setIsLoadingScores(false);
    }
  };

  const refreshAllData = () => {
    loadCheckIns();
    loadPtScores();
  };

  // Poll for new check-ins every 10s once logged in, and load PT scores
  useEffect(() => {
    if (isAuthenticated) {
      loadCheckIns();
      loadPtScores();
      const interval = setInterval(loadCheckIns, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Distinct session dates summary for the dropdown
  const sessionDatesSummary = useMemo(() => {
    const counts = new Map();
    for (const item of allCheckIns) {
      if (!item.dateKey) continue;
      counts.set(item.dateKey, (counts.get(item.dateKey) || 0) + 1);
    }
    if (!counts.has(todayKey)) {
      counts.set(todayKey, 0);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateKey, count]) => ({ dateKey, count }));
  }, [allCheckIns, todayKey]);

  // Check-ins for the selected date (plus optional search filter)
  const dateCheckIns = useMemo(() => {
    return allCheckIns.filter((item) => item.dateKey === selectedDate);
  }, [allCheckIns, selectedDate]);

  const displayedCheckIns = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    if (!q) return dateCheckIns;
    return dateCheckIns.filter(
      (item) =>
        `${item.firstName} ${item.lastName}`.toLowerCase().includes(q) ||
        item.rank.toLowerCase().includes(q)
    );
  }, [dateCheckIns, rosterSearch]);

  const failCount = useMemo(() => {
    return allScores.filter((s) => s.status === 'Fail').length;
  }, [allScores]);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin === validPin) {
      setIsAuthenticated(true);
    } else {
      alert('Invalid PIN');
      setPin('');
    }
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    setIsAddingMember(true);

    try {
      const res = await submitCheckIn({
        rank: manualForm.rank,
        firstName: manualForm.firstName,
        lastName: manualForm.lastName,
        method: 'Manual Entry (PTL)'
      });

      if (res.success) {
        const addedLabel = `${manualForm.rank} ${manualForm.lastName}`;
        setManualForm({ rank: '', firstName: '', lastName: '' });
        setSelectedDate(todayKey);
        setShowManualCheckIn(false);
        setManualSuccessMsg(`✓ Checked in ${addedLabel}`);
        setTimeout(() => setManualSuccessMsg(''), 3500);
        loadCheckIns();
      } else {
        alert('Failed to add member to roster.');
      }
    } catch (err) {
      console.error('Manual entry failed:', err);
    } finally {
      setIsAddingMember(false);
    }
  };

  const inputStyle =
    'mt-1 block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors';
  const labelStyle = 'block text-xs font-medium text-gray-600 dark:text-slate-300';

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-8 transition-colors text-gray-900 dark:text-gray-100">
        {/* Dynamic QR Code + Manual Check-In Modal */}
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 max-w-sm w-full text-center relative border border-gray-200 dark:border-slate-700 my-auto">
              <button
                onClick={() => setShowQrModal(false)}
                className="absolute top-3.5 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-lg"
              >
                ✕
              </button>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Scan to Check-In
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                Auto-refreshes every 10 seconds
              </p>
              <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200 inline-block">
                <QRCodeSVG value={checkInUrl} size={195} />
              </div>

              {/* Manual Check-In Form Under QR Code */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700 dark:text-slate-200">
                    Forgot Phone? Manual Check-In
                  </span>
                  {manualSuccessMsg && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {manualSuccessMsg}
                    </span>
                  )}
                </div>
                <form onSubmit={handleManualAdd} className="space-y-2.5">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <select
                        className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-2 text-xs text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                        value={manualForm.rank}
                        onChange={(e) => setManualForm({ ...manualForm, rank: e.target.value })}
                        required
                      >
                        <option value="" disabled>
                          Rank
                        </option>
                        <optgroup label="Enlisted">
                          {RANKS.enlisted.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.value}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Officer">
                          {RANKS.officer.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.value}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="First Name"
                        className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-2 text-xs text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                        value={manualForm.firstName}
                        onChange={(e) =>
                          setManualForm({ ...manualForm, firstName: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Last Name"
                        className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-2 text-xs text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                        value={manualForm.lastName}
                        onChange={(e) =>
                          setManualForm({ ...manualForm, lastName: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isAddingMember}
                    className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    {isAddingMember ? 'Checking In...' : '+ Check In Member'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Top Header + 2-Tab Navigation Bar */}
        <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200/70 dark:border-slate-800 px-3 sm:px-6 pt-3 pb-2.5">
          <div className="max-w-3xl mx-auto space-y-2.5">
            <header className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm shadow-xs shrink-0">
                  PT
                </div>
                <div className="truncate">
                  <h1 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white truncate leading-tight">
                    PTL Command Center
                  </h1>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                    Live Check-Ins &amp; Squadron PT Analytics
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={() => setShowQrModal(true)}
                  className="inline-flex items-center px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-sm transition-all gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                    />
                  </svg>
                  <span>Check-In QR</span>
                </button>
                <Link
                  to="/"
                  className="inline-flex items-center px-2.5 py-2 border border-gray-300 dark:border-slate-600 text-xs font-semibold rounded-xl text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50"
                >
                  Exit
                </Link>
              </div>
            </header>

            {/* 2-Tab Segmented Navigation */}
            <div className="grid grid-cols-2 gap-1.5 bg-gray-200/80 dark:bg-slate-800 p-1 rounded-xl border border-gray-200/80 dark:border-slate-700">
              <button
                onClick={() => setActiveTab('roster')}
                className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'roster'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
                }`}
              >
                <span>Check-Ins</span>
                <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-blue-100 dark:bg-slate-600 text-blue-700 dark:text-slate-200 font-extrabold">
                  {dateCheckIns.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'analytics'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
                }`}
              >
                <span>PT Analytics</span>
                {failCount > 0 ? (
                  <span
                    className="px-1.5 py-0.5 text-[11px] rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 font-extrabold"
                    title={`${failCount} Failed PT Tests`}
                  >
                    {failCount} Fails
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-slate-200">
                    {allScores.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-4 space-y-4">
          {/* TAB 1: CHECK-INS (DEFAULT & FASTEST ACCESS) */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              {/* Hero Quick Check-In Action Bar */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-transparent dark:from-blue-500/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">
                        Live Session Check-In
                      </h2>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      Display rotating QR code or manually check in Airmen without phones
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all"
                    >
                      <span>Launch QR Code</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowManualCheckIn(!showManualCheckIn)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-50 transition-all"
                    >
                      <span>{showManualCheckIn ? '− Hide Manual' : '+ Manual Entry'}</span>
                    </button>
                  </div>
                </div>

                {manualSuccessMsg && (
                  <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-t border-emerald-100 dark:border-emerald-900/50 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    {manualSuccessMsg}
                  </div>
                )}

                {showManualCheckIn && (
                  <form
                    onSubmit={handleManualAdd}
                    className="p-4 border-t border-gray-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-gray-50/50 dark:bg-slate-800/60"
                  >
                    <div>
                      <label className={labelStyle}>Rank</label>
                      <select
                        className={inputStyle}
                        value={manualForm.rank}
                        onChange={(e) => setManualForm({ ...manualForm, rank: e.target.value })}
                        required
                      >
                        <option value="" disabled>
                          Rank
                        </option>
                        <optgroup label="Enlisted">
                          {RANKS.enlisted.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.value}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Officer">
                          {RANKS.officer.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.value}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label className={labelStyle}>First Name</label>
                      <input
                        type="text"
                        placeholder="First"
                        className={inputStyle}
                        value={manualForm.firstName}
                        onChange={(e) =>
                          setManualForm({ ...manualForm, firstName: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className={labelStyle}>Last Name</label>
                      <input
                        type="text"
                        placeholder="Last"
                        className={inputStyle}
                        value={manualForm.lastName}
                        onChange={(e) =>
                          setManualForm({ ...manualForm, lastName: e.target.value })
                        }
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isAddingMember}
                      className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-xs"
                    >
                      {isAddingMember ? 'Adding...' : 'Check In'}
                    </button>
                  </form>
                )}
              </div>

              {/* Roster Card */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                {/* Date Picker & Search Header */}
                <div className="p-3.5 border-b border-gray-100 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <select
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-2 text-xs sm:text-sm font-bold text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    >
                      {sessionDatesSummary.map(({ dateKey, count }) => (
                        <option key={dateKey} value={dateKey}>
                          {dateKey === todayKey
                            ? `Today (${formatShortDate(dateKey)})`
                            : formatShortDate(dateKey)}{' '}
                          — {count} {count === 1 ? 'Check-In' : 'Check-Ins'}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={refreshAllData}
                      disabled={isRefreshing}
                      className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 shrink-0"
                      title="Refresh Roster"
                    >
                      <svg
                        className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
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

                  {dateCheckIns.length > 4 && (
                    <div className="relative">
                      <input
                        type="text"
                        value={rosterSearch}
                        onChange={(e) => setRosterSearch(e.target.value)}
                        placeholder={`Filter ${dateCheckIns.length} checked-in members...`}
                        className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50/70 dark:bg-slate-700/60 pl-3 pr-8 py-1.5 text-xs text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                      />
                      {rosterSearch && (
                        <button
                          type="button"
                          onClick={() => setRosterSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Roster List */}
                <div className="divide-y divide-gray-100 dark:divide-slate-700/60 max-h-[460px] overflow-y-auto">
                  {displayedCheckIns.length === 0 ? (
                    <div className="py-10 px-4 text-center">
                      <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                        {rosterSearch
                          ? 'No matching members on this date'
                          : `No check-ins on ${formatShortDate(selectedDate)}`}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                        {rosterSearch
                          ? 'Clear your search filter above to see the full roster.'
                          : 'Select another date above or launch the QR code for members to scan.'}
                      </p>
                    </div>
                  ) : (
                    displayedCheckIns.map((item, idx) => {
                      const dateObj = new Date(item.timestamp);
                      const timeStr = isNaN(dateObj.getTime())
                        ? ''
                        : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      return (
                        <div
                          key={`${item.timestamp}-${idx}`}
                          className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/60 dark:hover:bg-slate-700/20"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">
                              {displayedCheckIns.length - idx}
                            </span>
                            <div className="truncate">
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                {item.rank} {item.lastName}, {item.firstName}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-medium text-gray-500 dark:text-slate-400 block">
                              {timeStr}
                            </span>
                            {item.method && item.method !== 'QR Scan' && (
                              <span className="text-[10px] text-gray-400 dark:text-slate-500 block">
                                Manual
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Two Separate Excel Download Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <a
                  href={EXCEL_EXPORT_URLS.scores}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl shadow-xs text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                >
                  Download PT Scores (.xlsx)
                </a>
                <a
                  href={EXCEL_EXPORT_URLS.checkins}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl shadow-xs text-xs font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all active:scale-[0.98]"
                >
                  Download Check-Ins (.xlsx)
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: ANALYTICS & FAILURES */}
          {activeTab === 'analytics' && (
            <PtlAnalyticsTab
              allScores={allScores}
              allCheckIns={allCheckIns}
              isLoadingScores={isLoadingScores}
              onRefresh={refreshAllData}
            />
          )}

          {/* Footer Subtext Credits */}
          <footer className="pt-4 pb-2 text-center">
            <p className="text-[11px] text-gray-400 dark:text-slate-500">
              Created &amp; Designed by{' '}
              <span className="font-medium text-gray-500 dark:text-slate-400">
                TSgt Brandon Boltz
              </span>{' '}
              •{' '}
              <a
                href="https://github.com/bkboltz/Unified-PT-App"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
              >
                github.com/bkboltz/Unified-PT-App
              </a>
            </p>
          </footer>
        </div>
      </div>
    );
  }

  // PIN Gate Login Render
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-700">
        <div className="p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
              <span className="text-3xl" role="img" aria-label="Lock">
                🔒
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              PTL Access Only
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
              Enter your authorization PIN to manage the session.
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-6">
            <div>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••••"
                className="block w-full text-center tracking-[0.35em] pl-[0.35em] text-2xl font-bold rounded-xl border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 py-4 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-4 px-4 border border-transparent rounded-xl shadow-sm text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98]"
            >
              Unlock Dashboard
            </button>
          </form>
        </div>

        <div className="bg-gray-50 dark:bg-slate-800/80 px-8 py-4 border-t border-gray-100 dark:border-slate-700 text-center space-y-2">
          <div>
            <Link
              to="/"
              className="text-sm font-medium text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              ← Return to Calculator
            </Link>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500">
            Created &amp; Designed by{' '}
            <span className="font-medium text-gray-500 dark:text-slate-400">
              TSgt Brandon Boltz
            </span>{' '}
            •{' '}
            <a
              href="https://github.com/bkboltz/Unified-PT-App"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              github.com/bkboltz/Unified-PT-App
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
