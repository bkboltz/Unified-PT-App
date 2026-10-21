import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { submitCheckIn } from '../services/api';
import { RANKS } from '../data/scoringTables';

export default function CheckInPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t');

  const [form, setForm] = useState({
    rank: '',
    firstName: '',
    lastName: ''
  });

  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorType, setErrorType] = useState(null);

  useEffect(() => {
    // 1. Device 60-minute anti-tamper lockout check
    const lastCheckIn = localStorage.getItem('lastCheckInTime');
    if (lastCheckIn) {
      if (Date.now() - parseInt(lastCheckIn, 10) < 3600 * 1000) {
        setErrorType('lockout');
        return;
      } else {
        localStorage.removeItem('lastCheckInTime');
      }
    }

    // 2. Query param presence check
    if (!token) {
      setErrorType('invalid_link');
      return;
    }

    // 3. 45-second dynamic QR token expiration check
    const parsedTime = parseInt(token, 10);
    if (isNaN(parsedTime) || Date.now() - parsedTime > 45000) {
      setErrorType('expired_qr');
      return;
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await submitCheckIn({
        rank: form.rank,
        firstName: form.firstName,
        lastName: form.lastName,
        method: 'QR Scan'
      });

      if (res.success) {
        localStorage.setItem('lastCheckInTime', Date.now().toString());
        setIsCheckedIn(true);
      } else {
        alert('Submission failed. Please check your connection and try again.');
      }
    } catch (err) {
      console.error('Check-in error:', err);
      alert('An error occurred during check-in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle =
    'mt-1 block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-base text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
  const labelStyle = 'block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1';

  // Error Card Render
  if (errorType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12 transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-red-100 dark:border-red-900 p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
            <svg
              className="h-8 w-8 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
            {errorType === 'lockout' && 'Already Checked In'}
            {errorType === 'invalid_link' && 'Invalid Access'}
            {errorType === 'expired_qr' && 'Code Expired'}
          </h2>
          <p className="text-gray-500 dark:text-slate-400 mb-6">
            {errorType === 'lockout' &&
              'This device has already been used to check in. You must wait 60 minutes before checking in another member.'}
            {errorType === 'invalid_link' &&
              'You cannot navigate directly to this page. Please see the PTL to scan the live QR code.'}
            {errorType === 'expired_qr' &&
              'This QR code has expired to prevent screenshot sharing. Please see the PTL to scan the live code.'}
          </p>
        </div>
      </div>
    );
  }

  // Success Confirmation Render
  if (isCheckedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12 transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-slate-700 p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
            <svg
              className="h-10 w-10 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
            You're Checked In!
          </h2>
          <p className="text-gray-500 dark:text-slate-400 mb-6">
            {form.rank} {form.lastName} has been added to the active roster.
          </p>
          <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Please put your phone away and wait for instructions from your PTL.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active Check-In Form Render
  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12 sm:px-6 lg:px-8 transition-colors text-gray-900 dark:text-gray-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-6 shadow-2xl rounded-2xl border border-gray-100 dark:border-slate-700 sm:px-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              PT Assessment Check-In
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
              Code verified. Fill out your details below to join the live session.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className={labelStyle}>Rank</label>
              <select
                className={inputStyle}
                value={form.rank}
                onChange={(e) => setForm({ ...form, rank: e.target.value })}
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
                placeholder="Legal First Name"
                className={inputStyle}
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </div>

            <div>
              <label className={labelStyle}>Last Name</label>
              <input
                type="text"
                placeholder="Legal Last Name"
                className={inputStyle}
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98]"
              >
                {isSubmitting ? 'Processing...' : 'Check In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
