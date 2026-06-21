'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { fetchSession, fetchTwinData, fetchTwinNarrative, submitAuditForm } from '../../services/api';
import styles from '../../styles/Dashboard.module.css';

export default function CarbonTwinPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [twinData, setTwinData] = useState(null);
  const [twinNarrative, setTwinNarrative] = useState('');
  const [twinNarrativeLoading, setTwinNarrativeLoading] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState('reduce_10');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const session = await fetchSession();
        setUser(session.user);
        
        if (session.user.profile) {
          setProfile(session.user.profile);
          setSelectedGoal(session.user.profile.sustainability_goal || 'reduce_10');
        }

        await refreshTwin(session.user.id, session.user.profile?.sustainability_goal || 'reduce_10');
      } catch (err) {
        setError(err.message || 'Failed to retrieve twin data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function refreshTwin(userId, goalType) {
    try {
      const data = await fetchTwinData(userId);
      setTwinData(data);
      if (data && data.currentYou && data.futureYou) {
        // Trigger AI narrative
        setTwinNarrativeLoading(true);
        const narrativeResp = await fetchTwinNarrative(data.currentYou, data.futureYou, goalType);
        setTwinNarrative(narrativeResp.narrative);
      }
    } catch (err) {
      console.error('Error refreshing twin models:', err);
      setTwinNarrative('Error generating narrative. Projections remain fully calculated.');
    } finally {
      setTwinNarrativeLoading(false);
    }
  }

  const handleGoalChange = async (e) => {
    const goalType = e.target.value;
    setSelectedGoal(goalType);
    if (!profile) return;

    setTwinNarrativeLoading(true);
    try {
      // 1. Save new goal in profile
      const response = await submitAuditForm({
        name: user?.name || 'Eco Advocate',
        transport_type: profile.transport_type,
        daily_distance: profile.daily_distance,
        weekly_commute_frequency: profile.weekly_commute_frequency,
        diet_type: profile.diet_type,
        meals_per_day: profile.meals_per_day,
        household_size: profile.household_size,
        electricity_usage: profile.electricity_usage,
        ai_usage_frequency: profile.ai_usage_frequency,
        video_streaming_usage: profile.video_streaming_usage,
        sustainability_goal: goalType
      }, user?.id);

      setProfile(response.profile);
      await refreshTwin(user?.id, goalType);
    } catch (err) {
      alert('Failed to update simulation goal: ' + err.message);
      setTwinNarrativeLoading(false);
    }
  };

  if (loading) return <div className={styles.container}>Loading Carbon Twin metrics...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Your Carbon Twin</h1>
          <p className={styles.subtitle}>Simulate lifestyle goals and visualize your future eco-optimized self.</p>
        </div>
      </header>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', color: 'var(--danger)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Goal Simulation Form Card */}
      <section className={styles.card} style={{ marginBottom: '2rem' }}>
        <h2 className={styles.cardTitle}>Goal Planning Simulation</h2>
        <div className={styles.formGroup} style={{ maxWidth: '380px' }}>
          <label className={styles.formLabel} htmlFor="simulation-goal">Target Sustainability Goal</label>
          <select
            id="simulation-goal"
            className={styles.formSelect}
            value={selectedGoal}
            onChange={handleGoalChange}
            disabled={twinNarrativeLoading}
          >
            <option value="reduce_10">Reduce emissions by 10% (Eco Conscious)</option>
            <option value="reduce_20">Reduce emissions by 20% (Carbon Fighter)</option>
            <option value="eco_optimizer">Reach Eco Optimizer (2.0 kg/day limit)</option>
            <option value="low_impact">Reach Low Impact Lifestyle (1.5 kg/day limit)</option>
          </select>
        </div>
      </section>

      {twinData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Twin Columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Column A: Current You */}
            <div className={styles.card} style={{ borderLeft: '4px solid var(--text-secondary)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>CURRENT YOU</span>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '0.25rem', color: '#ffffff' }}>
                {twinData.currentYou.persona}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DAILY AVERAGE LOGS</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {twinData.currentYou.dailyAverage.toFixed(2)} kg
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ESTIMATED MONTHLY EMISSIONS</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {twinData.currentYou.monthlyFootprint.toFixed(1)} kg CO2
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ANNUAL TOTAL FOOTPRINT</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {twinData.currentYou.annualFootprint.toFixed(0)} kg CO2
                  </div>
                </div>
              </div>
            </div>

            {/* Column B: Future You */}
            <div className={styles.card} style={{ borderLeft: '4px solid var(--primary)', background: 'rgba(16, 185, 129, 0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)', letterSpacing: '0.05em' }}>FUTURE OPTIMIZED TWIN</span>
                <span style={{ fontSize: '0.75rem', background: 'var(--primary)', color: '#070a0e', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: '700' }}>
                  -{twinData.futureYou.improvementPercent}% CARBON
                </span>
              </div>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '0.25rem', color: 'var(--primary)' }}>
                {twinData.futureYou.persona}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PROJECTED MONTHLY EMISSIONS</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)', marginTop: '0.15rem' }}>
                    {twinData.futureYou.monthlyFootprint.toFixed(1)} kg CO2
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ESTIMATED RESOLUTION TIMELINE</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {twinData.futureYou.timeline}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>REQUIRED LIFESTYLE ADJUSTMENTS</span>
                  <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {twinData.futureYou.requiredChanges.map((change, i) => (
                      <li key={i}>{change}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* AI Narrative Section */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>🔮 Future Lifestyle Narrative</h3>
            <div className={styles.coachBubble}>
              {twinNarrativeLoading ? (
                <div className={styles.coachAdviceText}>Simulating your future green lifestyle narrative...</div>
              ) : twinNarrative ? (
                <div className={styles.coachAdviceText}>
                  <ReactMarkdown>{twinNarrative}</ReactMarkdown>
                </div>
              ) : (
                <div className={styles.coachAdviceText}>Select a target goal above to generate your Future Twin narrative details.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
