# SKILLS.md

## Domain Knowledge

This file contains all carbon footprint calculation rules used by EcoAI.

These values are the single source of truth for calculations.

All emission factors are India-specific unless stated otherwise.

---

# Transportation Emission Factors

Unit:
kg CO2 per kilometer

| Transport     | Factor | Source                        |
| ------------- | ------ | ----------------------------- |
| Car           | 0.192  | MoRTH India (petrol avg)      |
| Metro         | 0.027  | DMRC Environmental Report     |
| Bus           | 0.089  | Indian public bus average     |
| Auto Rickshaw | 0.132  | ARAI India (CNG auto)         |
| Motorcycle    | 0.103  | ARAI India (petrol 2-wheeler) |
| Flight        | 0.255  | ICAO per km short-haul        |
| Bicycle       | 0      | —                             |
| Walking       | 0      | —                             |

Formula:

transportEmission =
distanceKm × emissionFactor

---

# Food Emission Factors

Unit:
kg CO2 per meal

| Meal Type  | Factor | Source                        |
| ---------- | ------ | ----------------------------- |
| Vegan      | 0.4    | Our World in Data (India adj) |
| Vegetarian | 0.7    | Our World in Data (India adj) |
| Chicken    | 2.4    | FAO / Indian poultry avg      |
| Beef       | 6.5    | FAO / South Asian cattle avg  |

Formula:

foodEmission =
mealCount × emissionFactor

---

# Electricity Emission Factor

Indian Grid Average (CEA India 2023):

0.82 kg CO2 per kWh

Formula:

electricityEmission =
kWh × 0.82

---

# Shopping & Purchases Emission Factor

Unit:
kg CO2 per ₹1000 spent

| Category        | Factor | Source                          |
| --------------- | ------ | ------------------------------- |
| General / Mixed | 0.45   | Indian consumer goods avg study |

Formula:

shoppingEmission =
(amountSpentINR / 1000) × 0.45

Notes:
- Default to General / Mixed if no category is selected
- Amount is in Indian Rupees (₹)

---

# Total Emission

Formula:

totalEmission =
transportEmission +
foodEmission +
electricityEmission +
shoppingEmission

All four categories must always be included.
If a category has no input for the day, treat it as 0.

---

# India Comparison Benchmarks

Use these values to contextualise user emissions.

| Period  | India Average | Source             |
| ------- | ------------- | ------------------ |
| Daily   | 5.2 kg CO2    | World Bank 2023    |
| Monthly | 158.3 kg CO2  | Derived (÷ 12)     |
| Annual  | 1,900 kg CO2  | World Bank 2023    |

Use daily average (5.2 kg) as the primary comparison baseline.

---

# Eco-Score Grade Card

Purpose:
Give the user a letter grade based on their daily average emissions
compared to India's average of 5.2 kg CO2/day.

Grade Logic:

| Grade | Daily Average  | Display Color |
| ----- | -------------- | ------------- |
| A+    | ≤ 1.5 kg/day  | #00E676       |
| A     | ≤ 2.5 kg/day  | #69F0AE       |
| B     | ≤ 3.5 kg/day  | #CCFF90       |
| C     | ≤ 4.5 kg/day  | #FFD740       |
| D     | ≤ 5.5 kg/day  | #FF6D00       |
| F     | > 5.5 kg/day  | #FF1744       |

Formula:

dailyAverage =
totalEmissionsAllTime / totalDaysLogged

If no logs exist:
Use onboarding baseline footprint as dailyAverage.

If no onboarding baseline:
Show grade "–" with message: "Log your first activity to get scored."

Percentile Subtext:

Show how user compares to India average:

percentileText =
if dailyAverage < 5.2:
  "Better than X% of India"
  where X = ((5.2 - dailyAverage) / 5.2) × 100, rounded to nearest integer
else:
  "X% above India average"
  where X = ((dailyAverage - 5.2) / 5.2) × 100, rounded to nearest integer

Progress Bar:

Range: 0 to 8 kg/day
Position: clamp(dailyAverage, 0, 8) / 8 × 100%

UI Placement:
Top stats row on dashboard, alongside Emissions and Real-World Equivalents cards.

---

# Streak Counter

Purpose:
Track how many consecutive calendar days the user has logged at least one activity.

Definition of a streak day:
Any calendar date (YYYY-MM-DD) that has at least one log entry in localStorage.

Formula:

1. Get sorted list of unique logged dates in descending order
2. Starting from today, count consecutive days with no gap
3. If today has no log, check if yesterday was logged (grace period: streak still active)
4. A gap of more than 1 calendar day resets streak to 0

streakCount =
number of consecutive days ending today (or yesterday)

Storage key: `ecoai_streak`

Milestone Messages:

| Streak     | Message            |
| ---------- | ------------------ |
| 1 day      | "🌱 Day one done!" |
| 3 days     | "🌱 Great start!"  |
| 7 days     | "⭐ One week!"      |
| 14 days    | "🔥 Two weeks!"    |
| 30 days    | "🏆 Eco Champion!" |

UI Placement:
Dashboard header area, near High Contrast toggle and Log Footprint button.

Display format: "🔥 5-day streak"

If streak is 0:
Show "Start your streak today" in muted text.

---

# What-If Simulator

Purpose:
Estimate carbon savings from changing a transport behaviour.

Inputs:
- currentMethod (transport type)
- replacementMethod (transport type)
- distanceKm (trip distance in km)
- tripsPerWeek (frequency)

Formula:

savingsPerTrip =
(currentFactor - replacementFactor) × distanceKm

weeklySavings =
savingsPerTrip × tripsPerWeek

monthlySavings =
weeklySavings × 4

yearlySavings =
monthlySavings × 12

Return:

* Savings per trip (kg CO2)
* Weekly savings (kg CO2)
* Monthly savings (kg CO2)
* Yearly savings (kg CO2)
* Equivalent trees saved (yearlySavings / 21)

Validation:
If replacementFactor >= currentFactor, return 0 for all savings (no benefit).

---

# Behavioral Pattern Detection

Analyze historical logs.

Supported insights:

1. Weekend emissions higher than weekday emissions

2. Increasing emission trend over last 14 days

3. Decreasing emission trend over last 14 days

4. Largest emission category (transport / food / electricity / shopping)

5. Day-of-week with consistently highest emissions

Output examples:

* "Transportation contributes 60% of your emissions"
* "Weekend emissions are 35% higher than weekdays"
* "Electricity emissions increased over the last 14 days"
* "Your highest-emission day is typically Friday"
* "Shopping is your fastest-growing emission category"

Only these deterministic findings should be passed to the AI coach.

Minimum data required:
At least 7 days of logs for pattern detection.
If fewer than 7 days, pass only the category breakdown.

---

# Carbon Forecast

Use moving averages only.

Do not use machine learning.

Process:

1. Calculate average daily emissions over last 30 days
   (or all available days if fewer than 30)

2. Forecast monthly emissions:

monthlyForecast =
dailyAverage × 30

3. Forecast yearly emissions:

yearlyForecast =
dailyAverage × 365

4. Compare forecast to India average:

monthlyDelta =
monthlyForecast - 158.3

Display delta as:
"On track to emit X kg less/more than India average this month"

---

# Carbon Budget

User defines:

monthlyTarget (kg CO2)

Calculations:

remainingBudget =
monthlyTarget - currentMonthEmission

budgetUsagePercent =
(currentMonthEmission / monthlyTarget) × 100

Status thresholds:

| Usage %   | Status  | Color   |
| --------- | ------- | ------- |
| < 60%     | Safe    | Green   |
| 60–85%    | Warning | Amber   |
| > 85%     | Danger  | Red     |

If no budget is set, hide usage percent and status.

---

# Real-World Equivalents

Convert kg CO2 into three intuitive equivalents.

Formula 1 — Driving baseline:

equivalentDrivingKm =
co2Amount / 0.192

Formula 2 — Short-haul flight equivalent:

equivalentFlights =
co2Amount / 255

(255 kg CO2 = average 1,000 km short-haul flight)

Formula 3 — Trees needed to absorb:

equivalentTrees =
co2Amount / 21

(1 tree absorbs ~21 kg CO2 per year on average)

Display examples:

50 kg CO2
≈ 260 km of car travel
≈ 0.2 short-haul flights
≈ 2.4 trees/year needed

These equivalents are informational and approximate only.

---

# AI Usage Awareness

Purpose:
Show users the environmental cost of their AI interactions within EcoAI.

Tracking:
Increment a counter in localStorage each time the AI coach is called.

Storage key: `ecoai_ai_usage`

Fields:
- totalRequests: total AI coach calls ever
- sessionRequests: calls in current browser session
- lastUpdated: ISO timestamp of last call

Calculations (per request):

| Metric      | Per Request | Formula                            |
| ----------- | ----------- | ---------------------------------- |
| Electricity | 0.001 kWh   | totalRequests × 0.001              |
| Water       | 0.5 litres  | totalRequests × 0.5                |
| CO2         | 0.0004 kg   | totalRequests × 0.0004             |

Sources:
- Electricity: Patterson et al., 2021 (LLM inference avg)
- Water: Li et al., 2023 (data center cooling)
- CO2: Derived from Indian grid factor × electricity estimate

Display:
Show running totals for all three metrics.

Tip to always display:
"Combine multiple questions into one prompt to reduce AI energy use.
Batch your carbon analysis sessions when possible."

UI Placement:
Collapsible section on dashboard, below the main stats row.
Open by default. Use secondary/muted styling to avoid visual dominance.

---

# AI Sustainability Coach

AI receives:

* Current footprint (total and per category)
* Category breakdown with percentages
* Forecast (monthly and yearly)
* Behavioral pattern findings (from deterministic logic above)
* User profile (diet type, commute method, household size)

AI returns:

* Top emission drivers with percentages
* Personalized recommendations (minimum 3, one per major category)
* High-impact actions (minimum 2, specific and actionable)
* Detected behavior patterns summary

AI must never generate carbon calculations.
AI must never replace deterministic business logic.
AI must use India-specific context in all recommendations
(e.g., reference Delhi Metro, Indian food, local electricity providers).

---

# Testing Requirements

All calculation functions must have unit tests.

Covered by tests:

1. emissionFactors.test.ts
   - Car 10 km → 1.92 kg CO2
   - Metro 10 km → 0.27 kg CO2
   - 1 beef meal → 6.5 kg CO2
   - 1 vegetarian meal → 0.7 kg CO2
   - 5 kWh electricity → 4.1 kg CO2
   - ₹2000 shopping → 0.9 kg CO2
   - Combined daily total test

2. whatIfSimulator.test.ts
   - Car → Metro, 10 km, 3 trips/week: 4.95 kg/week saved
   - Car → Cycle, 5 km, 5 trips/week: 4.8 kg/week saved
   - Same method → same method: 0 savings

3. ecoScore.test.ts
   - 1.2 kg/day → A+
   - 2.1 kg/day → A
   - 3.2 kg/day → B
   - 4.2 kg/day → C
   - 5.2 kg/day → D
   - 6.5 kg/day → F

4. streak.test.ts
   - 3 consecutive days → streak = 3
   - Gap after day 2 → streak resets to 1
   - No logs → streak = 0
   - Today only → streak = 1

5. Dashboard.test.tsx (component)
   - Eco-Score card renders
   - Streak badge renders
   - AI Usage Awareness section renders