import { requireAuth } from '../middleware/auth.js';
import { User } from '../repositories/database.models.js';
import jwt from 'jsonwebtoken';
import sequelize from '../config/database.js';

// Setup environment and database connection before tests
beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.SUPABASE_JWT_SECRET = 'test-secret';
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Authentication Middleware', () => {
  let mockReq;
  let mockRes;
  let nextCalled;
  let nextFunction;

  beforeEach(() => {
    nextCalled = false;
    mockReq = {
      headers: {},
      query: {},
      body: {}
    };
    
    mockRes = {
      statusCode: 200,
      jsonPayload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonPayload = data;
        return this;
      }
    };
    
    nextFunction = () => {
      nextCalled = true;
    };
  });

  test('should authorize and decode a valid token', async () => {
    const tokenPayload = { sub: 'auth-user-id-1', email: 'test@example.com' };
    const token = jwt.sign(tokenPayload, 'test-secret');
    mockReq.headers.authorization = `Bearer ${token}`;

    await requireAuth(mockReq, mockRes, nextFunction);

    expect(nextCalled).toBe(true);
    expect(mockReq.user).toBeDefined();
    expect(mockReq.user.id).toBe('auth-user-id-1');
    expect(mockReq.user.name).toBe('test');
    
    // Verify sync created user in DB
    const dbUser = await User.findByPk('auth-user-id-1');
    expect(dbUser).not.toBeNull();
    expect(dbUser.name).toBe('test');
  });

  test('should return 401 for an invalid token', async () => {
    mockReq.headers.authorization = 'Bearer invalid-token-signature';

    await requireAuth(mockReq, mockRes, nextFunction);

    expect(mockRes.statusCode).toBe(401);
    expect(mockRes.jsonPayload).toHaveProperty('error', 'Unauthorized');
    expect(nextCalled).toBe(false);
  });

  test('should support backward compatibility in test mode using user_id query', async () => {
    // Create a user first
    const user = await User.create({ id: 'legacy-id-1', name: 'Legacy User' });
    mockReq.query.user_id = 'legacy-id-1';

    await requireAuth(mockReq, mockRes, nextFunction);

    expect(nextCalled).toBe(true);
    expect(mockReq.user.id).toBe('legacy-id-1');
  });

  test('should auto-create default user in test mode if no user_id is provided and DB is empty', async () => {
    await User.destroy({ where: {}, truncate: { cascade: true } });
    
    await requireAuth(mockReq, mockRes, nextFunction);

    expect(nextCalled).toBe(true);
    expect(mockReq.user).toBeDefined();
    expect(mockReq.user.name).toBe('Eco AI Champion');
  });
});
