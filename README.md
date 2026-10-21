# USAF Unified PT App

Official USAF Physical Fitness Assessment (PFA) tracking, live check-ins, and scoring web application for local squadron use.

---

## Features

- **Official USAF PT Calculator (`/`)**:
  - Full demographic input (Gender, Age, Enlisted AB-CMSgt & Officer 2d Lt-Gen).
  - Exact Waist-to-Height Ratio (WHtR) calculation (max 20 pts).
  - Exact USAF scoring tables across 9 age brackets (`u25`, `25_29`, `30_34`, `35_39`, `40_44`, `45_49`, `50_54`, `55_59`, `o60`):
    - Cardio: 2-Mile Run (`MM:SS`) or 20M HAMR (Shuttle reps).
    - Upper Body: 1-min Standard Push-ups or 2-min Hand-Release Push-ups.
    - Core: 1-min Standard Sit-ups, 2-min Cross-Leg Reverse Crunches, or Forearm Plank (`MM:SS`).
  - Automatic `MM:SS` masking for 2-Mile Run and Plank.
  - Live component & composite score evaluation:
    - Pass criteria: Total $\ge 75$ AND non-zero score in all 4 components.
    - Component failure vs total score failure differentiation.
  - Direct submission to Google Sheets.

- **Airman QR Check-In (`/checkin`)**:
  - Dynamic token verification: requires valid `?t=<timestamp>` parameter expiring after 45 seconds.
  - Device anti-tamper protection: checks `localStorage` with a 60-minute lockout.
  - Direct Airman check-in submitted to the live squadron roster.

- **PT Leader Dashboard (`/ptl`)**:
  - PIN gate (`391234` or custom `VITE_PTL_PIN`).
  - Real-time dynamic QR code modal powered by `qrcode.react` that auto-refreshes `?t=` every 10 seconds.
  - Live check-in feed polling Google Apps Script every 10 seconds.
  - Manual Airman roster entry form.
  - One-click Excel download links for Scores (GID 0) and Check-ins (GID 1146342773).

---

## Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Dev Server
```bash
npm run dev
```
Open `http://localhost:5173/` in your browser.

### 3. Production Build
```bash
npm run build
```

---

## Backend Configuration

- **Google Apps Script Web App**:
  - Endpoint: `https://script.google.com/macros/s/AKfycbz1SM4xMT2494GP2Sc4kGPWvt7W4vfFzhDDNwqO0fI9liMaXZ_HQnLni3zzqKxGo_kB/exec`
  - Spreadsheet ID: `1MV481IOSrWeUvYMrEfCWeXnCfoNnDuhplrsq_CNkJys`
  - Sheet GID 0: Live check-in roster
  - Sheet GID 1146342773: Score submissions

---

## Future Deployment to Firebase

When ready to host on Firebase Hosting:
```bash
# 1. Build production bundle
npm run build

# 2. Deploy to Firebase
firebase deploy --only hosting
```
