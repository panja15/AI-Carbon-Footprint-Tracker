import { Router } from 'express';
import {
  getOrCreateSession,
  saveProfile,
  getProfile,
  saveGoal,
  getGoal
} from '../controllers/user.controller.js';
import {
  saveLog,
  getLogs,
  deleteLog
} from '../controllers/log.controller.js';
import {
  getWhatIfSimulation,
  getForecast,
  getCoaching
} from '../controllers/analysis.controller.js';
import {
  getJourneyPlan,
  saveJourney,
  getJourneyHistory,
  getJourneyCoaching
} from '../controllers/journey.controller.js';
import {
  handleAuditChat,
  handleAuditForm
} from '../controllers/audit.controller.js';
import {
  handleDecisionChat
} from '../controllers/decision.controller.js';
import {
  extractReceipt,
  confirmReceipt,
  getReceiptHistory
} from '../controllers/receipt.controller.js';
import {
  getTwinData,
  getTwinNarrative
} from '../controllers/twin.controller.js';
import {
  profileSchema,
  logSchema,
  goalSchema,
  journeySchema,
  receiptConfirmSchema,
  validateBody
} from '../middleware/validation.js';
import { aiRateLimiter } from '../middleware/rate-limiter.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// User session and profile routes
router.get('/user/session', getOrCreateSession);
router.post('/user/profile', validateBody(profileSchema), saveProfile);
router.get('/user/profile', getProfile);
router.post('/user/goal', validateBody(goalSchema), saveGoal);
router.get('/user/goal', getGoal);

// Carbon logs routes
router.post('/logs', validateBody(logSchema), saveLog);
router.get('/logs', getLogs);
router.delete('/logs/:id', deleteLog);

// Analysis routes
router.get('/analysis/what-if', getWhatIfSimulation);
router.get('/analysis/forecast', getForecast);
router.get('/analysis/coach', aiRateLimiter, getCoaching);

// Journey Carbon Planner routes
router.get('/analysis/journey-plan', getJourneyPlan);
router.post('/journeys', validateBody(journeySchema), saveJourney);
router.get('/journeys', getJourneyHistory);
router.post('/analysis/journey-coach', aiRateLimiter, getJourneyCoaching);

// Conversational and Traditional Onboarding Audit routes
router.post('/audit/chat', handleAuditChat);
router.post('/audit/form', handleAuditForm);

// Decision Chat Engine
router.post('/decision/chat', aiRateLimiter, handleDecisionChat);

// Receipt Scanner routes
router.post('/receipts/extract', extractReceipt);
router.post('/receipts/confirm', validateBody(receiptConfirmSchema), confirmReceipt);
router.get('/receipts/history', getReceiptHistory);

// Carbon Twin routes
router.get('/twin', getTwinData);
router.post('/twin/narrative', aiRateLimiter, getTwinNarrative);

export default router;
