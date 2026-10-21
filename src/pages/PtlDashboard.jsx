import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { fetchLiveCheckIns, submitCheckIn, EXCEL_EXPORT_URLS } from '../services/api';
import { RANKS } from '../data/scoringTables';

export default function PtlDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [manualForm, setManualForm] = useState({
    rank: '',
    firstName: '',
    lastName: ''
  });

  const [showQrModal, setShowQrModal] = useState(false);
  const [isListExpanded, setIsListExpanded] = useState(true);
  const [qrTimestamp, setQrTimestamp] = useState(Date.now());
  const [checkIns, setCheckIns] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);

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
      if (res.success && Array.isArray(res.data)) {
        setCheckIns(res.data);
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
        setManualForm({ rank: '', firstName: '', lastName: '' });
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
    'mt-1 block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
  const labelStyle = 'block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1';

  // If authenticated, show the dashboard
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors relative text-gray-900 dark:text-gray-100">
        {/* Dynamic QR Code Modal */}
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center relative border border-gray-200 dark:border-slate-700">
              <button
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Scan to Check-In</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                QR code automatically refreshes for security.
              </p>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 inline-block">
                <QRCodeSVG value={checkInUrl} size={220} />
              </div>
              <p className="text-xs text-gray-400 mt-6 break-all">Live Token Active</p>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                Dashboard
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  <span className="w-2 h-2 mr-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  Session Active
                </span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Track and capture attendance.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowQrModal(true)}
                className="inline-flex justify-center items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all active:scale-[0.98] gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  />
                </svg>
                Show QR
              </button>
              <Link
                to="/"
                className="inline-flex justify-center items-center px-4 py-2.5 border border-gray-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
              >
                Exit
              </Link>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-col-reverse">
            {/* Live Check-In List (2 Cols) */}
            <div className="lg:col-span-2 order-2 lg:order-none space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col h-full min-h-[400px]">
                <button
                  onClick={() => setIsListExpanded(!isListExpanded)}
                  className="w-full px-6 py-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        isListExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Today's Check-ins
                  </h3>
                  <div className="flex items-center gap-3">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        loadCheckIns();
                      }}
                      className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isRefreshing ? (
                        <>
                          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                          Refreshing...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          Refresh Now
                        </>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 px-3 py-1 rounded-full whitespace-nowrap">
                      {checkIns.length} Checked In
                    </span>
                  </div>
                </button>

                {isListExpanded && (
                  <div className="flex-1 p-6 bg-slate-50/50 dark:bg-slate-900/20">
                    {checkIns.length === 0 && !isRefreshing ? (
                      <div className="h-full flex flex-col items-center justify-center text-center py-12">
                        <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                          No members checked in yet
                        </h4>
                        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 max-w-sm">
                          Members scanning the QR code will automatically populate here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {checkIns.map((item, idx) => {
                          const dateObj = new Date(item.timestamp);
                          const timeStr = isNaN(dateObj.getTime())
                            ? item.timestamp
                            : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                          return (
                            <div
                              key={idx}
                              className="bg-white dark:bg-slate-700 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-600 flex items-center justify-between transition-all hover:shadow-md"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm shrink-0">
                                  {checkIns.length - idx}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900 dark:text-white text-base">
                                    {item.rank} {item.lastName}, {item.firstName}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                    Method: <span className="font-medium">{item.method}</span>
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="inline-flex items-center rounded-md bg-gray-50 dark:bg-slate-800 px-2 py-1 text-xs font-medium text-gray-600 dark:text-slate-300 ring-1 ring-inset ring-gray-500/10 dark:ring-slate-500/20 whitespace-nowrap">
                                  {timeStr}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Manual Entry & Excel Exports (1 Col) */}
            <div className="lg:col-span-1 order-1 lg:order-none">
              <div className="space-y-6 sticky top-6">
                {/* Manual Member Entry Form */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                  <div className="bg-slate-800 dark:bg-slate-900 px-6 py-4 border-b border-slate-700">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                        />
                      </svg>
                      Manual Member Entry
                    </h3>
                  </div>

                  <form onSubmit={handleManualAdd} className="p-6 space-y-5">
                    <div>
                      <label className={labelStyle}>Rank</label>
                      <select
                        className={inputStyle}
                        value={manualForm.rank}
                        onChange={(e) => setManualForm({ ...manualForm, rank: e.target.value })}
                        required
                      >
                        <option value="" disabled>
                          Select Rank
                        </option>
                        <optgroup label="Enlisted">
                          {RANKS.enlisted.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Officer">
                          {RANKS.officer.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className={labelStyle}>First Name</label>
                      <input
                        type="text"
                        placeholder="John"
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
                        placeholder="Doe"
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
                      className="w-full py-3 px-4 mt-2 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all active:scale-[0.98]"
                    >
                      {isAddingMember ? 'Adding...' : 'Add to Roster'}
                    </button>
                  </form>
                </div>

                {/* Data & Reports Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                  <div className="bg-slate-800 dark:bg-slate-900 px-6 py-4 border-b border-slate-700">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Data & Reports
                    </h3>
                  </div>

                  <div className="p-6">
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-5 leading-relaxed">
                      Export the master spreadsheet directly to Excel format. Choose which dataset you need below.
                    </p>
                    <div className="flex flex-col gap-3">
                      <a
                        href={EXCEL_EXPORT_URLS.scores}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all active:scale-[0.98] gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        Download PT Scores (Excel)
                      </a>

                      <a
                        href={EXCEL_EXPORT_URLS.checkins}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex justify-center items-center py-3 px-4 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all active:scale-[0.98] gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                        Download Check-Ins (Excel)
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
              Enter your authorization PIN to manage the live session.
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-6">
            <div>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="• • • • • •"
                className="block w-full text-center tracking-[1em] text-3xl font-bold rounded-xl border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 py-4 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98]"
            >
              Unlock Dashboard
            </button>
          </form>
        </div>

        <div className="bg-gray-50 dark:bg-slate-800/80 px-8 py-4 border-t border-gray-100 dark:border-slate-700 text-center">
          <Link
            to="/"
            className="text-sm font-medium text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            ← Return to Calculator
          </Link>
        </div>
      </div>
    </div>
  );
}
