'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import {
  fetchSession,
  saveLog,
  fetchLogs,
  deleteLog,
  fetchForecast,
  fetchCoaching,
  saveGoal
} from '../../services/api.js';
import styles from '../../styles/Dashboard.module.css';
import { calculateStreak, getBaselineDailyAverage, getEcoGrade } from '../../utils/calculations.js';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [goal, setGoal] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Daily Log modal
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().split('T')[0],
    transport_distance: 0,
    transport_type: 'Car',
    meals: { vegetarian: 0, chicken: 0, beef: 0 },
    electricity_usage: 0,
    shopping_spent: 0
  });

  // Target Goal Set
  const [newTarget, setNewTarget] = useState('');

  // AI coach and forecast
  const [coachAdvice, setCoachAdvice] = useState('');
  const [coachPatterns, setCoachPatterns] = useState([]);
  const [coachLoading, setCoachLoading] = useState(false);
  const [forecastResult, setForecastResult] = useState(null);
  const [streak, setStreak] = useState(0);
  const [aiUsage, setAiUsage] = useState({ totalRequests: 0, sessionRequests: 0 });
  const [aiUsageExpanded, setAiUsageExpanded] = useState(true);

  // Timeframe filter
  const [timeframe, setTimeframe] = useState('monthly'); // Default to monthly summary

  // Load baseline
  useEffect(() => {
    async function init() {
      try {
        const session = await fetchSession();
        setUser(session.user);
        
        if (session.user.profile) {
          setProfile(session.user.profile);
        }
        if (session.user.goal) {
          setGoal(session.user.goal);
          setNewTarget(session.user.goal.monthly_target.toString());
        }

        // Load AI usage from localStorage
        const rawUsage = localStorage.getItem('ecoai_ai_usage');
        if (rawUsage) {
          try {
            setAiUsage(JSON.parse(rawUsage));
          } catch (e) {
            console.error('Error parsing ecoai_ai_usage:', e);
          }
        }

        await refreshData(session.user.id);
      } catch (err) {
        setError(err.message || 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Update streak counter when logs modify
  useEffect(() => {
    if (logs && logs.length > 0) {
      const currentStreak = calculateStreak(logs);
      setStreak(currentStreak);
    }
  }, [logs]);

  async function refreshData(userId) {
    if (!userId) return;
    try {
      const logsList = await fetchLogs(userId);
      setLogs(logsList);

      const forecast = await fetchForecast(userId);
      setForecastResult(forecast);

      triggerCoachAdvice(userId);
    } catch (err) {
      console.error('Error refreshing dashboard logs:', err);
    }
  }

  async function triggerCoachAdvice(userId) {
    setCoachLoading(true);
    try {
      const coach = await fetchCoaching(userId);
      setCoachAdvice(coach.coaching_advice);
      setCoachPatterns(coach.patterns);

      // Increment AI usage counter
      const raw = localStorage.getItem('ecoai_ai_usage');
      let data = { totalRequests: 0, sessionRequests: 0, lastUpdated: '' };
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch (e) {
          console.error(e);
        }
      }
      data.totalRequests = (data.totalRequests || 0) + 1;
      data.sessionRequests = (data.sessionRequests || 0) + 1;
      data.lastUpdated = new Date().toISOString();
      localStorage.setItem('ecoai_ai_usage', JSON.stringify(data));
      setAiUsage(data);

    } catch (err) {
      console.error('AI Coach loading failed:', err);
      setCoachAdvice('AI coach is currently taking a break. Please refresh the page to try again.');
    } finally {
      setCoachLoading(false);
    }
  }

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveLog({
        date: logForm.date,
        transport_distance: parseFloat(logForm.transport_distance),
        transport_type: logForm.transport_type,
        meals: {
          vegetarian: parseInt(logForm.meals.vegetarian),
          chicken: parseInt(logForm.meals.chicken),
          beef: parseInt(logForm.meals.beef)
        },
        electricity_usage: parseFloat(logForm.electricity_usage),
        shopping_spent: parseFloat(logForm.shopping_spent || 0)
      }, user?.id);

      setShowLogModal(false);
      setLogForm({
        date: new Date().toISOString().split('T')[0],
        transport_distance: 0,
        transport_type: 'Car',
        meals: { vegetarian: 0, chicken: 0, beef: 0 },
        electricity_usage: 0,
        shopping_spent: 0
      });
      await refreshData(user?.id);
    } catch (err) {
      alert(err.message || 'Failed to save footprint log');
    }
  };

  const handleGoalSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await saveGoal({
        monthly_target: parseFloat(newTarget)
      }, user?.id);
      setGoal(response.goal);
      await refreshData(user?.id);
    } catch (err) {
      alert(err.message || 'Error updating budget limit');
    }
  };

  const handleDeleteLogClick = async (logId) => {
    if (!confirm('Are you sure you want to delete this log entry?')) return;
    try {
      await deleteLog(logId);
      await refreshData(user?.id);
    } catch (err) {
      alert(err.message || 'Failed to delete log');
    }
  };

  // Filter logs for calculation
  const filteredLogs = logs.filter(log => {
    if (timeframe === 'all') return true;
    const logDate = new Date(log.date);
    const today = new Date();
    const diffTime = Math.abs(today - logDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (timeframe === 'daily') return diffDays <= 1;
    if (timeframe === 'weekly') return diffDays <= 7;
    if (timeframe === 'monthly') return diffDays <= 30;
    return true;
  });

  const currentMonthEmissions = logs.reduce((sum, log) => {
    const logDate = new Date(log.date);
    const today = new Date();
    if (logDate.getMonth() === today.getMonth() && logDate.getFullYear() === today.getFullYear()) {
      return sum + log.total_emission;
    }
    return sum;
  }, 0);

  const totalTransport = filteredLogs.reduce((sum, log) => sum + log.transport_emission, 0);
  const totalFood = filteredLogs.reduce((sum, log) => sum + log.food_emission, 0);
  const totalElectricity = filteredLogs.reduce((sum, log) => sum + log.electricity_emission, 0);
  const totalShopping = filteredLogs.reduce((sum, log) => sum + (log.shopping_emission || 0), 0);
  const totalEmissions = totalTransport + totalFood + totalElectricity + totalShopping;

  const eqKm = totalEmissions / 0.192;
  const eqFlights = totalEmissions / 255;
  const eqTrees = totalEmissions / 21;

  const pieData = [
    { name: 'Transport', value: totalTransport, color: '#3b82f6' },
    { name: 'Food', value: totalFood, color: '#f59e0b' },
    { name: 'Electricity', value: totalElectricity, color: '#ec4899' },
    { name: 'Shopping', value: totalShopping, color: '#a855f7' }
  ].filter(d => d.value > 0);

  // Eco Score computations
  const dailyAverageScore = logs.length > 0
    ? (logs.reduce((sum, log) => sum + log.total_emission, 0) / logs.length)
    : (profile ? getBaselineDailyAverage(profile) : 0);

  let ecoGrade = '–';
  let ecoGradeColor = 'var(--text-muted)';
  let ecoSubtext = 'Log your first activity to get scored';
  let ecoProgressBarPercent = 0;

  if (logs.length > 0 || profile) {
    const { grade, color } = getEcoGrade(dailyAverageScore);
    ecoGrade = grade;
    ecoGradeColor = color;
    const baselineText = logs.length > 0 ? 'avg' : 'onboarding baseline';
    if (dailyAverageScore <= 5.2) {
      const pct = Math.round(((5.2 - dailyAverageScore) / 5.2) * 100);
      ecoSubtext = `${dailyAverageScore.toFixed(1)} kg/day ${baselineText} · Better than ${pct}% of India`;
    } else {
      const pct = Math.round(((dailyAverageScore - 5.2) / 5.2) * 100);
      ecoSubtext = `${dailyAverageScore.toFixed(1)} kg/day ${baselineText} · ${pct}% above India average`;
    }
    ecoProgressBarPercent = Math.min((dailyAverageScore / 8) * 100, 100);
  }

  // Budget calculations
  const monthlyTarget = goal ? goal.monthly_target : 0;
  const budgetUsagePercent = monthlyTarget > 0 ? (currentMonthEmissions / monthlyTarget) * 100 : 0;
  const remainingBudget = monthlyTarget - currentMonthEmissions;
  const aiElectricity = (aiUsage?.totalRequests || 0) * 0.001;
  const aiWater = (aiUsage?.totalRequests || 0) * 0.5;
  const aiCO2 = (aiUsage?.totalRequests || 0) * 0.0004;

  if (loading) {
    return <div className={styles.container}>Loading dashboard summary...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>EcoAI Dashboard</h1>
          <p className={styles.subtitle}>Welcome back, {user?.name || 'Eco Champion'}. Track and minimize your emissions.</p>
        </div>
        <div className={styles.headerActions}>
          {streak > 0 && (
            <div className={`${styles.btn} ${styles.btnSecondary}`} title={`You've logged for ${streak} days in a row!`}>
              🔥 {streak}-day streak
            </div>
          )}
          <button 
            onClick={() => setShowLogModal(true)} 
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            + Log Footprint
          </button>
        </div>
      </header>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', color: 'var(--danger)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Stats Cards Section */}
      <section className={styles.metricsGrid} aria-label="Footprint statistics">
        <div className={styles.card}>
          <h2 className={styles.cardTitle} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            EMISSIONS ({timeframe.toUpperCase()})
          </h2>
          <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '0.5rem', color: 'var(--primary)' }}>
            {totalEmissions.toFixed(2)} <span style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>kg CO2</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button onClick={() => setTimeframe('daily')} className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: timeframe === 'daily' ? 'var(--primary)' : '', color: timeframe === 'daily' ? '#070a0e' : '' }}>Daily</button>
            <button onClick={() => setTimeframe('weekly')} className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: timeframe === 'weekly' ? 'var(--primary)' : '', color: timeframe === 'weekly' ? '#070a0e' : '' }}>Weekly</button>
            <button onClick={() => setTimeframe('monthly')} className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: timeframe === 'monthly' ? 'var(--primary)' : '', color: timeframe === 'monthly' ? '#070a0e' : '' }}>Monthly</button>
          </div>
        </div>

        {/* Eco Score Grade */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            YOUR ECO-GRADE
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '0.5rem' }}>
            <div style={{ fontSize: '4rem', fontWeight: '900', color: ecoGradeColor, lineHeight: '1' }}>
              {ecoGrade}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>Eco-Score</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ecoSubtext}</div>
            </div>
          </div>
        </div>

        {/* Goal Progress Tracker */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            MONTHLY BUDGET TARGET
          </h2>
          <div className={styles.budgetTracker}>
            <form onSubmit={handleGoalSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                id="target-input"
                type="number"
                min="1"
                required
                placeholder="Target budget limit"
                className={styles.formInput}
                style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                value={newTarget}
                onChange={e => setNewTarget(e.target.value)}
                aria-label="Monthly carbon budget target"
              />
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Set</button>
            </form>
            
            {goal ? (
              <>
                <div className={styles.progressBarContainer}>
                  <div 
                    className={styles.progressBar} 
                    style={{ 
                      width: `${Math.min(budgetUsagePercent, 100)}%`, 
                      backgroundColor: budgetProgressBarColor 
                    }}
                    role="progressbar"
                    aria-valuenow={Math.round(budgetUsagePercent)}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label="Monthly carbon budget utilization progress"
                  />
                </div>
                <div className={styles.budgetDetails}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>USED</span>
                    <div className={styles.budgetVal}>{currentMonthEmissions.toFixed(1)} kg</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>LIMIT</span>
                    <div className={styles.budgetVal}>{monthlyTarget} kg</div>
                  </div>
                </div>
              </>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>Set a monthly carbon target limit</p>
            )}
          </div>
        </div>
      </section>

      {/* AI Usage Awareness Section */}
      <section className={styles.card} style={{ marginBottom: '2rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)' }}>
        <button 
          onClick={() => setAiUsageExpanded(!aiUsageExpanded)} 
          style={{ width: '100%', background: 'transparent', border: 'none', color: '#ffffff', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: 0 }}
          aria-expanded={aiUsageExpanded}
          aria-controls="ai-usage-details"
        >
          <h2 className={styles.cardTitle} style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🤖 AI Usage Awareness
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{aiUsageExpanded ? '▲ Collapse' : '▼ Expand'}</span>
        </button>
        
        {aiUsageExpanded && (
          <div id="ai-usage-details" style={{ marginTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              EcoAI tracks the environmental impact of your AI interactions within this app (e.g. AI Coach, Decision Chat, and Receipt OCR).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>ELECTRICITY</span>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.25rem' }}>
                  {aiElectricity.toFixed(3)} kWh
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>WATER</span>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.25rem' }}>
                  {aiWater.toFixed(1)} Litres
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>CO₂</span>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.25rem' }}>
                  {aiCO2.toFixed(4)} kg
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0, borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem' }}>
              Combine multiple questions into one prompt to reduce AI energy use. Batch your carbon analysis sessions when possible.
            </p>
          </div>
        )}
      </section>

      {/* Main Grid Content */}
      <div className={styles.mainGrid}>
        {/* Left Column: Recharts breakdown & AI coach quick tips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Quick breakdown chart */}
          {pieData.length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Emission Breakdown by Category</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2rem', alignItems: 'center', height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toFixed(2)} kg CO2`} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Breakdown Legend List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {pieData.map((d, i) => {
                    const pct = ((d.value / totalEmissions) * 100).toFixed(0);
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: d.color }}></span>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500' }}>{d.name}</span>
                        </div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{d.value.toFixed(1)} kg ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* AI Coach Insights Panel */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>🤖 AI Coach Summary Recommendations</h2>
            <div className={styles.coachBubble}>
              {coachLoading ? (
                <div className={styles.coachAdviceText}>Retrieving personalized sustainability tips...</div>
              ) : coachAdvice ? (
                <div className={styles.coachAdviceText}>
                  <ReactMarkdown>{coachAdvice}</ReactMarkdown>
                </div>
              ) : (
                <div className={styles.coachAdviceText}>Log more carbon activities to fetch AI sustainability analysis advice.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Carbon Twin Quick card & Recent Activity logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Carbon Twin Summary */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>👥 Carbon Twin Summary</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Your Carbon Twin projections are active. Switch to the Carbon Twin screen to view your future projected self narrative.
            </p>
            <Link href="/carbon-twin" className="btn btnSecondary" style={{ width: '100%' }}>
              Open Carbon Twin
            </Link>
          </div>

          {/* Quick Activity Logs */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>📝 Recent Carbon Logs</h3>
            <div className={styles.listScroll}>
              {filteredLogs.length > 0 ? (
                filteredLogs.slice().reverse().map((log) => (
                  <div key={log.id} className={styles.listItem}>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>{log.date}</span>
                      <div style={{ fontSize: '0.95rem', fontWeight: '700', marginTop: '0.15rem' }}>
                        {log.total_emission.toFixed(2)} kg CO2
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        🚗 {log.transport_emission.toFixed(1)} · 🍔 {log.food_emission.toFixed(1)} · ⚡ {log.electricity_emission.toFixed(1)}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleDeleteLogClick(log.id)}
                      className={styles.deleteBtn}
                      title="Delete log entry"
                      aria-label={`Delete log for ${log.date}`}
                    >
                      🗑️
                    </button>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                  No activities logged for this timeframe.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Log Footprint Modal Form Overlay */}
      {showLogModal && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="log-modal-title">
          <div className={styles.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 id="log-modal-title" className={styles.title} style={{ fontSize: '1.5rem', marginBottom: 0 }}>
                Log Daily Carbon Activity
              </h2>
              <button 
                onClick={() => setShowLogModal(false)} 
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '1.25rem' }}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="log-date">Log Date</label>
                  <input
                    id="log-date"
                    type="date"
                    required
                    className={styles.formInput}
                    value={logForm.date}
                    onChange={e => setLogForm({ ...logForm, date: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="log-electricity">Electricity Usage (daily kWh)</label>
                  <input
                    id="log-electricity"
                    type="number"
                    min="0"
                    step="any"
                    required
                    className={styles.formInput}
                    value={logForm.electricity_usage}
                    onChange={e => setLogForm({ ...logForm, electricity_usage: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="log-transport-type">Commute Mode</label>
                  <select
                    id="log-transport-type"
                    className={styles.formSelect}
                    value={logForm.transport_type}
                    onChange={e => setLogForm({ ...logForm, transport_type: e.target.value })}
                  >
                    <option value="Car">Car</option>
                    <option value="Metro">Metro</option>
                    <option value="Bus">Bus</option>
                    <option value="Auto Rickshaw">Auto Rickshaw</option>
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="Bicycle">Bicycle</option>
                    <option value="Walking">Walking</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="log-transport-dist">Travel Distance (km)</label>
                  <input
                    id="log-transport-dist"
                    type="number"
                    min="0"
                    step="any"
                    required
                    className={styles.formInput}
                    value={logForm.transport_distance}
                    onChange={e => setLogForm({ ...logForm, transport_distance: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.75rem' }}>Daily Food Consumption (Meal Counts)</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label className={styles.formLabel} htmlFor="log-meals-veg" style={{ fontSize: '0.75rem' }}>Vegetarian</label>
                    <input
                      id="log-meals-veg"
                      type="number"
                      min="0"
                      className={styles.formInput}
                      value={logForm.meals.vegetarian}
                      onChange={e => setFormMeals('vegetarian', e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label className={styles.formLabel} htmlFor="log-meals-chicken" style={{ fontSize: '0.75rem' }}>Chicken</label>
                    <input
                      id="log-meals-chicken"
                      type="number"
                      min="0"
                      className={styles.formInput}
                      value={logForm.meals.chicken}
                      onChange={e => setFormMeals('chicken', e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label className={styles.formLabel} htmlFor="log-meals-beef" style={{ fontSize: '0.75rem' }}>Beef</label>
                    <input
                      id="log-meals-beef"
                      type="number"
                      min="0"
                      className={styles.formInput}
                      value={logForm.meals.beef}
                      onChange={e => setFormMeals('beef', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '0.75rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="log-shopping">Shopping & Purchases Spent (INR ₹)</label>
                  <input
                    id="log-shopping"
                    type="number"
                    min="0"
                    step="any"
                    className={styles.formInput}
                    placeholder="e.g. 500"
                    value={logForm.shopping_spent}
                    onChange={e => setLogForm({ ...logForm, shopping_spent: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowLogModal(false)} className={styles.btn} style={{ background: 'rgba(255, 255, 255, 0.05)' }}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Save Log Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  function setFormMeals(key, value) {
    const val = parseInt(value) || 0;
    setLogForm(prev => ({
      ...prev,
      meals: {
        ...prev.meals,
        [key]: val
      }
    }));
  }
}
