import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from '../app/dashboard/page.js';
import OnboardingPage from '../app/onboarding/page.js';
import Navigation from '../components/Navigation.js';
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
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  usePathname() {
    return '/dashboard';
  },
}));

// Mock Auth Context
let mockUser = null;
const mockSignOut = jest.fn();
jest.mock('../components/AuthProvider', () => ({
  useAuth: () => ({
    user: mockUser,
    session: mockUser ? { access_token: 'mock-token' } : null,
    loading: false,
    signOut: mockSignOut,
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

describe('Dashboard and Onboarding Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = null;
  });

  test('should render loading page initially', () => {
    api.fetchSession.mockImplementation(() => new Promise(() => {})); // never resolves
    render(<Dashboard />);
    expect(screen.getByText('Loading dashboard summary...')).toBeInTheDocument();
  });

  test('should show onboarding questionnaire steps', async () => {
    mockUser = { id: 'u-1', name: 'Test Champion', profile: null };

    render(<OnboardingPage />);

    // Step 1: Welcome to EcoAI
    expect(screen.getByText('Welcome to EcoAI')).toBeInTheDocument();
    const startBtn = screen.getByRole('button', { name: 'Get Started' });
    fireEvent.click(startBtn);

    // Step 2: Choose Setup Method
    await waitFor(() => {
      expect(screen.getByText('Choose Baseline Setup Method')).toBeInTheDocument();
    });

    const formCard = screen.getByRole('radio', { name: /Traditional Form/ });
    fireEvent.click(formCard);

    const continueBtn = screen.getByRole('button', { name: 'Continue' });
    fireEvent.click(continueBtn);

    // Step 3: Baseline Sustainability Audit
    await waitFor(() => {
      expect(screen.getByText('Baseline Sustainability Audit')).toBeInTheDocument();
      expect(screen.getByLabelText('Your Display Name')).toBeInTheDocument();
    });
  });

  test('should submit onboarding profile questionnaire and complete onboarding steps', async () => {
    mockUser = { id: 'u-1', name: 'Test Champion', profile: null };

    api.submitAuditForm.mockResolvedValue({
      profile: {
        name: 'Eco Warrior',
        transport_type: 'Car',
        daily_distance: 10,
        weekly_commute_frequency: 5,
        diet_type: 'Vegetarian',
        meals_per_day: 3,
        household_size: 2,
        electricity_usage: 120,
        ai_usage_frequency: 5,
        video_streaming_usage: 2
      },
      baseline: {
        total_emission: 150.0,
        transport_emission: 60.0,
        food_emission: 40.0,
        electricity_emission: 50.0
      }
    });

    api.saveGoal.mockResolvedValue({
      goal: { monthly_target: 135.0 }
    });

    render(<OnboardingPage />);

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));

    // Step 2 -> Step 3
    await waitFor(() => {
      fireEvent.click(screen.getByRole('radio', { name: /Traditional Form/ }));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // Step 3: Form Fill & Submit
    await waitFor(() => {
      expect(screen.getByLabelText('Your Display Name')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Your Display Name'), { target: { value: 'Eco Warrior' } });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Baseline' }));

    await waitFor(() => {
      expect(api.submitAuditForm).toHaveBeenCalledWith({
        name: 'Eco Warrior',
        transport_type: 'Car',
        daily_distance: 10,
        weekly_commute_frequency: 5,
        diet_type: 'Vegetarian',
        meals_per_day: 3,
        household_size: 2,
        electricity_usage: 120,
        ai_usage_frequency: 5,
        video_streaming_usage: 2,
        sustainability_goal: 'reduce_10'
      }, 'u-1');
    });

    // Step 4: Goals Selection
    await waitFor(() => {
      expect(screen.getByText('Select Sustainability Target')).toBeInTheDocument();
    });

    // Select Carbon Fighter (20% reduction)
    fireEvent.click(screen.getByRole('radio', { name: /Carbon Fighter/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Goal' }));

    // Step 5: Initial Baseline Report
    await waitFor(() => {
      expect(screen.getByText('Your Sustainability Baseline')).toBeInTheDocument();
      expect(screen.getByText('150.0 kg')).toBeInTheDocument();
    });

    // Finish
    fireEvent.click(screen.getByRole('button', { name: 'Go to Dashboard' }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  test('should toggle high contrast mode in Navigation component', async () => {
    mockUser = { id: 'u-1', name: 'Test Champion', email: 'test@example.com', profile: {} };

    render(<Navigation />);

    const contrastBtn = screen.getByRole('button', { name: /Toggle High Contrast/ });
    expect(contrastBtn).toHaveTextContent('High Contrast');

    fireEvent.click(contrastBtn);
    expect(contrastBtn).toHaveTextContent('Normal Contrast');

    fireEvent.click(contrastBtn);
    expect(contrastBtn).toHaveTextContent('High Contrast');
  });
});
