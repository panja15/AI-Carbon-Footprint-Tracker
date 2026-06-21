# EcoAI - Carbon Footprint Awareness Platform

## Project Goal

Build a production-quality full-stack web application called EcoAI that helps users understand, track, forecast, and reduce their carbon footprint through personalized insights and AI-powered recommendations.

The application must focus on real-world usability, clean architecture, accessibility, security, maintainability, and testing.

The solution should be suitable for submission to an AI coding challenge where evaluation criteria include:

* Code Quality
* Security
* Efficiency
* Testing
* Accessibility

---

# Technical Stack

Frontend:

* Next.js with App router
* Chart.js or Recharts

Backend:

* Node.js
* Express
* Module js

Database
* Supabase PostgreSQL

ORM
* Sequelize

Testing:

* Jest
* React Testing Library
* Supertest

Validation
* Zod

Styling
* modular CSS

Accessibility
* Radix UI 

AI:

* Gemini API
* AI should only generate recommendations and summaries
* Carbon calculations must never depend on AI


---

# Architecture Rules

Follow clean architecture principles.

Backend folders:

/src
/routes
/controllers
/services
/repositories
/middleware
/utils
/types
/tests

Frontend folders:

/src
/components
/pages
/hooks
/services
/types
/utils
/tests

Keep business logic separate from routes.

Never place SQL inside route handlers.

Use environment variables for secrets.

---

# User Flow

## First Visit

Show AI onboarding assistant.

Ask:

1. Primary transport method
2. Average daily commute distance
3. Diet type
4. Household size
5. Monthly electricity consumption estimate

Store answers.

Generate baseline footprint estimate.

Display:

"You are estimated to emit X kg CO2 per month."

---

# Carbon Categories

Track:

1. Transportation
2. Electricity
3. Food

Do not add additional categories.

---

# Transportation Inputs

Supported:

* Car
* Metro
* Bus
* Auto Rickshaw
* Motorcycle
* Bicycle
* Walking

User enters:

* Distance travelled in km

---

# Food Inputs

Supported:

* Vegetarian meal
* Chicken meal
* Beef meal

User enters meal counts.

---

# Electricity Inputs

User enters:

* Daily kWh consumption

---

# India-Specific Emission Factors

Store all factors in a dedicated constants file.

Example values:

Transportation:
Car = 0.192 kg CO2/km
Metro = 0.041 kg CO2/km
Bus = 0.105 kg CO2/km
Auto Rickshaw = 0.120 kg CO2/km
Motorcycle = 0.103 kg CO2/km
Bicycle = 0
Walking = 0

Food:
Vegetarian Meal = 1.5 kg CO2
Chicken Meal = 3.0 kg CO2
Beef Meal = 15.0 kg CO2

Electricity:
Indian Grid = 0.82 kg CO2/kWh

All calculations must use these constants.

Never ask AI to calculate emissions.

---

# Dashboard

Show:

Total Carbon Footprint

Breakdown by:

* Transport
* Food
* Electricity

Display:

* Daily
* Weekly
* Monthly

Charts:

* Pie chart for category contribution
* Trend line chart over time

---

# What-If Scenario Simulator

This is a key feature.

User selects:

Current Behaviour:
Car

Replacement:
Metro

Frequency:
3 days per week

Distance:
20 km

System calculates:

Monthly Reduction
Yearly Reduction

Display projected savings.

This calculation must be deterministic and not AI generated.

---

# Predictive Carbon Forecast

Based on previous logs.

Calculate:

30-day average footprint

Forecast:

* Monthly footprint
* Annual footprint

Show future projection chart.

Use simple moving averages.

Do not use machine learning.

---

# Behavioral Pattern Detection

Analyze historical logs.

Detect:

* Weekend spikes
* Increasing trend
* Decreasing trend
* Dominant emission source

Pass only summarized findings to Gemini.

Example:

"Weekend emissions are 45% higher than weekdays.
Transportation contributes 62% of total emissions."

Gemini generates personalized recommendations from these findings.

---

# AI Sustainability Coach

Gemini receives:

Current footprint
Category breakdown
Detected patterns
Forecast

Prompt Gemini to generate:

1. Top emission drivers
2. Personalized recommendations
3. Estimated high-impact actions

Limit output to 200 words.

Never allow Gemini to calculate emissions.

Gemini only explains and advises.

---

# Real World Equivalents Engine

Convert CO2 values into understandable comparisons.

Examples:

10 kg CO2
≈ 41 km driven by car

50 kg CO2
≈ 1 short-haul flight equivalent

100 kg CO2
≈ Carbon absorbed by 4 trees annually

Create utility functions.

Show equivalents throughout dashboard.

---

# Carbon Budget

User sets monthly target.

Example:

120 kg CO2

Display:

Used:
Remaining:
Percentage Consumed:

Progress bar required.

---

# Accessibility Requirements

Mandatory:

* Semantic HTML
* Keyboard navigation
* ARIA labels
* Focus indicators
* High contrast mode
* Screen-reader support

Charts must have accessible table alternatives.

Every form input requires labels.

---

# Security Requirements

Input validation on backend.

Sanitize user inputs.

Rate limit AI endpoints.

Store API keys in environment variables.

Never expose secrets to frontend.

Validate all request bodies.

---

# Testing Requirements

Backend Tests:

* Carbon calculations
* What-if calculations
* Forecast calculations
* API endpoints

Frontend Tests:

* Dashboard rendering
* Form submission
* Accessibility checks

Minimum:
80% coverage

---

# Database Schema

Users

id
name
created_at

Profiles

id
user_id
transport_type
daily_distance
diet_type
household_size
electricity_usage

CarbonLogs

id
user_id
date
transport_emission
food_emission
electricity_emission
total_emission

Goals

id
user_id
monthly_target

---

# README Requirements

Include:

Project Overview

Features

Architecture

AI Usage

Calculation Logic

Installation Steps

Testing Instructions

Accessibility Features

Security Considerations

Future Improvements

Assumptions

---

# Important Rules

Do not invent features outside this specification.

Do not use mock AI outputs in production code.

Do not hardcode user data.

Keep repository under 10MB.

Keep implementation realistic and maintainable.

Focus on code quality, testing, accessibility, and clean architecture.
