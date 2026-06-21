import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from '../app/decision-coach/page.js';
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
    return '/decision-coach';
  },
}));

// Mock Auth Context
jest.mock('../components/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'u-1', name: 'Test Champion' },
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
  fetchJourneyPlan: jest.fn(),
  saveJourneyHistory: jest.fn(),
  fetchJourneyHistory: jest.fn(),
  fetchJourneyCoachAdvice: jest.fn(),
  submitAuditChat: jest.fn(),
  submitAuditForm: jest.fn(),
  askDecisionChat: jest.fn().mockResolvedValue({ advice: '', calculated: true }),
  extractReceiptFile: jest.fn(),
  confirmReceiptData: jest.fn(),
  fetchReceiptHistory: jest.fn().mockResolvedValue([]),
  fetchTwinData: jest.fn().mockResolvedValue(null),
  fetchTwinNarrative: jest.fn().mockResolvedValue({ narrative: '' })
}));

describe('Google Maps Journey Carbon Planner Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    // Mock initial user session
    api.fetchSession.mockResolvedValue({
      user: {
        id: 'u-1',
        name: 'Test Champion',
        profile: {
          transport_type: 'Car',
          daily_distance: 10,
          diet_type: 'Vegetarian',
          household_size: 1,
          electricity_usage: 100
        }
      }
    });
    api.fetchLogs.mockResolvedValue([]);
    api.fetchForecast.mockResolvedValue({ daily_average: 1, logged_days_count: 0, monthly_forecast_kg: 30, yearly_forecast_kg: 365 });
    api.fetchCoaching.mockResolvedValue({ coaching_advice: '', patterns: [] });
    api.fetchJourneyHistory.mockResolvedValue([]);
  });

  test('should render inputs and plan button with accessibility labels', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByLabelText('Origin Point A')).toBeInTheDocument();
      expect(screen.getByLabelText('Destination Point B')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Plan Journey' })).toBeInTheDocument();
    });
  });

  test('should search and display results in visual cards and accessible table toggles', async () => {
    api.fetchJourneyPlan.mockResolvedValue({
      origin: 'Delhi Airport',
      destination: 'Connaught Place',
      options: [
        { mode: 'Driving', distanceKm: 15, durationText: '30 min', co2Kg: 2.88 },
        { mode: 'Metro', distanceKm: 15, durationText: '20 min', co2Kg: 0.405 }
      ],
      bestOption: { mode: 'Metro', reductionPercent: 86 }
    });

    api.fetchJourneyCoachAdvice.mockResolvedValue({
      coaching_advice: 'Take the metro!'
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByLabelText('Origin Point A')).toBeInTheDocument();
    });

    // Enter details and submit
    fireEvent.change(screen.getByLabelText('Origin Point A'), { target: { value: 'Delhi Airport' } });
    fireEvent.change(screen.getByLabelText('Destination Point B'), { target: { value: 'Connaught Place' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plan Journey' }));

    // Wait for route comparison details to appear
    await waitFor(() => {
      expect(screen.getByText(/Comparing:/)).toBeInTheDocument();
      expect(screen.getByText(/Delhi Airport/)).toBeInTheDocument();
      expect(screen.getByText(/Connaught Place/)).toBeInTheDocument();
      expect(screen.getByText('LOWEST CARBON OPTION')).toBeInTheDocument();
      expect(screen.getAllByText('Metro')[0]).toBeInTheDocument();
      expect(screen.getByText(/Estimated reduction compared with driving:/)).toBeInTheDocument();
      expect(screen.getByText('86%')).toBeInTheDocument();
    });

    // Visual Cards Mode Verification
    expect(screen.getByText('Driving')).toBeInTheDocument();
    expect(screen.getByText('2.88 kg')).toBeInTheDocument();

    // Toggle to Accessible Table View
    fireEvent.click(screen.getByRole('button', { name: 'Accessible Table' }));

    // Check table headers and content
    expect(screen.getByRole('table', { name: 'Journey carbon comparison details' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Travel Mode' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'CO₂ Footprint' })).toBeInTheDocument();
    expect(screen.getByText('0.41 kg')).toBeInTheDocument(); // 0.405 rounded to two decimals inside table td (.toFixed(2))
  });

  test('should prepopulate simulator values and focus simulator section when simulator button is clicked', async () => {
    api.fetchJourneyPlan.mockResolvedValue({
      origin: 'Home',
      destination: 'Office',
      options: [
        { mode: 'Driving', distanceKm: 10, durationText: '20 min', co2Kg: 1.92 },
        { mode: 'Metro', distanceKm: 10, durationText: '15 min', co2Kg: 0.27 }
      ],
      bestOption: { mode: 'Metro', reductionPercent: 86 }
    });
    api.fetchJourneyCoachAdvice.mockResolvedValue({ coaching_advice: '' });

    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = jest.fn();

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByLabelText('Origin Point A')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Origin Point A'), { target: { value: 'Home' } });
    fireEvent.change(screen.getByLabelText('Destination Point B'), { target: { value: 'Office' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plan Journey' }));

    await waitFor(() => {
      expect(screen.getByText('LOWEST CARBON OPTION')).toBeInTheDocument();
    });

    // Find the add simulator button (for the Metro option)
    const addSimBtn = screen.getByRole('button', { name: '➕ Simulator' });
    fireEvent.click(addSimBtn);

    // Verify simulator input values are set to prepopulated journey options
    expect(screen.getByLabelText('Current Transport Method')).toHaveValue('Car');
    expect(screen.getByLabelText('Replacement Method')).toHaveValue('Metro');
    expect(screen.getByLabelText('Trip Distance (km)')).toHaveValue(10);
    expect(screen.getByLabelText('Trips Per Week')).toHaveValue(3);
  });
});
