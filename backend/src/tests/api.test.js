import request from 'supertest';
import app, { initDatabase } from '../app.js';
import sequelize from '../config/database.js';

// Setup environment and database connection before tests
beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await initDatabase();
});

// Close database connection after tests
afterAll(async () => {
  await sequelize.close();
});

describe('API Route Endpoints', () => {
  let userId;

  test('GET /api/user/session - should fetch or initialize a session user', async () => {
    const res = await request(app).get('/api/user/session');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.name).toBe('Eco AI Champion');
    userId = res.body.user.id;
  });

  test('POST /api/user/profile - should save questionnaire profile and return baseline emissions estimate', async () => {
    const profileData = {
      name: 'Eco Warrior',
      transport_type: 'Car',
      daily_distance: 15,
      diet_type: 'Vegetarian',
      household_size: 2,
      electricity_usage: 120
    };

    const res = await request(app)
      .post(`/api/user/profile?user_id=${userId}`)
      .send(profileData);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Profile saved successfully');
    expect(res.body).toHaveProperty('baseline_estimate');
    // Car = 15 * 0.192 * 30 = 86.4
    // Food = 3 * 30 * 0.7 = 63
    // Electricity = 120 * 0.82 = 98.4
    // Total = 86.4 + 63 + 98.4 = 247.8
    expect(res.body.baseline_estimate).toBe(247.8);
  });

  test('GET /api/user/profile - should retrieve saved profile', async () => {
    const res = await request(app).get(`/api/user/profile?user_id=${userId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.transport_type).toBe('Car');
    expect(res.body.diet_type).toBe('Vegetarian');
  });

  test('POST /api/user/goal - should set monthly budget goal target', async () => {
    const targetData = {
      monthly_target: 150.0
    };

    const res = await request(app)
      .post(`/api/user/goal?user_id=${userId}`)
      .send(targetData);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Goal saved successfully');
    expect(res.body.goal.monthly_target).toBe(150.0);
  });

  test('GET /api/user/goal - should retrieve target goal', async () => {
    const res = await request(app).get(`/api/user/goal?user_id=${userId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.monthly_target).toBe(150.0);
  });

  test('POST /api/logs - should add daily carbon logs and calculate emissions', async () => {
    const logData = {
      date: '2026-06-20',
      transport_distance: 20,
      transport_type: 'Metro',
      meals: {
        vegetarian: 2,
        chicken: 1,
        beef: 0
      },
      electricity_usage: 10
    };

    const res = await request(app)
      .post(`/api/logs?user_id=${userId}`)
      .send(logData);

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Carbon log saved successfully');
    
    // Metro = 20 * 0.027 = 0.54
    // Food = (2 * 0.7) + (1 * 2.4) + (0 * 6.5) = 1.4 + 2.4 = 3.8
    // Electricity = 10 * 0.82 = 8.2
    // Total = 0.54 + 3.8 + 8.2 = 12.54
    expect(res.body.log.transport_emission).toBe(0.54);
    expect(res.body.log.food_emission).toBe(3.8);
    expect(res.body.log.electricity_emission).toBe(8.2);
    expect(res.body.log.total_emission).toBe(12.54);
  });

  test('GET /api/logs - should fetch logs history list', async () => {
    const res = await request(app).get(`/api/logs?user_id=${userId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].date).toBe('2026-06-20');
  });

  test('GET /api/analysis/what-if - should simulate savings correctly', async () => {
    const res = await request(app)
      .get('/api/analysis/what-if')
      .query({
        currentType: 'Car',
        replacementType: 'Metro',
        distance: 10,
        frequency: 5
      });

    expect(res.statusCode).toBe(200);
    // currentFactor = 0.192, replacementFactor = 0.027
    // savingsPerTrip = (0.192 - 0.027) * 10 = 1.65
    // weeklySavings = 1.65 * 5 = 8.25
    // monthlySavings = 8.25 * 4 = 33
    // yearlySavings = 33 * 12 = 396
    expect(res.body.monthly_reduction_kg).toBe(33);
    expect(res.body.yearly_reduction_kg).toBe(396);
  });

  test('GET /api/analysis/forecast - should return moving average forecast based on logs', async () => {
    const res = await request(app).get(`/api/analysis/forecast?user_id=${userId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.logged_days_count).toBe(1);
    // Daily average is 12.54 (the single log)
    // Monthly forecast = 12.54 * 30 = 376.2
    // Yearly forecast = 12.54 * 365 = 4577.1
    expect(res.body.monthly_forecast_kg).toBe(376.2);
    expect(res.body.yearly_forecast_kg).toBe(4577.1);
  });
});
