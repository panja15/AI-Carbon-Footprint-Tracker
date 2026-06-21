'use client';

import { useState, useEffect } from 'react';
import {
  fetchSession,
  askDecisionChat,
  fetchJourneyPlan,
  saveJourneyHistory,
  fetchJourneyHistory,
  fetchJourneyCoachAdvice,
  fetchWhatIfSimulation
} from '../../services/api';
import styles from '../../styles/Dashboard.module.css';

export default function DecisionCoachPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Decision Chat State
  const [decisionInput, setDecisionInput] = useState('');
  const [decisionChatHistory, setDecisionChatHistory] = useState([]);
  const [decisionLoading, setDecisionLoading] = useState(false);

  // 2. Journey Planner State
  const [journeyForm, setJourneyForm] = useState({ origin: '', destination: '' });
  const [journeyResult, setJourneyResult] = useState(null);
  const [journeyCoachAdvice, setJourneyCoachAdvice] = useState('');
  const [journeyCoachLoading, setJourneyCoachLoading] = useState(false);
  const [journeyHistory, setJourneyHistory] = useState([]);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [journeyError, setJourneyError] = useState('');
  const [journeyViewMode, setJourneyViewMode] = useState('visual');

  // 3. What-If Simulator State
  const [whatIfForm, setWhatIfForm] = useState({
    currentType: 'Car',
    replacementType: 'Metro',
    distance: 10,
    frequency: 3
  });
  const [whatIfResult, setWhatIfResult] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const session = await fetchSession();
        setUser(session.user);
        
        const jHistory = await fetchJourneyHistory(session.user.id);
        setJourneyHistory(jHistory);
      } catch (err) {
        setError(err.message || 'Failed to retrieve user session.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Handle Decision Chat Submit
  const handleDecisionChatSubmit = async (e) => {
    e.preventDefault();
    if (!decisionInput.trim()) return;

    const userQuestion = decisionInput.trim();
    setDecisionChatHistory((prev) => [...prev, { sender: 'user', text: userQuestion }]);
    setDecisionInput('');
    setDecisionLoading(true);

    try {
      const response = await askDecisionChat(userQuestion);
      setDecisionChatHistory((prev) => [
        ...prev,
        { sender: 'bot', text: response.advice, calculated: response.calculated }
      ]);
    } catch (err) {
      console.error('Decision chat error:', err);
      setDecisionChatHistory((prev) => [
        ...prev,
        { sender: 'bot', text: `Sorry, I couldn't evaluate your decision comparison: ${err.message}` }
      ]);
    } finally {
      setDecisionLoading(false);
    }
  };

  // Handle Journey Planner Search
  const handleJourneySearch = async (e) => {
    e.preventDefault();
    setJourneyError('');
    setJourneyLoading(true);
    setJourneyResult(null);
    setJourneyCoachAdvice('');

    try {
      const result = await fetchJourneyPlan(journeyForm.origin, journeyForm.destination);
      setJourneyResult(result);
      
      // Trigger journey advice
      setJourneyCoachLoading(true);
      const advice = await fetchJourneyCoachAdvice(result);
      setJourneyCoachAdvice(advice.coaching_advice);
    } catch (err) {
      setJourneyError(err.message || 'Failed to search journey routes.');
    } finally {
      setJourneyLoading(false);
      setJourneyCoachLoading(false);
    }
  };

  const handleSelectJourneyOption = async (opt) => {
    if (!journeyResult) return;
    try {
      const payload = {
        origin: journeyResult.origin,
        destination: journeyResult.destination,
        distanceKm: opt.distanceKm,
        selectedMode: opt.mode,
        estimatedEmission: opt.co2Kg !== null ? opt.co2Kg : 0
      };
      await saveJourneyHistory(payload, user?.id);
      alert(`Journey successfully logged to history! Selected mode: ${opt.mode}`);
      const jHistory = await fetchJourneyHistory(user?.id);
      setJourneyHistory(jHistory);
    } catch (err) {
      alert(err.message || 'Error saving journey history.');
    }
  };

  const handleAddToSimulator = (opt) => {
    const modeMap = {
      'Driving': 'Car',
      'Metro': 'Metro',
      'Bus': 'Bus',
      'Cycling': 'Bicycle',
      'Walking': 'Walking'
    };

    const replacement = modeMap[opt.mode] || 'Metro';
    setWhatIfForm({
      currentType: 'Car',
      replacementType: replacement,
      distance: opt.distanceKm.toString(),
      frequency: '3'
    });

    const simSection = document.getElementById('sim-section');
    if (simSection) {
      simSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle What-If simulation
  const handleWhatIfSubmit = async (e) => {
    e.preventDefault();
    try {
      const simulation = await fetchWhatIfSimulation(
        whatIfForm.currentType,
        whatIfForm.replacementType,
        parseFloat(whatIfForm.distance),
        parseFloat(whatIfForm.frequency)
      );
      setWhatIfResult(simulation);
    } catch (err) {
      alert(err.message || 'Error running What-If scenario');
    }
  };

  if (loading) return <div className={styles.container}>Loading Decision Coach...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>AI Decision Coach</h1>
          <p className={styles.subtitle}>Run what-if lifestyle projections and compare travel routes footprints.</p>
        </div>
      </header>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', color: 'var(--danger)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* 1. Google Maps Journey Carbon Planner Section */}
          <section className={styles.card} aria-labelledby="journey-planner-title">
            <h2 id="journey-planner-title" className={styles.cardTitle}>
              🗺️ Google Maps Journey Carbon Planner
            </h2>
            <form onSubmit={handleJourneySearch} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end', marginBottom: '1.5rem' }}>
              <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                <label className={styles.formLabel} htmlFor="journey-origin">Origin Point A</label>
                <input
                  id="journey-origin"
                  type="text"
                  required
                  placeholder="e.g. Delhi Airport"
                  className={styles.formInput}
                  value={journeyForm.origin}
                  onChange={e => setJourneyForm({ ...journeyForm, origin: e.target.value })}
                />
              </div>
              <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                <label className={styles.formLabel} htmlFor="journey-dest">Destination Point B</label>
                <input
                  id="journey-dest"
                  type="text"
                  required
                  placeholder="e.g. Connaught Place"
                  className={styles.formInput}
                  value={journeyForm.destination}
                  onChange={e => setJourneyForm({ ...journeyForm, destination: e.target.value })}
                />
              </div>
              <button type="submit" disabled={journeyLoading} className={`${styles.btn} ${styles.btnPrimary}`} style={{ height: '38px' }}>
                {journeyLoading ? 'Planning...' : 'Plan Journey'}
              </button>
            </form>

            {journeyError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', color: 'var(--danger)', fontSize: '0.85rem' }}>
                ⚠️ {journeyError}
              </div>
            )}

            {journeyResult && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>
                    Comparing: {journeyResult.origin} to {journeyResult.destination}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setJourneyViewMode('visual')}
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: journeyViewMode === 'visual' ? 'var(--primary)' : '', color: journeyViewMode === 'visual' ? '#070a0e' : '' }}
                      aria-pressed={journeyViewMode === 'visual'}
                    >
                      Visual Cards
                    </button>
                    <button
                      type="button"
                      onClick={() => setJourneyViewMode('table')}
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: journeyViewMode === 'table' ? 'var(--primary)' : '', color: journeyViewMode === 'table' ? '#070a0e' : '' }}
                      aria-pressed={journeyViewMode === 'table'}
                    >
                      Accessible Table
                    </button>
                  </div>
                </div>

                {journeyResult.bestOption && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--primary)', letterSpacing: '0.05em' }}>LOWEST CARBON OPTION</span>
                    <div style={{ fontSize: '1.3rem', fontWeight: '800', marginTop: '0.25rem', color: '#ffffff' }}>
                      {journeyResult.bestOption.mode}
                    </div>
                    {journeyResult.bestOption.reductionPercent > 0 && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        Estimated reduction compared with driving: <strong>{journeyResult.bestOption.reductionPercent}%</strong>
                      </p>
                    )}
                  </div>
                )}

                {journeyViewMode === 'visual' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    {journeyResult.options.map((opt, idx) => (
                      <div key={idx} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{opt.mode}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <div>📏 {opt.distanceKm} km · ⏱️ {opt.durationText}</div>
                          </div>
                        </div>
                        
                        <div>
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ESTIMATED CO₂</span>
                            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: opt.co2Kg !== null ? 'var(--primary)' : 'var(--text-muted)' }}>
                              {opt.co2Kg !== null ? `${opt.co2Kg.toFixed(2)} kg` : 'Unavailable'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {opt.mode !== 'Driving' && opt.co2Kg !== null && (
                              <button
                                type="button"
                                onClick={() => handleAddToSimulator(opt)}
                                className={`${styles.btn} ${styles.btnSecondary}`}
                                style={{ padding: '0.3rem', fontSize: '0.7rem', flex: 1 }}
                              >
                                ➕ Simulator
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSelectJourneyOption(opt)}
                              className={`${styles.btn} ${styles.btnPrimary}`}
                              style={{ padding: '0.3rem', fontSize: '0.7rem', flex: 1 }}
                            >
                              Select
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                    <table className={styles.tableAlternative} aria-label="Journey carbon comparison details">
                      <thead>
                        <tr>
                          <th scope="col">Travel Mode</th>
                          <th scope="col">Distance (km)</th>
                          <th scope="col">Duration</th>
                          <th scope="col">CO₂ Footprint</th>
                          <th scope="col">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {journeyResult.options.map((opt, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: '600' }}>{opt.mode}</td>
                            <td>{opt.distanceKm} km</td>
                            <td>{opt.durationText}</td>
                            <td style={{ fontWeight: '700', color: opt.co2Kg !== null ? 'var(--primary)' : 'var(--text-muted)' }}>
                              {opt.co2Kg !== null ? `${opt.co2Kg.toFixed(2)} kg` : 'Unavailable'}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                {opt.mode !== 'Driving' && opt.co2Kg !== null && (
                                  <button
                                    type="button"
                                    onClick={() => handleAddToSimulator(opt)}
                                    className={`${styles.btn} ${styles.btnSecondary}`}
                                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                                  >
                                    Add to Simulator
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleSelectJourneyOption(opt)}
                                  className={`${styles.btn} ${styles.btnPrimary}`}
                                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                                >
                                  Select
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 2. What-If Scenario Simulator Section */}
          <section id="sim-section" className={styles.card} aria-labelledby="simulator-title">
            <h2 id="simulator-title" className={styles.cardTitle}>
              🚗 What-If Lifestyle Simulator
            </h2>
            <form onSubmit={handleWhatIfSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: '1rem', alignItems: 'end' }}>
              <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                <label className={styles.formLabel} htmlFor="sim-current">Current Transport Method</label>
                <select
                  id="sim-current"
                  className={styles.formSelect}
                  value={whatIfForm.currentType}
                  onChange={e => setWhatIfForm({ ...whatIfForm, currentType: e.target.value })}
                >
                  <option value="Car">Car</option>
                  <option value="Metro">Metro</option>
                  <option value="Bus">Bus</option>
                  <option value="Auto Rickshaw">Auto Rickshaw</option>
                  <option value="Motorcycle">Motorcycle</option>
                </select>
              </div>

              <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                <label className={styles.formLabel} htmlFor="sim-replace">Replacement Method</label>
                <select
                  id="sim-replace"
                  className={styles.formSelect}
                  value={whatIfForm.replacementType}
                  onChange={e => setWhatIfForm({ ...whatIfForm, replacementType: e.target.value })}
                >
                  <option value="Metro">Metro</option>
                  <option value="Bus">Bus</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="Walking">Walking</option>
                  <option value="Car">Car</option>
                </select>
              </div>

              <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                <label className={styles.formLabel} htmlFor="sim-dist">Trip Distance (km)</label>
                <input
                  id="sim-dist"
                  type="number"
                  min="1"
                  required
                  className={styles.formInput}
                  value={whatIfForm.distance}
                  onChange={e => setWhatIfForm({ ...whatIfForm, distance: e.target.value })}
                />
              </div>

              <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                <label className={styles.formLabel} htmlFor="sim-freq">Trips Per Week</label>
                <input
                  id="sim-freq"
                  type="number"
                  min="1"
                  max="14"
                  required
                  className={styles.formInput}
                  value={whatIfForm.frequency}
                  onChange={e => setWhatIfForm({ ...whatIfForm, frequency: e.target.value })}
                />
              </div>

              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ height: '38px' }}>
                Simulate
              </button>
            </form>

            {whatIfResult && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>WEEKLY SAVINGS</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--primary)', marginTop: '0.15rem' }}>
                    {((whatIfResult.monthly_reduction_kg / 4)).toFixed(1)} kg
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MONTHLY SAVINGS</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--primary)', marginTop: '0.15rem' }}>
                    {whatIfResult.monthly_reduction_kg.toFixed(1)} kg
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>YEARLY SAVINGS</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--primary)', marginTop: '0.15rem' }}>
                    {whatIfResult.yearly_reduction_kg.toFixed(0)} kg
                  </div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>TREES EQUIVALENT</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--primary)', marginTop: '0.15rem' }}>
                    {(whatIfResult.yearly_reduction_kg / 21).toFixed(1)} trees
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* 3. Right Column: Decision Engine Chat */}
        <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h2 className={styles.cardTitle}>🧠 Decision Coach Chat</h2>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '1rem', maxHeight: '480px' }} aria-label="Decision coach chat messages log">
            {decisionChatHistory.map((m, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div 
                  style={{ 
                    maxWidth: '85%', 
                    padding: '0.75rem 0.95rem', 
                    borderRadius: '14px', 
                    fontSize: '0.9rem',
                    lineHeight: '1.4',
                    background: m.sender === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                    color: m.sender === 'user' ? '#070a0e' : '#ffffff',
                    border: m.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                    textAlign: 'left'
                  }}
                >
                  {m.text}
                </div>
                {m.sender === 'bot' && m.calculated && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', marginTop: '0.5rem', width: '100%', fontSize: '0.8rem', textAlign: 'left' }}>
                    <strong>Deterministic math calculated by EcoAI engine</strong>
                  </div>
                )}
              </div>
            ))}
            {decisionLoading && (
              <div style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Evaluating options...</div>
            )}
          </div>
          <form onSubmit={handleDecisionChatSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <label htmlFor="decision-coach-input" className="sr-only">Ask carbon advice</label>
            <input
              id="decision-coach-input"
              type="text"
              required
              disabled={decisionLoading}
              placeholder="e.g. Car vs Metro for 10km"
              className={styles.formInput}
              value={decisionInput}
              onChange={e => setDecisionInput(e.target.value)}
            />
            <button type="submit" disabled={decisionLoading} className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: '0 1rem' }}>
              Ask
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
