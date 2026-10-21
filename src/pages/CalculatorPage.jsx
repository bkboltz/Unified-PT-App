import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  calculateWhtr,
  calculateCardioScore,
  calculateUpperScore,
  calculateCoreScore,
  formatTimeInput
} from '../utils/calculator';
import { submitScore } from '../services/api';
import { RANKS } from '../data/scoringTables';

export default function CalculatorPage() {
  const [rank, setRank] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('male');
  const [age, setAge] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [waist, setWaist] = useState('');

  const [cardioType, setCardioType] = useState('run');
  const [cardioInput, setCardioInput] = useState('');

  const [upperType, setUpperType] = useState('pushups');
  const [upperInput, setUpperInput] = useState('');

  const [coreType, setCoreType] = useState('situps');
  const [coreInput, setCoreInput] = useState('');

  const [scores, setScores] = useState({
    whtr: 0,
    cardio: 0,
    upper: 0,
    core: 0,
    total: 0
  });

  const [hasCalculated, setHasCalculated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCardioInputChange = (val) => {
    if (cardioType === 'run') {
      setCardioInput(formatTimeInput(val));
    } else {
      setCardioInput(val);
    }
  };

  const handleCoreInputChange = (val) => {
    if (coreType === 'plank') {
      setCoreInput(formatTimeInput(val));
    } else {
      setCoreInput(val);
    }
  };

  const handleCalculate = (e) => {
    e.preventDefault();
    const totalHeight = parseInt(heightFeet || 0, 10) * 12 + parseFloat(heightInches || 0);
    const waistInches = parseFloat(waist || 0);

    const whtrScore = calculateWhtr(totalHeight, waistInches);
    const cardioScore = calculateCardioScore(cardioType, gender, age, cardioInput);
    const upperScore = calculateUpperScore(upperType, gender, age, upperInput);
    const coreScore = calculateCoreScore(coreType, gender, age, coreInput);

    setScores({
      whtr: whtrScore,
      cardio: cardioScore,
      upper: upperScore,
      core: coreScore,
      total: Number((whtrScore + cardioScore + upperScore + coreScore).toFixed(1))
    });
    setHasCalculated(true);
  };

  const hasZeroComponent =
    scores.whtr === 0 || scores.cardio === 0 || scores.upper === 0 || scores.core === 0;
  const isPass = scores.total >= 75 && !hasZeroComponent;

  const handleSubmitScore = async () => {
    setIsSubmitting(true);
    const activityNames = {
      run: '2-Mile Run',
      hamr: 'HAMR',
      pushups: 'Standard Push-ups',
      hrPushups: 'HR Push-ups',
      situps: 'Standard Sit-ups',
      crunches: 'CLR Crunches',
      plank: 'Forearm Plank'
    };

    const payload = {
      rank,
      firstName,
      lastName,
      gender,
      age,
      whtrPts: scores.whtr,
      cardioType: activityNames[cardioType],
      cardioInput,
      cardioPts: scores.cardio,
      upperType: activityNames[upperType],
      upperInput,
      upperPts: scores.upper,
      coreType: activityNames[coreType],
      coreInput,
      corePts: scores.core,
      total: scores.total,
      passFail: isPass ? 'Pass' : 'Fail'
    };

    const res = await submitScore(payload);
    if (res.success) {
      alert('Score submitted successfully to the spreadsheet!');
      setHasCalculated(false);
    } else {
      alert('Error submitting score. Please check your connection.');
    }
    setIsSubmitting(false);
  };

  const inputStyle =
    'mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors';
  const labelStyle = 'block text-sm font-medium text-gray-700 dark:text-slate-300';

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-slate-900 transition-colors duration-200 text-gray-900 dark:text-gray-100">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-slate-700">
        <div className="bg-blue-600 dark:bg-blue-800 py-6 px-8 text-center">
          <h2 className="text-2xl font-bold text-white tracking-wide">
            Official PT Calculator
          </h2>
          <p className="text-blue-100 text-sm mt-1">
            Enter your details and assessment metrics below
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleCalculate} className="space-y-8">
            {/* Member Identification */}
            <section>
              <h3 className="text-lg font-semibold border-b pb-2 mb-4 border-gray-200 dark:border-slate-600">
                Member Identification
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyle}>Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className={inputStyle}
                      required
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
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g., 25"
                      className={inputStyle}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={labelStyle}>Rank</label>
                  <select
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    className={inputStyle}
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
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First Name"
                    className={inputStyle}
                    required
                  />
                </div>

                <div>
                  <label className={labelStyle}>Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last Name"
                    className={inputStyle}
                    required
                  />
                </div>
              </div>
            </section>

            {/* Body Composition */}
            <section>
              <h3 className="text-lg font-semibold border-b pb-2 mb-4 border-gray-200 dark:border-slate-600">
                Body Composition
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className={labelStyle}>Height (Feet)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={heightFeet}
                    onChange={(e) => setHeightFeet(e.target.value)}
                    placeholder="e.g. 5"
                    className={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label className={labelStyle}>Inches</label>
                  <input
                    type="number"
                    step="0.5"
                    inputMode="decimal"
                    value={heightInches}
                    onChange={(e) => setHeightInches(e.target.value)}
                    placeholder="e.g. 10"
                    className={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label className={labelStyle}>Waist (inches)</label>
                  <input
                    type="number"
                    step="0.5"
                    inputMode="decimal"
                    value={waist}
                    onChange={(e) => setWaist(e.target.value)}
                    placeholder="e.g. 34"
                    className={inputStyle}
                    required
                  />
                </div>
              </div>
            </section>

            {/* Fitness Metrics */}
            <section>
              <h3 className="text-lg font-semibold border-b pb-2 mb-4 border-gray-200 dark:border-slate-600">
                Fitness Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Cardio */}
                <div className="space-y-3 bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-600">
                  <div className="font-medium text-sm text-gray-800 dark:text-gray-200">
                    Cardio (50 Pts)
                  </div>
                  <select
                    value={cardioType}
                    onChange={(e) => {
                      setCardioType(e.target.value);
                      setCardioInput('');
                    }}
                    className={inputStyle}
                  >
                    <option value="run">2-Mile Run</option>
                    <option value="hamr">20-Meter HAMR</option>
                  </select>
                  <input
                    type={cardioType === 'run' ? 'text' : 'number'}
                    inputMode={cardioType === 'run' ? 'numeric' : 'decimal'}
                    value={cardioInput}
                    onChange={(e) => handleCardioInputChange(e.target.value)}
                    placeholder={cardioType === 'run' ? 'MM:SS' : 'Total Shuttles'}
                    className={inputStyle}
                    required
                  />
                </div>

                {/* Upper Body */}
                <div className="space-y-3 bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-600">
                  <div className="font-medium text-sm text-gray-800 dark:text-gray-200">
                    Upper Body (15 Pts)
                  </div>
                  <select
                    value={upperType}
                    onChange={(e) => {
                      setUpperType(e.target.value);
                      setUpperInput('');
                    }}
                    className={inputStyle}
                  >
                    <option value="pushups">Standard Push-ups</option>
                    <option value="hrPushups">HR Push-ups</option>
                  </select>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={upperInput}
                    onChange={(e) => setUpperInput(e.target.value)}
                    placeholder="Total Reps"
                    className={inputStyle}
                    required
                  />
                </div>

                {/* Core */}
                <div className="space-y-3 bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-600">
                  <div className="font-medium text-sm text-gray-800 dark:text-gray-200">
                    Core (15 Pts)
                  </div>
                  <select
                    value={coreType}
                    onChange={(e) => {
                      setCoreType(e.target.value);
                      setCoreInput('');
                    }}
                    className={inputStyle}
                  >
                    <option value="situps">Standard Sit-ups</option>
                    <option value="crunches">CLR Crunches</option>
                    <option value="plank">Forearm Plank</option>
                  </select>
                  <input
                    type={coreType === 'plank' ? 'text' : 'number'}
                    inputMode={coreType === 'plank' ? 'numeric' : 'decimal'}
                    value={coreInput}
                    onChange={(e) => handleCoreInputChange(e.target.value)}
                    placeholder={coreType === 'plank' ? 'MM:SS' : 'Total Reps'}
                    className={inputStyle}
                    required
                  />
                </div>
              </div>
            </section>

            <button
              type="submit"
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98]"
            >
              Calculate Score
            </button>
          </form>

          {/* Results Breakdown */}
          {hasCalculated && (
            <div
              className={`mt-8 p-6 rounded-xl border shadow-inner ${
                isPass
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <h3 className="text-xl font-bold text-center mb-4 text-gray-900 dark:text-white">
                Score Breakdown
              </h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-slate-600/50">
                  <span className="text-gray-600 dark:text-gray-300">Body Composition</span>
                  <strong
                    className={
                      scores.whtr === 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-900 dark:text-white'
                    }
                  >
                    {scores.whtr} / 20.0{' '}
                    {scores.whtr === 0 && <span className="text-xs ml-1">(Fail)</span>}
                  </strong>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-slate-600/50">
                  <span className="text-gray-600 dark:text-gray-300">Cardio</span>
                  <strong
                    className={
                      scores.cardio === 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-900 dark:text-white'
                    }
                  >
                    {scores.cardio} / 50.0{' '}
                    {scores.cardio === 0 && <span className="text-xs ml-1">(Fail)</span>}
                  </strong>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-slate-600/50">
                  <span className="text-gray-600 dark:text-gray-300">Upper Body</span>
                  <strong
                    className={
                      scores.upper === 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-900 dark:text-white'
                    }
                  >
                    {scores.upper} / 15.0{' '}
                    {scores.upper === 0 && <span className="text-xs ml-1">(Fail)</span>}
                  </strong>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-slate-600/50">
                  <span className="text-gray-600 dark:text-gray-300">Core</span>
                  <strong
                    className={
                      scores.core === 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-900 dark:text-white'
                    }
                  >
                    {scores.core} / 15.0{' '}
                    {scores.core === 0 && <span className="text-xs ml-1">(Fail)</span>}
                  </strong>
                </div>
              </div>

              <div className="text-center mb-6">
                <h2
                  className={`text-4xl font-extrabold ${
                    isPass
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  Total: {scores.total}
                </h2>
                <p className="text-sm font-semibold mt-2 text-gray-700 dark:text-gray-300">
                  {isPass
                    ? 'Passing Score'
                    : hasZeroComponent
                    ? 'Failing Score: Minimum Component Threshold Not Met'
                    : 'Failing Score: Below 75 Total'}
                </p>
              </div>

              <button
                onClick={handleSubmitScore}
                disabled={isSubmitting}
                className={`w-full py-3.5 px-4 rounded-lg shadow-sm text-base font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${
                  isPass
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit to PTL'}
              </button>
            </div>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-slate-800/80 px-8 py-4 border-t border-gray-100 dark:border-slate-700 text-center">
          <Link
            to="/ptl"
            className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors inline-flex items-center gap-2"
          >
            <span>🔒</span> PTL Access Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
