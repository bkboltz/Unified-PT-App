import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CalculatorPage from './pages/CalculatorPage';
import CheckInPage from './pages/CheckInPage';
import PtlDashboard from './pages/PtlDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', position: 'relative' }}>
        <Routes>
          <Route path="/" element={<CalculatorPage />} />
          <Route path="/checkin" element={<CheckInPage />} />
          <Route path="/ptl" element={<PtlDashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
