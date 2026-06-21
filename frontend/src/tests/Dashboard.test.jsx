import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../app/dashboard/page.js';
import * as api from '../services/api.js';

// Mock Recharts to avoid canvas/SVG issues in Jest jsdom environment
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  PieChart: ({ children }) => <div>{children}</div>,
  Pie: ({ children }) => <div>{children}</div>,
  Cell: () => null,
  LineChart: ({ children }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null
}));

// Mock react-markdown to bypass ESM parsing error in Jest jsdom
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>
}));

// Mock router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  usePathname() {
    return '/dashboard';
  },
}));

// Mock Auth Context
jest.mock('../components/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'u-123', name: 'Eco Warrior' },
    session: { access_token: 'mock-token' },
    loading: false,
  }),
}));

// Mock the API services
jest.mock('../services/api.js', () => ({
  fetchSession: jest.fn(),
  saveProfile: jest.fn(),
  saveGoal: jest.fn(),
  saveLog: jest.fn(),
  fetchLogs: jest.fn(),
  fetchForecast: jest.fn(),
  fetchCoaching: jest.fn(),
  fetchJourneyPlan: jest.fn().mockResolvedValue({ options: [] }),
  saveJourneyHistory: jest.fn().mockResolvedValue({}),
  fetchJourneyHistory: jest.fn().mockResolvedValue([]),
  fetchJourneyCoachAdvice: jest.fn().mockResolvedValue({ coaching_advice: '' }),
  submitAuditChat: jest.fn(),
  submitAuditForm: jest.fn(),
  askDecisionChat: jest.fn().mockResolvedValue({ advice: '', calculated: true }),
  extractReceiptFile: jest.fn(),
  confirmReceiptData: jest.fn(),
  fetchReceiptHistory: jest.fn().mockResolvedValue([]),
  fetchTwinData: jest.fn().mockResolvedValue(null),
  fetchTwinNarrative: jest.fn().mockResolvedValue({ narrative: '' })
}));

describe('Dashboard Extra Sections Render Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  test('should render Eco-Score card, Streak badge, and AI Usage Awareness section', async () => {
    api.fetchSession.mockResolvedValue({
      user: {
        id: 'u-123',
        name: 'Eco Warrior',
        profile: {
          transport_type: 'Car',
          daily_distance: 10,
          diet_type: 'Vegetarian',
          household_size: 1,
          electricity_usage: 100
        }
      }
    });

    const today = new Date();
    const dates = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    const mockLogs = dates.map((date, index) => ({
      id: `log-${index}`,
      date,
      total_emission: 4.5,
      transport_emission: 2.0,
      food_emission: 1.5,
      electricity_emission: 1.0,
      shopping_emission: 0
    }));

    api.fetchLogs.mockResolvedValue(mockLogs);

    api.fetchForecast.mockResolvedValue({
      daily_average: 13.12,
      logged_days_count: 5,
      monthly_forecast_kg: 393.6,
      yearly_forecast_kg: 4788.8
    });

    api.fetchCoaching.mockResolvedValue({
      coaching_advice: 'Keep going!',
      patterns: []
    });

    // Mock localStorage for AI usage to ensure they render
    localStorage.setItem('ecoai_ai_usage', JSON.stringify({ totalRequests: 12 }));

    render(<Dashboard />);

    // 1. Verify Eco-Score card renders
    await waitFor(() => {
      expect(screen.getByText('YOUR ECO-GRADE')).toBeInTheDocument();
      expect(screen.getByText('Eco-Score')).toBeInTheDocument();
    });

    // 2. Verify Streak badge renders (shows the 5-day streak we calculated)
    expect(screen.getByText(/5-day streak/)).toBeInTheDocument();

    // 3. Verify AI Usage Awareness section renders
    expect(screen.getByText(/AI Usage Awareness/)).toBeInTheDocument();
    expect(screen.getByText(/ELECTRICITY/)).toBeInTheDocument();
    expect(screen.getByText(/WATER/)).toBeInTheDocument();
    expect(screen.getByText(/CO₂/)).toBeInTheDocument();
  });
});
