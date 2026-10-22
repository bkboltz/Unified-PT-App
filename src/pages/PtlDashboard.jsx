import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  fetchLiveCheckIns,
  submitCheckIn,
  submitScore,
  toLocalDateKey,
  EXCEL_EXPORT_URLS
} from '../services/api';
import {
  calculateWhtr,
  calculateCardioScore,
  calculateUpperScore,
  calculateCoreScore,
  calculateCompositeScore,
  formatTimeInput
} from '../utils/calculator';
import { RANKS } from '../data/scoringTables';

const SESSION_STORAGE_KEY = 'ptlActiveTestSession_v1';

const ACTIVITY_NAMES = {
  run: '2-Mile Run',
  hamr: 'HAMR',
  pushups: 'Standard Push-ups',
  hrPushups: 'HR Push-ups',
  situps: 'Standard Sit-ups',
  crunches: 'CLR Crunches',
  plank: 'Forearm Plank'
};

function createTester({ rank = '', firstName = '', lastName = '', gender = 'male', age = '' } = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    rank,
    firstName,
    lastName,
    gender,
    age,
    heightFeet: '',
    heightInches: '',
    waist: '',
    cardioType: 'run',
    cardioInput: '',
    upperType: 'pushups',
    upperInput: '',
    coreType: 'situps',
    coreInput: '',
    exemptions: {
      whtr: false,
      cardio: false,
      upper: false,
      core: false
    },
    submitted: false,
    submittedAt: null
  };
}

function evaluateTester(tester) {
  const ex = tester.exemptions || { whtr: false, cardio: false, upper: false, core: false };
  const hasAge = Boolean(tester.age && parseInt(tester.age, 10) > 0);
  const totalHeight =
    parseInt(tester.heightFeet || 0, 10) * 12 + parseFloat(tester.heightInches || 0);
  const waistInches = parseFloat(tester.waist || 0);

  const hasWhtrInput = ex.whtr || (totalHeight > 0 && waistInches > 0);
  const hasCardioInput = ex.cardio || Boolean(tester.cardioInput);
  const hasUpperInput = ex.upper || Boolean(tester.upperInput);
  const hasCoreInput = ex.core || Boolean(tester.coreInput);

  const isComplete =
    Boolean(tester.rank && tester.firstName && tester.lastName) &&
    (ex.cardio && ex.upper && ex.core ? true : hasAge) &&
    hasWhtrInput &&
    hasCardioInput &&
    hasUpperInput &&
    hasCoreInput;

  const whtrScore = ex.whtr ? 0 : calculateWhtr(totalHeight, waistInches);
  const cardioScore = ex.cardio
    ? 0
    : calculateCardioScore(tester.cardioType, tester.gender, tester.age, tester.cardioInput);
  const upperScore = ex.upper
    ? 0
    : calculateUpperScore(tester.upperType, tester.gender, tester.age, tester.upperInput);
  const coreScore = ex.core
    ? 0
    : calculateCoreScore(tester.coreType, tester.gender, tester.age, tester.coreInput);

  const composite = calculateCompositeScore(
    { whtr: whtrScore, cardio: cardioScore, upper: upperScore, core: coreScore },
    ex
  );

  return {
    ...composite,
    isComplete
  };
}

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
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'test'

  // Roster & History State
  const [allCheckIns, setAllCheckIns] = useState([]);
  const [todayKey, setTodayKey] = useState(() => toLocalDateKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateKey(new Date()));
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  // Official PT Test Session State (persisted in localStorage)
  const [testers, setTesters] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to restore test session:', err);
    }
    return [];
  });
  const [activeTesterId, setActiveTesterId] = useState(null);
  const [showAddTesterModal, setShowAddTesterModal] = useState(false);
  const [newTesterForm, setNewTesterForm] = useState({
    rank: '',
    firstName: '',
    lastName: '',
    gender: 'male',
    age: ''
  });
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const [submittingSingleId, setSubmittingSingleId] = useState(null);

  const checkInUrl = `${window.location.origin}/checkin?t=${qrTimestamp}`;
  const validPin = import.meta.env.VITE_PTL_PIN || '391234';

  // Keep activeTesterId synced when testers list changes
  useEffect(() => {
    if (testers.length === 0) {
      setActiveTesterId(null);
    } else if (!activeTesterId || !testers.some((t) => t.id === activeTesterId)) {
      setActiveTesterId(testers[0].id);
    }
  }, [testers, activeTesterId]);

  // Persist testers to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(testers));
    } catch (err) {
      console.error('Error saving test session:', err);
    }
  }, [testers]);

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

  // Poll for new check-ins every 10s once logged in
  useEffect(() => {
    if (isAuthenticated) {
      loadCheckIns();
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

  // Check-ins for the selected date
  const displayedCheckIns = useMemo(() => {
    return allCheckIns.filter((item) => item.dateKey === selectedDate);
  }, [allCheckIns, selectedDate]);

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

  // Official PT Test Handlers
  const handleAddTesterToSession = (e) => {
    e.preventDefault();
    if (!newTesterForm.rank || !newTesterForm.firstName || !newTesterForm.lastName) return;
    const created = createTester(newTesterForm);
    setTesters((prev) => [...prev, created]);
    setActiveTesterId(created.id);
    setNewTesterForm({
      rank: '',
      firstName: '',
      lastName: '',
      gender: 'male',
      age: ''
    });
    setShowAddTesterModal(false);
  };

  const updateTester = (testerId, updater) => {
    setTesters((prev) =>
      prev.map((t) => {
        if (t.id !== testerId) return t;
        const updated = typeof updater === 'function' ? updater(t) : { ...t, ...updater };
        return { ...updated, submitted: false };
      })
    );
  };

  const removeTester = (testerId) => {
    setTesters((prev) => prev.filter((t) => t.id !== testerId));
  };

  const clearTestSession = () => {
    if (window.confirm('Clear all testers from this PT test session?')) {
      setTesters([]);
      setActiveTesterId(null);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };

  const buildTesterPayload = (tester) => {
    const ev = evaluateTester(tester);
    const ex = tester.exemptions || {};
    return {
      rank: tester.rank,
      firstName: tester.firstName,
      lastName: tester.lastName,
      gender: tester.gender,
      age: tester.age || 'N/A',
      whtrPts: ex.whtr ? 'Exempt' : ev.whtr,
      cardioType: ex.cardio ? 'Exempt' : ACTIVITY_NAMES[tester.cardioType],
      cardioInput: ex.cardio ? 'Exempt' : tester.cardioInput,
      cardioPts: ex.cardio ? 'Exempt' : ev.cardio,
      upperType: ex.upper ? 'Exempt' : ACTIVITY_NAMES[tester.upperType],
      upperInput: ex.upper ? 'Exempt' : tester.upperInput,
      upperPts: ex.upper ? 'Exempt' : ev.upper,
      coreType: ex.core ? 'Exempt' : ACTIVITY_NAMES[tester.coreType],
      coreInput: ex.core ? 'Exempt' : tester.coreInput,
      corePts: ex.core ? 'Exempt' : ev.core,
      total: ev.isFullExempt ? 'Exempt' : ev.total,
      passFail: ev.isFullExempt ? 'Exempt' : ev.passed ? 'Pass' : 'Fail'
    };
  };

  const handleSubmitSingleTester = async (tester) => {
    const ev = evaluateTester(tester);
    if (!ev.isComplete) {
      alert('Please complete Age and all non-exempt fields before submitting.');
      return;
    }
    setSubmittingSingleId(tester.id);
    try {
      const payload = buildTesterPayload(tester);
      const res = await submitScore(payload);
      if (res.success) {
        setTesters((prev) =>
          prev.map((t) =>
            t.id === tester.id
              ? { ...t, submitted: true, submittedAt: new Date().toLocaleTimeString() }
              : t
          )
        );
      } else {
        alert('Failed to submit score to Google Sheet.');
      }
    } finally {
      setSubmittingSingleId(null);
    }
  };

  const handleSubmitAllTesters = async () => {
    const readyTesters = testers.filter((t) => !t.submitted && evaluateTester(t).isComplete);
    if (readyTesters.length === 0) {
      alert('No completed unsubmitted testers ready to send.');
      return;
    }

    setIsBatchSubmitting(true);
    let successCount = 0;

    for (const tester of readyTesters) {
      const payload = buildTesterPayload(tester);
      const res = await submitScore(payload);
      if (res.success) {
        successCount++;
        const nowStr = new Date().toLocaleTimeString();
        setTesters((prev) =>
          prev.map((t) =>
            t.id === tester.id ? { ...t, submitted: true, submittedAt: nowStr } : t
          )
        );
      }
    }

    setIsBatchSubmitting(false);
    alert(`Submitted ${successCount} of ${readyTesters.length} tester(s) to the Google Sheet!`);
  };

  const handleExportSessionCsv = () => {
    if (testers.length === 0) return;

    const headers = [
      'Date',
      'Rank',
      'First Name',
      'Last Name',
      'Sex',
      'Age',
      'Height (in)',
      'Waist (in)',
      'WHtR Points',
      'Cardio Component',
      'Cardio Time/Shuttles',
      'Cardio Points',
      'Strength Component',
      'Strength Reps',
      'Strength Points',
      'Core Component',
      'Core Reps/Time',
      'Core Points',
      'Total Score',
      'Pass/Fail'
    ];

    const escapeCsv = (val) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = testers.map((tester) => {
      const ev = evaluateTester(tester);
      const ex = tester.exemptions || {};
      const totalHeight =
        parseInt(tester.heightFeet || 0, 10) * 12 + parseFloat(tester.heightInches || 0);
      return [
        todayKey,
        tester.rank,
        tester.firstName,
        tester.lastName,
        tester.gender,
        tester.age || '',
        ex.whtr ? 'Exempt' : totalHeight || '',
        ex.whtr ? 'Exempt' : tester.waist || '',
        ex.whtr ? 'Exempt' : ev.whtr,
        ex.cardio ? 'Exempt' : ACTIVITY_NAMES[tester.cardioType],
        ex.cardio ? 'Exempt' : tester.cardioInput,
        ex.cardio ? 'Exempt' : ev.cardio,
        ex.upper ? 'Exempt' : ACTIVITY_NAMES[tester.upperType],
        ex.upper ? 'Exempt' : tester.upperInput,
        ex.upper ? 'Exempt' : ev.upper,
        ex.core ? 'Exempt' : ACTIVITY_NAMES[tester.coreType],
        ex.core ? 'Exempt' : tester.coreInput,
        ex.core ? 'Exempt' : ev.core,
        ev.isFullExempt ? 'Exempt' : ev.total,
        ev.isFullExempt ? 'Exempt' : ev.passed ? 'Pass' : 'Fail'
      ]
        .map(escapeCsv)
        .join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PT_Test_Session_${todayKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeTester = testers.find((t) => t.id === activeTesterId) || null;
  const activeTesterIndex = testers.findIndex((t) => t.id === activeTesterId);
  const activeTesterEval = activeTester ? evaluateTester(activeTester) : null;

  const inputStyle =
    'mt-1 block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors';
  const labelStyle = 'block text-xs font-medium text-gray-600 dark:text-slate-300';

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-4 px-3 sm:px-6 transition-colors text-gray-900 dark:text-gray-100">
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
                <QRCodeSVG value={checkInUrl} size={190} />
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

        {/* Add Tester Modal */}
        {showAddTesterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full relative border border-gray-200 dark:border-slate-700">
              <button
                onClick={() => setShowAddTesterModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                ✕
              </button>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Add Tester to Session
              </h3>
              <form onSubmit={handleAddTesterToSession} className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelStyle}>Rank</label>
                    <select
                      value={newTesterForm.rank}
                      onChange={(e) =>
                        setNewTesterForm({ ...newTesterForm, rank: e.target.value })
                      }
                      className={inputStyle}
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
                    <label className={labelStyle}>Gender</label>
                    <select
                      value={newTesterForm.gender}
                      onChange={(e) =>
                        setNewTesterForm({ ...newTesterForm, gender: e.target.value })
                      }
                      className={inputStyle}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>Age</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={newTesterForm.age}
                      onChange={(e) =>
                        setNewTesterForm({ ...newTesterForm, age: e.target.value })
                      }
                      placeholder="25"
                      className={inputStyle}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelStyle}>First Name</label>
                    <input
                      type="text"
                      value={newTesterForm.firstName}
                      onChange={(e) =>
                        setNewTesterForm({ ...newTesterForm, firstName: e.target.value })
                      }
                      placeholder="First"
                      className={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>Last Name</label>
                    <input
                      type="text"
                      value={newTesterForm.lastName}
                      onChange={(e) =>
                        setNewTesterForm({ ...newTesterForm, lastName: e.target.value })
                      }
                      placeholder="Last"
                      className={inputStyle}
                      required
                    />
                  </div>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddTesterModal(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Add Tester
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto space-y-4">
          {/* Compact Top Header */}
          <header className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800 px-4 py-3.5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              PTL Dashboard
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowQrModal(true)}
                className="inline-flex items-center px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  />
                </svg>
                QR Code
              </button>
              <Link
                to="/"
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-600 text-xs font-semibold rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50"
              >
                Exit
              </Link>
            </div>
          </header>

          {/* Clean 2-Button Segmented Control */}
          <div className="grid grid-cols-2 gap-1.5 bg-gray-200/70 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('roster')}
              className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'roster'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
              }`}
            >
              <span>Check-Ins</span>
              <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-slate-200">
                {displayedCheckIns.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('test')}
              className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'test'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
              }`}
            >
              <span>Official PT Test</span>
              <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-slate-200">
                {testers.length}
              </span>
            </button>
          </div>

          {/* TAB 1: CHECK-INS */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              {/* Manual Check-In Collapsible Card (Above Roster) */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowManualCheckIn(!showManualCheckIn)}
                  className="w-full px-4 py-3 text-left text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between"
                >
                  <span>{showManualCheckIn ? '− Hide Manual Check-In' : '+ Manual Check-In Entry'}</span>
                  <span>{showManualCheckIn ? '▲' : '▼'}</span>
                </button>

                {showManualCheckIn && (
                  <form
                    onSubmit={handleManualAdd}
                    className="p-4 border-t border-gray-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
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
                      className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold"
                    >
                      {isAddingMember ? 'Adding...' : 'Check In'}
                    </button>
                  </form>
                )}
              </div>

              {/* Roster Card */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                {/* Single Clean Header Row */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between gap-2">
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-2 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
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
                    onClick={loadCheckIns}
                    disabled={isRefreshing}
                    className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 shrink-0"
                    title="Refresh"
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

                {/* Roster List */}
                <div className="divide-y divide-gray-100 dark:divide-slate-700/60 max-h-[460px] overflow-y-auto">
                  {displayedCheckIns.length === 0 ? (
                    <div className="py-10 px-4 text-center">
                      <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                        No check-ins on {formatShortDate(selectedDate)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                        Select another date above or show the QR code for members to scan.
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
                          className="px-4 py-3 flex items-center justify-between gap-3"
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
                          <span className="text-xs text-gray-400 dark:text-slate-400 shrink-0">
                            {timeStr}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Two Separate Excel Download Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <a
                  href={EXCEL_EXPORT_URLS.scores}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex justify-center items-center py-3 px-4 rounded-xl shadow-sm text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                >
                  Download PT Scores (Excel)
                </a>
                <a
                  href={EXCEL_EXPORT_URLS.checkins}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex justify-center items-center py-3 px-4 rounded-xl shadow-sm text-xs sm:text-sm font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all active:scale-[0.98]"
                >
                  Download Check-Ins (Excel)
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: OFFICIAL PT TEST */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              {testers.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-8 text-center space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Start Official PT Test
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      Add testers to record scores and submit them to the master sheet.
                    </p>
                  </div>
                  <div className="max-w-xs mx-auto">
                    <button
                      type="button"
                      onClick={() => setShowAddTesterModal(true)}
                      className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm"
                    >
                      + Add Tester
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Compact Tester Switcher Bar */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-3 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={activeTesterIndex <= 0}
                      onClick={() => setActiveTesterId(testers[activeTesterIndex - 1].id)}
                      className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 text-xs font-bold disabled:opacity-30"
                      title="Previous Tester"
                    >
                      ←
                    </button>

                    <select
                      value={activeTesterId || ''}
                      onChange={(e) => setActiveTesterId(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-2 text-xs sm:text-sm font-bold text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none truncate"
                    >
                      {testers.map((t, idx) => {
                        const ev = evaluateTester(t);
                        const statusLabel = t.submitted
                          ? '✓ Sent'
                          : ev.isComplete
                          ? `${ev.total} (${ev.isFullExempt ? 'Exempt' : ev.passed ? 'Pass' : 'Fail'})`
                          : 'In Progress';
                        return (
                          <option key={t.id} value={t.id}>
                            {idx + 1}/{testers.length}: {t.rank} {t.lastName}, {t.firstName} — {statusLabel}
                          </option>
                        );
                      })}
                    </select>

                    <button
                      type="button"
                      disabled={activeTesterIndex >= testers.length - 1}
                      onClick={() => setActiveTesterId(testers[activeTesterIndex + 1].id)}
                      className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 text-xs font-bold disabled:opacity-30"
                      title="Next Tester"
                    >
                      →
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAddTesterModal(true)}
                      className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Active Tester Scorecard */}
                  {activeTester && activeTesterEval && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 sm:p-5 space-y-4">
                      {/* Tester Name & Delete */}
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-3">
                        <div>
                          <h3 className="text-base font-bold text-gray-900 dark:text-white">
                            {activeTester.rank} {activeTester.firstName} {activeTester.lastName}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTester(activeTester.id)}
                          className="text-xs text-gray-400 hover:text-red-500"
                        >
                          Remove Tester
                        </button>
                      </div>

                      {/* Gender & Age Row */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className={labelStyle}>Rank</label>
                          <select
                            value={activeTester.rank}
                            onChange={(e) => updateTester(activeTester.id, { rank: e.target.value })}
                            className={inputStyle}
                          >
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
                          <label className={labelStyle}>Gender</label>
                          <select
                            value={activeTester.gender}
                            onChange={(e) =>
                              updateTester(activeTester.id, { gender: e.target.value })
                            }
                            className={inputStyle}
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                        </div>

                        <div>
                          <label className={labelStyle}>Age</label>
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="Age"
                            value={activeTester.age}
                            onChange={(e) => updateTester(activeTester.id, { age: e.target.value })}
                            className={inputStyle}
                          />
                        </div>
                      </div>

                      {/* Body Composition */}
                      <div className="p-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50/50 dark:bg-slate-700/30 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                            Body Composition ({activeTester.exemptions.whtr ? 'Exempt' : `${activeTesterEval.whtr}/20`})
                          </span>
                          <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={activeTester.exemptions.whtr}
                              onChange={() =>
                                updateTester(activeTester.id, (t) => ({
                                  ...t,
                                  exemptions: { ...t.exemptions, whtr: !t.exemptions.whtr }
                                }))
                              }
                              className="rounded border-gray-300 dark:border-slate-500 text-blue-600"
                            />
                            Exempt
                          </label>
                        </div>

                        {!activeTester.exemptions.whtr && (
                          <div className="grid grid-cols-3 gap-2.5">
                            <div>
                              <label className={labelStyle}>Feet</label>
                              <input
                                type="number"
                                inputMode="decimal"
                                placeholder="5"
                                value={activeTester.heightFeet}
                                onChange={(e) =>
                                  updateTester(activeTester.id, { heightFeet: e.target.value })
                                }
                                className={inputStyle}
                              />
                            </div>
                            <div>
                              <label className={labelStyle}>Inches</label>
                              <input
                                type="number"
                                step="0.5"
                                inputMode="decimal"
                                placeholder="10"
                                value={activeTester.heightInches}
                                onChange={(e) =>
                                  updateTester(activeTester.id, { heightInches: e.target.value })
                                }
                                className={inputStyle}
                              />
                            </div>
                            <div>
                              <label className={labelStyle}>Waist</label>
                              <input
                                type="number"
                                step="0.5"
                                inputMode="decimal"
                                placeholder="34"
                                value={activeTester.waist}
                                onChange={(e) =>
                                  updateTester(activeTester.id, { waist: e.target.value })
                                }
                                className={inputStyle}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Fitness Components */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Cardio */}
                        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50/50 dark:bg-slate-700/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">
                              Cardio ({activeTester.exemptions.cardio ? 'Exempt' : `${activeTesterEval.cardio}/50`})
                            </span>
                            <label className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={activeTester.exemptions.cardio}
                                onChange={() =>
                                  updateTester(activeTester.id, (t) => ({
                                    ...t,
                                    exemptions: { ...t.exemptions, cardio: !t.exemptions.cardio }
                                  }))
                                }
                                className="rounded border-gray-300 dark:border-slate-500 text-blue-600"
                              />
                              Exempt
                            </label>
                          </div>
                          {!activeTester.exemptions.cardio && (
                            <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
                              <select
                                value={activeTester.cardioType}
                                onChange={(e) =>
                                  updateTester(activeTester.id, {
                                    cardioType: e.target.value,
                                    cardioInput: ''
                                  })
                                }
                                className={inputStyle}
                              >
                                <option value="run">2-Mile Run</option>
                                <option value="hamr">20M HAMR</option>
                              </select>
                              <input
                                type={activeTester.cardioType === 'run' ? 'text' : 'number'}
                                inputMode={activeTester.cardioType === 'run' ? 'numeric' : 'decimal'}
                                placeholder={
                                  activeTester.cardioType === 'run' ? 'MM:SS' : 'Shuttles'
                                }
                                value={activeTester.cardioInput}
                                onChange={(e) =>
                                  updateTester(activeTester.id, {
                                    cardioInput:
                                      activeTester.cardioType === 'run'
                                        ? formatTimeInput(e.target.value)
                                        : e.target.value
                                  })
                                }
                                className={inputStyle}
                              />
                            </div>
                          )}
                        </div>

                        {/* Upper Body */}
                        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50/50 dark:bg-slate-700/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">
                              Upper ({activeTester.exemptions.upper ? 'Exempt' : `${activeTesterEval.upper}/15`})
                            </span>
                            <label className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={activeTester.exemptions.upper}
                                onChange={() =>
                                  updateTester(activeTester.id, (t) => ({
                                    ...t,
                                    exemptions: { ...t.exemptions, upper: !t.exemptions.upper }
                                  }))
                                }
                                className="rounded border-gray-300 dark:border-slate-500 text-blue-600"
                              />
                              Exempt
                            </label>
                          </div>
                          {!activeTester.exemptions.upper && (
                            <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
                              <select
                                value={activeTester.upperType}
                                onChange={(e) =>
                                  updateTester(activeTester.id, {
                                    upperType: e.target.value,
                                    upperInput: ''
                                  })
                                }
                                className={inputStyle}
                              >
                                <option value="pushups">Push-ups</option>
                                <option value="hrPushups">HR Push-ups</option>
                              </select>
                              <input
                                type="number"
                                inputMode="decimal"
                                placeholder="Reps"
                                value={activeTester.upperInput}
                                onChange={(e) =>
                                  updateTester(activeTester.id, { upperInput: e.target.value })
                                }
                                className={inputStyle}
                              />
                            </div>
                          )}
                        </div>

                        {/* Core */}
                        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50/50 dark:bg-slate-700/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">
                              Core ({activeTester.exemptions.core ? 'Exempt' : `${activeTesterEval.core}/15`})
                            </span>
                            <label className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={activeTester.exemptions.core}
                                onChange={() =>
                                  updateTester(activeTester.id, (t) => ({
                                    ...t,
                                    exemptions: { ...t.exemptions, core: !t.exemptions.core }
                                  }))
                                }
                                className="rounded border-gray-300 dark:border-slate-500 text-blue-600"
                              />
                              Exempt
                            </label>
                          </div>
                          {!activeTester.exemptions.core && (
                            <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
                              <select
                                value={activeTester.coreType}
                                onChange={(e) =>
                                  updateTester(activeTester.id, {
                                    coreType: e.target.value,
                                    coreInput: ''
                                  })
                                }
                                className={inputStyle}
                              >
                                <option value="situps">Sit-ups</option>
                                <option value="crunches">CLR Crunches</option>
                                <option value="plank">Plank</option>
                              </select>
                              <input
                                type={activeTester.coreType === 'plank' ? 'text' : 'number'}
                                inputMode={
                                  activeTester.coreType === 'plank' ? 'numeric' : 'decimal'
                                }
                                placeholder={
                                  activeTester.coreType === 'plank' ? 'MM:SS' : 'Reps'
                                }
                                value={activeTester.coreInput}
                                onChange={(e) =>
                                  updateTester(activeTester.id, {
                                    coreInput:
                                      activeTester.coreType === 'plank'
                                        ? formatTimeInput(e.target.value)
                                        : e.target.value
                                  })
                                }
                                className={inputStyle}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Score Result & Single Tester Submit */}
                      <div className="pt-2 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between gap-3">
                        <div>
                          <div
                            className={`text-xl font-extrabold ${
                              activeTesterEval.passed
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            Total: {activeTesterEval.total}{' '}
                            <span className="text-xs font-semibold">
                              ({activeTesterEval.isFullExempt ? 'Exempt' : activeTesterEval.passed ? 'Pass' : 'Fail'})
                            </span>
                          </div>
                          {activeTesterEval.possiblePoints > 0 &&
                            activeTesterEval.possiblePoints < 100 && (
                              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                                Scaled from {activeTesterEval.earnedPoints}/{activeTesterEval.possiblePoints} pts
                              </p>
                            )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSubmitSingleTester(activeTester)}
                          disabled={submittingSingleId === activeTester.id}
                          className={`px-4 py-2.5 rounded-lg text-xs font-bold text-white shadow-sm transition-all ${
                            activeTester.submitted
                              ? 'bg-emerald-600 hover:bg-emerald-700'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {submittingSingleId === activeTester.id
                            ? 'Sending...'
                            : activeTester.submitted
                            ? '✓ Sent (Resend)'
                            : 'Send Tester to Sheet'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Footer Batch Actions */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportSessionCsv}
                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200"
                      >
                        Export CSV
                      </button>
                      <button
                        type="button"
                        onClick={clearTestSession}
                        className="px-3 py-2 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400"
                      >
                        Clear Session
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleSubmitAllTesters}
                      disabled={isBatchSubmitting}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50"
                    >
                      {isBatchSubmitting ? 'Submitting...' : 'Submit All Completed to Sheet'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Footer Subtext Credits */}
          <footer className="pt-4 pb-2 text-center">
            <p className="text-[11px] text-gray-400 dark:text-slate-500">
              Created &amp; Designed by <span className="font-medium text-gray-500 dark:text-slate-400">Brandon Boltz</span> •{' '}
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
            Created &amp; Designed by <span className="font-medium text-gray-500 dark:text-slate-400">Brandon Boltz</span> •{' '}
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
