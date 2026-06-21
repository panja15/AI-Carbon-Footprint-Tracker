'use client';

import { useState, useEffect } from 'react';
import { fetchSession, fetchLogs, saveGoal } from '../../services/api';
import styles from '../../styles/Dashboard.module.css';
import { calculateStreak } from '../../utils/calculations';

export default function GoalsPage() {
  const [user, setUser] = useState(null);
  const [goal, setGoal] = useState(null);
  const [logs, setLogs] = useState([]);
  const [newTarget, setNewTarget] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        const session = await fetchSession();
        setUser(session.user);
        
        if (session.user.goal) {
          setGoal(session.user.goal);
          setNewTarget(session.user.goal.monthly_target.toString());
        }

        const logsList = await fetchLogs(session.user.id);
        setLogs(logsList);
        if (logsList.length > 0) {
          setStreak(calculateStreak(logsList));
        }
      } catch (err) {
        setError(err.message || 'Failed to retrieve goals data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleGoalSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await saveGoal({
        monthly_target: parseFloat(newTarget)
      }, user?.id);
      setGoal(response.goal);
      alert('Monthly carbon budget target updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to save carbon budget limit.');
    }
  };

  // Filter logs for this month's emissions
  const currentMonthEmissions = logs.reduce((sum, log) => {
    const logDate = new Date(log.date);
    const today = new Date();
    if (logDate.getMonth() === today.getMonth() && logDate.getFullYear() === today.getFullYear()) {
      return sum + log.total_emission;
    }
    return sum;
  }, 0);

  const monthlyTarget = goal ? goal.monthly_target : 0;
  const budgetUsagePercent = monthlyTarget > 0 ? (currentMonthEmissions / monthlyTarget) * 100 : 0;
  const remainingBudget = monthlyTarget - currentMonthEmissions;
  
  const budgetProgressBarColor = budgetUsagePercent > 100 ? '#ef4444' : budgetUsagePercent > 80 ? '#f59e0b' : '#10b981';

  // Streak Milestone Milestones Badges List
  const milestones = [
    { title: '🌱 Day One Done!', desc: 'Log your first carbon activity', target: 1 },
    { title: '🌱 Great Start!', desc: 'Reach a 3-day activity log streak', target: 3 },
    { title: '⭐ One Week!', desc: 'Reach a 7-day activity log streak', target: 7 },
    { title: '🔥 Two Weeks!', desc: 'Reach a 14-day activity log streak', target: 14 },
    { title: '🏆 Eco Champion!', desc: 'Reach a 30-day activity log streak', target: 30 }
  ];

  if (loading) return <div className={styles.container}>Loading Goals...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Carbon Budgets & Goals</h1>
          <p className={styles.subtitle}>Track your monthly carbon limits and unlock streak achievements.</p>
        </div>
      </header>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', color: 'var(--danger)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        {/* Carbon Budget Settings and Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Set Carbon Budget</h2>
            <form onSubmit={handleGoalSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'end', marginBottom: '2rem' }}>
              <div className={styles.formGroup} style={{ flexGrow: 1, marginBottom: 0 }}>
                <label className={styles.formLabel} htmlFor="monthly-target-limit">Monthly Limit (kg CO2)</label>
                <input
                  id="monthly-target-limit"
                  type="number"
                  min="1"
                  required
                  className={styles.formInput}
                  value={newTarget}
                  onChange={e => setNewTarget(e.target.value)}
                  placeholder="e.g. 150"
                />
              </div>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ height: '38px' }}>
                Save target
              </button>
            </form>

            {goal ? (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: '600' }}>Monthly Budget Utilization</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: '700', color: budgetProgressBarColor }}>
                    {currentMonthEmissions.toFixed(1)} / {monthlyTarget} kg CO2 ({Math.round(budgetUsagePercent)}%)
                  </span>
                </div>
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
                    aria-label="Carbon target budget progress utilization"
                  />
                </div>

                <div className={styles.budgetDetails} style={{ marginTop: '1.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>REMAINING LIMIT</span>
                    <div className={styles.budgetVal} style={{ color: remainingBudget < 0 ? 'var(--danger)' : 'var(--success)', fontSize: '1.5rem' }}>
                      {remainingBudget.toFixed(1)} kg
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>STATUS STATE</span>
                    <div className={styles.budgetVal} style={{ color: budgetProgressBarColor, fontSize: '1.5rem' }}>
                      {budgetUsagePercent > 100 ? 'LIMIT EXCEEDED' : budgetUsagePercent > 80 ? 'WARNING STATE' : 'SAFE BUDGET'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
                You haven't set a budget goal limit yet. Establish one to visualize carbon targets.
              </p>
            )}
          </div>
        </div>

        {/* Milestones Achievements */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>🏆 Unlocked Streak Milestones</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {milestones.map((milestone, idx) => {
              const isUnlocked = streak >= milestone.target;
              return (
                <div 
                  key={idx} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    background: isUnlocked ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.01)', 
                    border: '1px solid',
                    borderColor: isUnlocked ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-color)',
                    padding: '1rem', 
                    borderRadius: '12px',
                    opacity: isUnlocked ? 1 : 0.55
                  }}
                >
                  <div style={{ fontSize: '2rem' }}>
                    {isUnlocked ? '🏅' : '🔒'}
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.95rem', color: isUnlocked ? '#ffffff' : 'var(--text-secondary)' }}>
                      {milestone.title}
                    </strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {milestone.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
