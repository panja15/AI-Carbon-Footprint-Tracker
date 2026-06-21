# AGENTS.md

## Project Overview

Build EcoAI, a Carbon Footprint Awareness Platform that helps users:

* Track carbon emissions
* Understand emission sources
* Simulate lifestyle changes
* Forecast future emissions
* Receive personalized sustainability recommendations

## Technology Stack

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

## Non-Negotiable Rules

### Calculations

Carbon calculations MUST be deterministic.

Do NOT use AI to:

* Calculate emissions
* Forecast emissions
* Perform mathematical operations

AI may ONLY:

* Explain results
* Generate recommendations
* Summarize behavioral patterns

### Architecture

Backend structure:

src/
routes/
controllers/
services/
repositories/
middleware/
utils/
tests/

Frontend structure:

src/
pages/
components/
hooks/
services/
utils/
tests/

### Code Quality

Requirements:

* TypeScript strict mode
* No any types
* Small reusable functions
* No duplicated business logic
* Clear naming conventions

### Security

Requirements:

* Validate all request bodies
* Sanitize user inputs
* Store secrets in environment variables
* Never expose API keys to frontend
* Add rate limiting to AI endpoints

### Accessibility

Requirements:

* Semantic HTML
* Keyboard navigation
* Visible focus states
* ARIA labels where required
* Accessible chart alternatives

### Testing

Create tests for:

* Carbon calculations
* What-if simulator
* Forecast calculations
* API endpoints

Minimum target:
80% test coverage

### Performance

Requirements:

* Avoid unnecessary API calls
* Avoid unnecessary React re-renders
* Keep bundle size small
* Keep repository size under 10 MB

### Feature Scope

Implement ONLY:

* Onboarding questionnaire
* Carbon calculator
* Dashboard
* What-if simulator
* Carbon forecast
* Behavioral pattern detection
* AI sustainability coach
* Carbon budget tracking

Do not invent additional features.

### Data Source Rules

Use emission factors defined in SKILLS.md.

Do not fetch emission values from external services.

Use a single source of truth for emission constants.
