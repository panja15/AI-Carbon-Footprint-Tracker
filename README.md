# EcoAI - Carbon Footprint Awareness & Coaching Platform

EcoAI is a production-grade full-stack web application built to help users understand, track, forecast, and reduce their carbon footprint through personalized insights and AI-powered recommendations.

This project is built purely in JavaScript, adhering to strict clean architecture principles, high accessibility standards, and robust security practices.

---

## Key Features

1. **Daily Footprint Logging:** Track travel distance, meal types, electricity usage, and shopping spend.
2. **India-Specific Calculations:** Uses customized carbon factors and comparisons tuned specifically to India (e.g. CNG auto rickshaws, Delhi Metro data, national grid averages).
3. **What-If Lifestyle Simulator:** Proactively estimate carbon savings by substituting high-emission transport with eco-friendly alternatives.
4. **Predictive Carbon Forecast:** Project monthly and annual carbon outputs using running daily averages compared against national benchmarks.
5. **Eco-Score Grade:** View a letter grade card (A+ to F) indicating how your daily carbon footprints stack up against India's average.
6. **Streak Tracker:** Maintain consistency with a consecutive daily logging streak badge shown in the header.
7. **AI Usage Awareness:** Understand the carbon, water, and electrical footprints of utilizing AI resources.
8. **Gemini AI Coach:** Get personalized, rate-limited coaching advice rendered in formatted Markdown, tailored with Indian context.
9. **Accessibility First (♿):** High contrast theme, keyboard skip link, screen-reader semantic tags, and accessible table data visualization alternatives.

---

## Architecture Overview

The repository is organized into a clean client-server architecture:

```
AI-Carbon-Footprint-Tracker/
├── backend/                  # Node.js + Express + Sequelize ESM Backend
│   ├── src/
│   │   ├── config/           # Database connections & credentials
│   │   ├── controllers/      # Route controllers handling inputs/queries
│   │   ├── lib/              # India-specific emission factors & source citations
│   │   ├── middleware/       # Zod input validation & rate limiters
│   │   ├── repositories/     # Database models & associations
│   │   ├── routes/           # REST endpoints
│   │   ├── services/         # Calculation Engine, Patterns, AI Coach
│   │   └── tests/            # Jest unit & API integration tests
│   └── package.json
│
└── frontend/                 # Next.js App Router Client App (JS / JSX)
    ├── src/
    │   ├── app/              # Router pages, layouts, and style setups
    │   ├── services/         # Client network fetchers
    │   ├── styles/           # Global variables & modular CSS
    │   ├── utils/            # Shared pure math / algorithm helpers
    │   └── tests/            # Jest + React Testing Library component tests
    └── package.json
```

- **Database:** PostgreSQL (Supabase) in production/development, with a fallback to an in-memory SQLite database for independent Jest testing.
- **ORM:** Sequelize is used to manage relational mappings cleanly without writing inline SQL statements inside controllers.
- **Validation:** Zod schemas sanitize all user and log inputs at the backend router boundary.
- **AI Engine:** Google Gemini AI Integration (using the `@google/generative-ai` SDK) handles sustainability advising.

---

## AI Usage & Calculation Logic

### Strict Separation Rules

1. **Carbon Calculations are 100% Deterministic:** Under no circumstances is AI used to calculate emissions, run forecasting numbers, or run mathematical operations. All emissions are calculated deterministically on the server via JavaScript.
2. **AI Sustainability Coach:** Gemini is utilized strictly for coaching (advising, explaining findings, and recommending sustainability actions based on deterministic metrics provided to it). Output is rate-limited and capped under 200 words.

### Emission Factors (India-Specific Baseline)

These factors (sourced from `SKILLS.md` and `emissionFactors.js`) are the single source of truth:

| Category | Option / Subtype | Factor | Unit | Source / Citation |
| :--- | :--- | :--- | :--- | :--- |
| **Transportation** | Car | 0.192 | kg CO2 per km | MoRTH India (petrol car average) |
| | Metro | 0.027 | kg CO2 per km | Delhi Metro (DMRC Environmental Report) |
| | Bus | 0.089 | kg CO2 per km | Indian public bus average study |
| | Auto Rickshaw | 0.132 | kg CO2 per km | CNG Auto-Rickshaw (ARAI India) |
| | Motorcycle | 0.103 | kg CO2 per km | Motorcycle petrol average (ARAI India) |
| | Flight | 0.255 | kg CO2 per km | Short-haul flight average (ICAO) |
| | Bicycle / Walking | 0.000 | kg CO2 per km | Zero emission |
| **Food** | Vegan Meal | 0.400 | kg CO2 per meal | Our World in Data (India adjusted) |
| | Vegetarian Meal | 0.700 | kg CO2 per meal | Our World in Data (India adjusted) |
| | Chicken Meal | 2.400 | kg CO2 per meal | FAO / Indian poultry average |
| | Beef Meal | 6.500 | kg CO2 per meal | FAO / South Asian cattle average |
| **Electricity** | Indian Grid Avg | 0.820 | kg CO2 per kWh | CEA India 2023 |
| **Shopping** | General / Mixed | 0.450 | kg CO2 per ₹1000 spent | Indian consumer goods carbon intensity average |

### Mathematical Formulas

- **Transportation Emission:** `distanceKm × Factor`
- **Food Emission:** `mealCount × Factor`
- **Electricity Emission:** `kWh × 0.82`
- **Shopping Emission:** `(amountSpentINR / 1000) × 0.45`
- **Total Emission:** `transportEmission + foodEmission + electricityEmission + shoppingEmission`
- **What-If Savings:**
  - `savingsPerTrip = (currentFactor - replacementFactor) × distance`
  - `weeklySavings = savingsPerTrip × frequency`
  - `monthlySavings = weeklySavings × 4`
  - `yearlySavings = monthlySavings × 12`
- **Forecast Engine (Moving Average):**
  - `monthlyForecast = dailyAverage × 30`
  - `yearlyForecast = dailyAverage × 365`
- **Eco-Score Grade Logic:**
  - Grade is based on `dailyAverage = totalEmissionsAllTime / totalDaysLogged` (uses onboarding baseline footprint as fallback if no logs exist).
  - Grades:
    - **A+**: `≤ 1.5` kg CO2/day
    - **A**: `≤ 2.5` kg CO2/day
    - **B**: `≤ 3.5` kg CO2/day
    - **C**: `≤ 4.5` kg CO2/day
    - **D**: `≤ 5.5` kg CO2/day
    - **F**: `> 5.5` kg CO2/day
  - Percentile comparison subtext relative to India average (`5.2` kg CO2/day):
    - If `dailyAverage < 5.2`: `"Better than X% of India"`, where `X = ((5.2 - dailyAverage) / 5.2) * 100` (rounded)
    - If `dailyAverage >= 5.2`: `"X% above India average"`, where `X = ((dailyAverage - 5.2) / 5.2) * 100` (rounded)
- **AI Usage Resource Estimation (per request):**
  - Electricity: `0.001` kWh
  - Water: `0.5` litres
  - CO2: `0.0004` kg
- **Real-World Equivalents:**
  - Car travel: `totalEmissions / 0.192` km
  - Short-haul flights: `totalEmissions / 255` flights
  - Trees offset: `totalEmissions / 21` trees (annual carbon absorption rate of 21 kg CO2/tree/year)

---

## Installation & Setup

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### 1. Backend Setup
1. Open the backend directory:
   ```bash
   cd backend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env`:
   ```env
   PORT=5000
   DATABASE_URL=postgres://your-supabase-url-here
   GEMINI_API_KEY=your-gemini-api-key-here
   ```
4. Start the server:
   ```bash
   npm start
   ```

### 2. Frontend Setup
1. Open the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Start the Next.js dev server:
   ```bash
   npm run dev
   ```
4. Open the application in your browser (typically [http://localhost:3001](http://localhost:3001) if port 3000 is occupied).

---

## Running Tests

### Backend Unit & Integration Tests
Checks mathematical calculations, Zod validators, model configurations, and Express controller endpoints using Jest and SQLite in-memory databases.
```bash
cd backend
npm test
```
**Test Files:**
- `src/tests/calculation.test.js`: Validates calculation service outputs.
- `src/tests/emissionFactors.test.js`: Asserts exact factors matching requirements for transportation modes, food, electricity, and shopping.
- `src/tests/whatIfSimulator.test.js`: Checks simulation savings and zero-saving conditions.
- `src/tests/api.test.js`: Integration tests for endpoints, sync databases, and profiles.

### Frontend Component & Utility Tests
Tests React rendering states, onboarding inputs, form submits, and theme toggling using Jest, Babel, and React Testing Library.
```bash
cd frontend
npm test
```
**Test Files:**
- `src/tests/ecoScore.test.js`: Unit tests verifying that Eco-Score letter grades match the emission averages.
- `src/tests/streak.test.js`: Verifies consecutive logging days, gap resets, and day-one logic.
- `src/tests/dashboard.test.js` & `src/tests/Dashboard.test.jsx`: Assert rendering of core dashboards, onboarding steps, Eco-Score card, streak badges, and AI Usage Awareness collapsible widgets.

---

## Accessibility & Security

### Accessibility Features (♿)
- **High Contrast Mode:** Instant theme styling toggle for increased readability.
- **Skip Link:** A keyboard-navigable "Skip to main content" link to bypass headers.
- **Accessible Chart Alternatives:** Screen-reader accessible HTML data tables representing charts.
- **Semantic Elements:** Utilizes semantic structural layout tags (`<main>`, `<header>`, `<section>`, `<button>`).
- **Form Labels:** Uniquely mapped visual `<label>` associations for screen readers.

### Security Configurations
- **Sanitized Inputs:** Zod schema validation throws 400 errors for malformed requests at the boundary.
- **Protected Keys:** Gemini API keys are server-only and never exposed to the client.
- **AI Rate Limiting:** Express-rate-limiter restricts coach calls to 10 requests per minute per IP.

---

## Project Assumptions & Future Improvements

- **User Sessions:** Uses simulated user profile associations for testing multiple states easily without heavy JWT authentication layers.
- **Baseline Food Estimations:** The onboarding questionnaire estimates baseline food emissions by assuming 3 meals a day over a 30-day month (90 meals total) with the selected diet type.
- **Electricity Baseline:** Assumes monthly electricity estimate is directly attributable to the user's portion.
- **AI Intensity Sources:** Uses LLM inference averages (Patterson et al., 2021) and cooling metrics (Li et al., 2023) to compute AI environmental overheads.