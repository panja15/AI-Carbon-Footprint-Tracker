import request from 'supertest';
import app, { initDatabase } from '../app.js';
import sequelize from '../config/database.js';
import { JourneyHistory } from '../repositories/database.models.js';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await initDatabase();
});

afterAll(async () => {
  await sequelize.close();
});

describe('Journey Carbon Planner REST API & Calculations', () => {
  let userId;

  // Retrieve user session id for requests
  beforeAll(async () => {
    const res = await request(app).get('/api/user/session');
    userId = res.body.user.id;
  });

  describe('GET /api/analysis/journey-plan', () => {
    test('should calculate route options and emissions correctly', async () => {
      const res = await request(app)
        .get('/api/analysis/journey-plan')
        .query({
          origin: 'Noida Sector 62',
          destination: 'Connaught Place'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('origin', 'Noida Sector 62');
      expect(res.body).toHaveProperty('destination', 'Connaught Place');
      expect(res.body).toHaveProperty('options');
      expect(Array.isArray(res.body.options)).toBe(true);
      expect(res.body.options.length).toBeGreaterThan(0);

      // Verify individual calculations
      const options = res.body.options;
      const driving = options.find(o => o.mode === 'Driving');
      const cycling = options.find(o => o.mode === 'Cycling');
      const walking = options.find(o => o.mode === 'Walking');
      const transit = options.find(o => o.mode === 'Metro' || o.mode === 'Bus');

      if (driving) {
        expect(driving.co2Kg).toBeCloseTo(driving.distanceKm * 0.192, 3);
      }
      if (cycling) {
        expect(cycling.co2Kg).toBe(0);
      }
      if (walking) {
        expect(walking.co2Kg).toBe(0);
      }
      if (transit) {
        const factor = transit.mode === 'Metro' ? 0.027 : 0.089;
        expect(transit.co2Kg).toBeCloseTo(transit.distanceKm * factor, 3);
      }

      // Verify lowest carbon option selection
      expect(res.body).toHaveProperty('bestOption');
      const best = res.body.bestOption;
      // Walking or Cycling should be the lowest emission options (0 kg CO2)
      expect(['Walking', 'Cycling']).toContain(best.mode);
      expect(best.reductionPercent).toBe(100); // comparison to driving (100% saved)
    });

    test('should return 400 if origin is missing', async () => {
      const res = await request(app)
        .get('/api/analysis/journey-plan')
        .query({
          destination: 'Connaught Place'
        });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Bad Request');
    });

    test('should return 400 if destination is missing', async () => {
      const res = await request(app)
        .get('/api/analysis/journey-plan')
        .query({
          origin: 'Home'
        });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Bad Request');
    });
  });

  describe('POST /api/journeys and GET /api/journeys (Persistence)', () => {
    test('should save a completed journey search to history', async () => {
      const payload = {
        origin: 'Indira Gandhi International Airport',
        destination: 'New Delhi Railway Station',
        distanceKm: 18.5,
        selectedMode: 'Metro',
        estimatedEmission: 0.50
      };

      const res = await request(app)
        .post(`/api/journeys?user_id=${userId}`)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('Journey saved successfully');
      expect(res.body.journey).toHaveProperty('id');
      expect(res.body.journey.origin).toBe(payload.origin);
      expect(res.body.journey.selectedMode).toBe(payload.selectedMode);
      expect(res.body.journey.estimatedEmission).toBe(payload.estimatedEmission);
    });

    test('should fail to save journey if parameters are missing (Zod validation)', async () => {
      const payload = {
        origin: 'Indira Gandhi International Airport',
        selectedMode: 'Metro'
      };

      const res = await request(app)
        .post(`/api/journeys?user_id=${userId}`)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Validation Error');
    });

    test('should retrieve saved journey logs from history list', async () => {
      const res = await request(app).get(`/api/journeys?user_id=${userId}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      
      const loggedJourney = res.body.find(j => j.origin === 'Indira Gandhi International Airport');
      expect(loggedJourney).toBeDefined();
      expect(loggedJourney.destination).toBe('New Delhi Railway Station');
      expect(loggedJourney.selectedMode).toBe('Metro');
    });
  });
});
