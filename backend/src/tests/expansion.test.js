import request from 'supertest';
import app, { initDatabase } from '../app.js';
import sequelize from '../config/database.js';
import { User, Profile, Receipt, CarbonLog } from '../repositories/database.models.js';
import { calculateBaselineMonthlyFootprint } from '../services/calculation.service.js';
import { compareTravel, compareCommute, compareFood } from '../services/decision.service.js';
import { parseReceiptText, extractReceiptData } from '../services/ocr.service.js';
import { calculateCurrentYou, calculateFutureYou, getSustainabilityPersona } from '../services/twin.service.js';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await initDatabase();
});

afterAll(async () => {
  await sequelize.close();
});

describe('EcoAI Expanded Features Backend & Calculations Test Suite', () => {
  let userId;

  beforeAll(async () => {
    const res = await request(app).get('/api/user/session');
    userId = res.body.user.id;
  });

  describe('Feature 1: Conversational & Form Audits & Calculations', () => {
    test('calculateBaselineMonthlyFootprint handles new fields correctly', () => {
      const profile = {
        transport_type: 'Car',
        daily_distance: 10,
        weekly_commute_frequency: 5,
        diet_type: 'Vegetarian',
        meals_per_day: 3,
        household_size: 1,
        electricity_usage: 100,
        ai_usage_frequency: 10,
        video_streaming_usage: 2
      };

      const result = calculateBaselineMonthlyFootprint(profile);

      // Calculations:
      // Transport: 10 km * 0.192 kg/km * (5 * 4.33 days) = 1.92 * 21.65 = 41.568 kg CO2
      // Food: 3 meals/day * 30 days * 0.7 kg/meal = 63 kg CO2
      // Electricity: 100 kWh * 0.82 kg/kWh = 82 kg CO2
      // Digital Habits: AI (10 * 30 * 0.0004) = 0.12 kg CO2, Video (2 * 30 * 0) = 0 kg CO2
      // Total: 41.568 + 63 + 82 + 0.12 = 186.688 kg CO2

      expect(result.transport_emission).toBeCloseTo(41.568, 3);
      expect(result.food_emission).toBe(63);
      expect(result.electricity_emission).toBe(82);
      expect(result.digital_emission).toBe(0.12);
      expect(result.total_emission).toBeCloseTo(186.688, 3);
    });

    test('POST /api/audit/form should validate and save profile', async () => {
      const payload = {
        user_id: userId,
        name: 'Form Tester',
        transport_type: 'Metro',
        daily_distance: 20,
        weekly_commute_frequency: 4,
        diet_type: 'Vegan',
        meals_per_day: 2,
        household_size: 2,
        electricity_usage: 120,
        ai_usage_frequency: 5,
        video_streaming_usage: 3
      };

      const res = await request(app)
        .post('/api/audit/form')
        .send(payload);

      expect(res.statusCode).toBe(200);
      expect(res.body.complete).toBe(true);
      expect(res.body.profile.transport_type).toBe('Metro');
      expect(res.body.profile.weekly_commute_frequency).toBe(4);
      expect(res.body.profile.meals_per_day).toBe(2);
      expect(res.body.profile.ai_usage_frequency).toBe(5);
      
      // Check baseline
      // Transport: 20 * 0.027 * (4 * 4.33) = 0.54 * 17.32 = 9.3528
      // Food: 2 * 30 * 0.4 = 24
      // Electricity: 120 * 0.82 = 98.4
      // Digital: 5 * 30 * 0.0004 = 0.06
      // Total: 9.3528 + 24 + 98.4 + 0.06 = 131.8128
      expect(res.body.baseline.total_emission).toBeCloseTo(131.813, 3);
    });

    test('POST /api/audit/chat executes rule-based interviewer fallback', async () => {
      const chatHistory = [
        { sender: 'bot', text: 'Hi, I\'m EcoAI. I\'ll help estimate your sustainability footprint through a quick conversation. First, what is your display name?' },
        { sender: 'user', text: 'Chat Tester' }
      ];

      const res = await request(app)
        .post('/api/audit/chat')
        .send({ messages: chatHistory, user_id: userId });

      expect(res.statusCode).toBe(200);
      expect(res.body.complete).toBe(false);
      expect(res.body.message.toLowerCase()).toContain('transport');
    });
  });

  describe('Feature 2: Decision Engine Calculations & Endpoint', () => {
    test('compareTravel driving vs metro math', () => {
      const result = compareTravel(15, 'Car', 'Metro');
      expect(result.optionA.co2Kg).toBeCloseTo(15 * 0.192, 3); // 2.88
      expect(result.optionB.co2Kg).toBeCloseTo(15 * 0.027, 3); // 0.405
      expect(result.recommended).toBe('Metro');
      expect(result.reductionPercent).toBe(86); // (2.88 - 0.405) / 2.88 = 0.859
    });

    test('compareCommute office vs WFH math', () => {
      const result = compareCommute(10, 'Car');
      // commuteDistance = 20 km
      // transportCo2 = 20 * 0.192 = 3.84
      // Option A (Commute): 3.84 + WFH overhead (0.065) = 3.905
      // Option B (WFH): 0.065
      // savings = 3.84
      // reductionPercent = 3.84 / 3.905 = 98.3% -> 98%
      expect(result.optionA.co2Kg).toBeCloseTo(3.905, 3);
      expect(result.optionB.co2Kg).toBe(0.065);
      expect(result.recommended).toBe('Work From Home');
      expect(result.reductionPercent).toBe(98);
    });

    test('compareFood cook vegetarian vs order chicken math', () => {
      const result = compareFood('Vegetarian', 'Chicken', 5);
      // cook vegetarian = 0.7
      // order chicken = 2.4 + delivery (5 * 0.103 = 0.515) = 2.915
      // reduction = (2.915 - 0.7) / 2.915 = 75.98% -> 76%
      expect(result.optionA.co2Kg).toBe(0.7);
      expect(result.optionB.co2Kg).toBeCloseTo(2.915, 3);
      expect(result.recommended).toBe('Cook at Home');
      expect(result.reductionPercent).toBe(76);
    });

    test('POST /api/decision/chat resolves travel comparison questions', async () => {
      const res = await request(app)
        .post('/api/decision/chat')
        .send({ question: 'Should I drive or take the metro for 15 km?' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('calculated');
      expect(res.body.calculated.category).toBe('travel');
      expect(res.body.calculated.recommended).toBe('Metro');
      expect(res.body.calculated.reductionPercent).toBe(86);
      expect(res.body).toHaveProperty('advice');
    });
  });

  describe('Feature 3: Carbon Receipt Scanner OCR & Saving', () => {
    test('parseReceiptText extracts parameters from utility bill text', () => {
      const text = `DELHI TRANSCO ELECTRICITY BILL\nDate: 2026-06-01\nTotal Amount: INR 1450.50\nConsumption: 120 kWh\nStatus: Paid`;
      const result = parseReceiptText(text);

      expect(result.date).toBe('2026-06-01');
      expect(result.cost).toBe(1450.50);
      expect(result.electricity_kwh).toBe(120);
      expect(result.distance).toBeUndefined();
    });

    test('POST /api/receipts/extract fails on unsupported formats', async () => {
      const res = await request(app)
        .post('/api/receipts/extract')
        .send({
          fileData: 'SGVsbG8=',
          filename: 'document.txt',
          mimeType: 'text/plain',
          user_id: userId
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Unsupported File Format');
    });

    test('POST /api/receipts/extract parses test files in mock environment', async () => {
      const res = await request(app)
        .post('/api/receipts/extract')
        .send({
          fileData: 'SGVsbG8=', // base64
          filename: 'taxi-trip-receipt.png',
          mimeType: 'image/png',
          user_id: userId
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.extracted.transport_type).toBe('Car');
      expect(res.body.extracted.distance).toBe(12.4);
      expect(res.body).toHaveProperty('receiptId');
    });

    test('POST /api/receipts/confirm validates, saves logs, and updates receipt status', async () => {
      // 1. Create a pending receipt record
      const receipt = await Receipt.create({
        user_id: userId,
        filename: 'trip.png',
        extracted_date: '2026-06-21',
        extracted_distance: 10,
        extracted_mode: 'Car',
        status: 'pending'
      });

      // 2. Submit confirmation
      const res = await request(app)
        .post('/api/receipts/confirm')
        .send({
          receiptId: receipt.id,
          date: '2026-06-21',
          distance: 10,
          transport_type: 'Car',
          user_id: userId
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toContain('confirmed');
      expect(res.body.log.transport_emission).toBeCloseTo(10 * 0.192, 3); // 1.92
      expect(res.body.log.total_emission).toBeCloseTo(1.92, 3);

      // Verify receipt status changed in database
      const updated = await Receipt.findByPk(receipt.id);
      expect(updated.status).toBe('confirmed');
    });
  });

  describe('Feature 4 & 5: Carbon Twin, Goal Persona, and Narratives', () => {
    test('getSustainabilityPersona mapping details', () => {
      expect(getSustainabilityPersona(1.2)).toBe('Low Impact Champion');
      expect(getSustainabilityPersona(2.2)).toBe('Green Custodian');
      expect(getSustainabilityPersona(3.2)).toBe('Eco Advocate');
      expect(getSustainabilityPersona(4.2)).toBe('Conscious Consumer');
      expect(getSustainabilityPersona(5.2)).toBe('Carbon Moderate');
      expect(getSustainabilityPersona(6.2)).toBe('High Intensity Consumer');
    });

    test('calculateFutureYou calculates savings and lists required changes', () => {
      const currentYou = {
        dailyAverage: 6.0,
        monthlyFootprint: 180.0,
        annualFootprint: 2190.0,
        persona: 'High Intensity Consumer'
      };

      const profile = {
        transport_type: 'Car',
        daily_distance: 15,
        diet_type: 'Beef',
        electricity_usage: 120
      };

      const future = calculateFutureYou(currentYou, 'reduce_20', profile);

      expect(future.monthlyFootprint).toBeCloseTo(144.0, 3); // 180 * 0.8
      expect(future.improvementPercent).toBe(20);
      expect(future.timeline).toBe('2 months');
      expect(future.requiredChanges.length).toBeGreaterThan(0);
      expect(future.requiredChanges[0]).toContain('Commute by Metro/Bus');
    });

    test('GET /api/twin returns Current/Future You matching objects', async () => {
      const res = await request(app)
        .get(`/api/twin?user_id=${userId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('currentYou');
      expect(res.body).toHaveProperty('futureYou');
      expect(res.body.currentYou).toHaveProperty('persona');
      expect(res.body.futureYou).toHaveProperty('improvementPercent');
    });
  });
});
