import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CarbonTwinPage from '../app/carbon-twin/page.js';
import DecisionCoachPage from '../app/decision-coach/page.js';
import ReceiptScannerPage from '../app/receipt-scanner/page.js';
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
    return '/';
  },
}));

// Mock Auth Context
jest.mock('../components/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'u-123', name: 'Eco Activist' },
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
  askDecisionChat: jest.fn(),
  extractReceiptFile: jest.fn(),
  confirmReceiptData: jest.fn(),
  fetchReceiptHistory: jest.fn(),
  fetchTwinData: jest.fn(),
  fetchTwinNarrative: jest.fn()
}));

describe('EcoAI Major Expansion Frontend Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    
    // Default session: user has a profile, so onboarding is bypassed
    api.fetchSession.mockResolvedValue({
      user: {
        id: 'u-123',
        name: 'Eco Activist',
        profile: {
          transport_type: 'Car',
          daily_distance: 10,
          weekly_commute_frequency: 5,
          diet_type: 'Vegetarian',
          meals_per_day: 3,
          household_size: 1,
          electricity_usage: 100,
          ai_usage_frequency: 0,
          video_streaming_usage: 0,
          sustainability_goal: 'reduce_10'
        }
      }
    });

    api.fetchLogs.mockResolvedValue([]);
    api.fetchForecast.mockResolvedValue({
      daily_average: 4.5,
      logged_days_count: 0,
      monthly_forecast_kg: 135,
      yearly_forecast_kg: 1642.5
    });
    api.fetchCoaching.mockResolvedValue({
      coaching_advice: 'Keep up the good work!',
      patterns: []
    });
    api.fetchReceiptHistory.mockResolvedValue([]);
    api.fetchTwinData.mockResolvedValue({
      currentYou: {
        dailyAverage: 4.5,
        monthlyFootprint: 135.0,
        annualFootprint: 1642.5,
        persona: 'Carbon Moderate',
        breakdown: { transport: 60, food: 35, electricity: 40, shopping: 0 }
      },
      futureYou: {
        goalType: 'reduce_10',
        dailyAverage: 4.05,
        monthlyFootprint: 121.5,
        annualFootprint: 1478.25,
        improvementPercent: 10,
        annualSavings: 164.25,
        timeline: '1 month',
        requiredChanges: [
          'Commute by public transport instead of driving.'
        ],
        persona: 'Carbon Moderate'
      }
    });
    api.fetchTwinNarrative.mockResolvedValue({
      narrative: 'Your journey towards a 10% reduction starts today.'
    });
  });

  test('should render Carbon Twin panel and allow selecting sustainability goals', async () => {
    render(<CarbonTwinPage />);

    // Verify Carbon Twin renders
    await waitFor(() => {
      expect(screen.getByText('Your Carbon Twin')).toBeInTheDocument();
      expect(screen.getByText('CURRENT YOU')).toBeInTheDocument();
      expect(screen.getByText('FUTURE OPTIMIZED TWIN')).toBeInTheDocument();
      expect(screen.getByText('1643 kg CO2')).toBeInTheDocument(); // 1642.5 rounded
      expect(screen.getByText('1 month')).toBeInTheDocument();
      expect(screen.getAllByText('Carbon Moderate')[0]).toBeInTheDocument();
      expect(screen.getByText('Your journey towards a 10% reduction starts today.')).toBeInTheDocument();
    });

    // Test goal change dropdown selection
    api.submitAuditForm.mockResolvedValue({
      profile: {
        name: 'Eco Activist',
        transport_type: 'Car',
        daily_distance: 10,
        weekly_commute_frequency: 5,
        diet_type: 'Vegetarian',
        meals_per_day: 3,
        household_size: 1,
        electricity_usage: 100,
        ai_usage_frequency: 0,
        video_streaming_usage: 0,
        sustainability_goal: 'reduce_20'
      }
    });

    const goalSelect = screen.getByLabelText('Target Sustainability Goal');
    fireEvent.change(goalSelect, { target: { value: 'reduce_20' } });

    await waitFor(() => {
      expect(api.submitAuditForm).toHaveBeenCalled();
    });
  });

  test('should interactive chat inside Decision Engine widget', async () => {
    api.askDecisionChat.mockResolvedValue({
      advice: 'Taking the Metro saves 85% compared to driving a Car for 10km.',
      calculated: true
    });

    render(<DecisionCoachPage />);

    await waitFor(() => {
      expect(screen.getByText('🧠 Decision Coach Chat')).toBeInTheDocument();
    });

    const queryInput = screen.getByLabelText('Ask carbon advice');
    const submitBtn = screen.getByRole('button', { name: 'Ask' });

    fireEvent.change(queryInput, { target: { value: 'Car vs Metro 10km' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.askDecisionChat).toHaveBeenCalledWith('Car vs Metro 10km');
      expect(screen.getByText('Taking the Metro saves 85% compared to driving a Car for 10km.')).toBeInTheDocument();
      expect(screen.getByText(/Deterministic math calculated by EcoAI engine/)).toBeInTheDocument();
    });
  });

  test('should scan receipt and trigger human review modal confirmation', async () => {
    // Mock FileReader globally for this test to bypass JSDOM asynchronous file reading
    const mockReader = {
      readAsDataURL: jest.fn(function() {
        this.result = 'data:application/pdf;base64,mockbase64content';
        if (this.onload) this.onload();
      })
    };
    window.FileReader = jest.fn(() => mockReader);
    global.FileReader = jest.fn(() => mockReader);

    api.extractReceiptFile.mockResolvedValue({
      receiptId: 'r-999',
      extracted: {
        date: '2026-06-20',
        distance: 15.5,
        cost: 250,
        transport_type: 'Car',
        electricity_kwh: null
      }
    });

    api.confirmReceiptData.mockResolvedValue({ success: true });

    render(<ReceiptScannerPage />);

    await waitFor(() => {
      expect(screen.getByText('AI Carbon Receipt Scanner')).toBeInTheDocument();
    });

    // Mock file input change
    const file = new File(['dummy content'], 'ticket.pdf');
    Object.defineProperty(file, 'type', { value: 'application/pdf', configurable: true });
    Object.defineProperty(file, 'size', { value: 100, configurable: true });
    const fileInput = screen.getByLabelText('Upload utility bill or travel taxi receipt file');
    
    // Assign files directly to DOM element for React compatibility in JSDOM
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: true
    });
    fireEvent.change(fileInput);

    // Wait for OCR extract and review modal to open
    await waitFor(() => {
      const errorElement = screen.queryByText(/⚠️/);
      if (errorElement) {
        console.log("DEBUG: Receipt upload failed with error:", errorElement.textContent);
      }
      expect(screen.getByText('Human Verification Review')).toBeInTheDocument();
      expect(screen.getByLabelText('Extracted Date')).toHaveValue('2026-06-20');
      expect(screen.getByLabelText('Taxi Distance (km)')).toHaveValue(15.5);
      expect(screen.getByLabelText('Transaction Cost (INR ₹)')).toHaveValue(250);
    });

    // Make corrections and submit review
    fireEvent.change(screen.getByLabelText('Taxi Distance (km)'), { target: { value: '18.0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate & Log Footprint' }));

    await waitFor(() => {
      expect(api.confirmReceiptData).toHaveBeenCalledWith({
        receiptId: 'r-999',
        date: '2026-06-20',
        distance: 18.0,
        cost: 250,
        transport_type: 'Car',
        electricity_kwh: null
      }, 'u-123');
    });
  });
});
