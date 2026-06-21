'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchSession, submitAuditChat, submitAuditForm } from '../../services/api';
import styles from '../../styles/Dashboard.module.css';

export default function AuditPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Mode Selection
  const [auditMode, setAuditMode] = useState('chat'); // 'chat' or 'form'
  
  // Conversational state
  const [chatHistory, setChatHistory] = useState([
    { sender: 'bot', text: "Hi, I'm EcoAI. I'll help estimate your sustainability footprint through a quick conversation. First, what is your display name?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Form Questionnaire state
  const [formValues, setFormValues] = useState({
    name: '',
    transport_type: 'Car',
    daily_distance: '10',
    weekly_commute_frequency: '5',
    diet_type: 'Vegetarian',
    meals_per_day: '3',
    household_size: '2',
    electricity_usage: '120',
    ai_usage_frequency: '5',
    video_streaming_usage: '2'
  });
  const [formErrors, setFormErrors] = useState({});
  const [formSuccess, setFormSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const session = await fetchSession();
        setUser(session.user);
        if (session.user.profile) {
          setProfile(session.user.profile);
          setFormValues({
            name: session.user.name || '',
            transport_type: session.user.profile.transport_type || 'Car',
            daily_distance: session.user.profile.daily_distance?.toString() || '10',
            weekly_commute_frequency: session.user.profile.weekly_commute_frequency?.toString() || '5',
            diet_type: session.user.profile.diet_type || 'Vegetarian',
            meals_per_day: session.user.profile.meals_per_day?.toString() || '3',
            household_size: session.user.profile.household_size?.toString() || '2',
            electricity_usage: session.user.profile.electricity_usage?.toString() || '120',
            ai_usage_frequency: session.user.profile.ai_usage_frequency?.toString() || '5',
            video_streaming_usage: session.user.profile.video_streaming_usage?.toString() || '2'
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to retrieve profile data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { sender: 'user', text: chatInput.trim() };
    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await submitAuditChat(updatedHistory, user?.id);
      if (response.complete) {
        setProfile(response.profile);
        setFormSuccess('Sustainability Audit Complete! Calculated monthly baseline footprint: ' + response.baseline.total_emission + ' kg CO2.');
        setChatHistory([{ sender: 'bot', text: 'Thank you! Your baseline sustainability profile has been updated successfully.' }]);
      } else {
        setChatHistory([...updatedHistory, { sender: 'bot', text: response.message }]);
      }
    } catch (err) {
      console.error('Conversational audit error:', err);
      setChatHistory([
        ...updatedHistory,
        { sender: 'bot', text: 'Sorry, I encountered an error: ' + err.message }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setFormSuccess('');

    const errors = {};
    if (!formValues.name.trim()) errors.name = 'Name is required';
    if (isNaN(parseFloat(formValues.daily_distance)) || parseFloat(formValues.daily_distance) < 0) {
      errors.daily_distance = 'Distance must be a non-negative number';
    }
    if (isNaN(parseInt(formValues.weekly_commute_frequency)) || parseInt(formValues.weekly_commute_frequency) < 0 || parseInt(formValues.weekly_commute_frequency) > 7) {
      errors.weekly_commute_frequency = 'Commute days must be between 0 and 7';
    }
    if (isNaN(parseInt(formValues.meals_per_day)) || parseInt(formValues.meals_per_day) < 1) {
      errors.meals_per_day = 'Meals must be at least 1';
    }
    if (isNaN(parseInt(formValues.household_size)) || parseInt(formValues.household_size) < 1) {
      errors.household_size = 'Household size must be at least 1';
    }
    if (isNaN(parseFloat(formValues.electricity_usage)) || parseFloat(formValues.electricity_usage) < 0) {
      errors.electricity_usage = 'Electricity usage must be non-negative';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormLoading(true);
    try {
      const response = await submitAuditForm({
        name: formValues.name,
        transport_type: formValues.transport_type,
        daily_distance: parseFloat(formValues.daily_distance),
        weekly_commute_frequency: parseInt(formValues.weekly_commute_frequency),
        diet_type: formValues.diet_type,
        meals_per_day: parseInt(formValues.meals_per_day),
        household_size: parseInt(formValues.household_size),
        electricity_usage: parseFloat(formValues.electricity_usage),
        ai_usage_frequency: parseInt(formValues.ai_usage_frequency || 0),
        video_streaming_usage: parseFloat(formValues.video_streaming_usage || 0),
        sustainability_goal: profile?.sustainability_goal || 'reduce_10'
      }, user?.id);

      setProfile(response.profile);
      setFormSuccess('Sustainability Audit Complete! Calculated monthly baseline footprint: ' + response.baseline.total_emission.toFixed(1) + ' kg CO2.');
    } catch (err) {
      console.error('Audit submit error:', err);
      setFormErrors({ submit: err.message || 'Error saving audit parameters.' });
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) return <div className={styles.container}>Loading Sustainability Audit...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>AI Sustainability Audit</h1>
          <p className={styles.subtitle}>Evaluate and update your baseline carbon footprint profile.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => setAuditMode('chat')}
            className={`${styles.btn} ${styles.btnSecondary}`}
            style={{ background: auditMode === 'chat' ? 'var(--primary)' : '', color: auditMode === 'chat' ? '#070a0e' : '' }}
            aria-pressed={auditMode === 'chat'}
          >
            💬 Conversational Chat
          </button>
          <button 
            onClick={() => setAuditMode('form')}
            className={`${styles.btn} ${styles.btnSecondary}`}
            style={{ background: auditMode === 'form' ? 'var(--primary)' : '', color: auditMode === 'form' ? '#070a0e' : '' }}
            aria-pressed={auditMode === 'form'}
          >
            📝 Traditional Form
          </button>
        </div>
      </header>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', color: 'var(--danger)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {formSuccess && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', color: 'var(--success)' }}>
          ✅ {formSuccess}
        </div>
      )}

      {auditMode === 'chat' ? (
        <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', height: '480px' }}>
          <h2 className={styles.cardTitle}>Conversational Baseline Audit</h2>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '1rem' }} aria-label="Audit conversation logs">
            {chatHistory.map((m, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div 
                  style={{ 
                    maxWidth: '80%', 
                    padding: '0.85rem 1.1rem', 
                    borderRadius: '16px', 
                    fontSize: '0.95rem',
                    lineHeight: '1.45',
                    background: m.sender === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                    color: m.sender === 'user' ? '#070a0e' : '#ffffff',
                    border: m.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                    textAlign: 'left'
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  EcoAI is typing...
                </div>
              </div>
            )}
            <div ref={chatEndRef}></div>
          </div>

          <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              required
              disabled={chatLoading}
              placeholder="Provide your reply..."
              className={styles.formInput}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              aria-label="Interviewer chat input response"
            />
            <button type="submit" disabled={chatLoading} className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: '0 1.5rem' }}>
              Send
            </button>
          </form>
        </div>
      ) : (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Traditional Questionnaire Audit</h2>
          {formErrors.submit && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', color: 'var(--danger)' }}>
              {formErrors.submit}
            </div>
          )}

          <form onSubmit={handleFormSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="name">Your Name</label>
                <input
                  id="name"
                  type="text"
                  required
                  className={styles.formInput}
                  value={formValues.name}
                  onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                />
                {formErrors.name && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{formErrors.name}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="transport_type">Primary Transportation Mode</label>
                <select
                  id="transport_type"
                  className={styles.formSelect}
                  value={formValues.transport_type}
                  onChange={e => setFormValues({ ...formValues, transport_type: e.target.value })}
                >
                  <option value="Car">Car (Petrol)</option>
                  <option value="Metro">Metro</option>
                  <option value="Bus">Bus</option>
                  <option value="Auto Rickshaw">Auto Rickshaw (CNG)</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="Walking">Walking</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="daily_distance">Daily Commute Distance (km)</label>
                <input
                  id="daily_distance"
                  type="number"
                  min="0"
                  step="any"
                  required
                  className={styles.formInput}
                  value={formValues.daily_distance}
                  onChange={e => setFormValues({ ...formValues, daily_distance: e.target.value })}
                />
                {formErrors.daily_distance && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{formErrors.daily_distance}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="weekly_commute_frequency">Weekly Commute Frequency (Days)</label>
                <input
                  id="weekly_commute_frequency"
                  type="number"
                  min="0"
                  max="7"
                  required
                  className={styles.formInput}
                  value={formValues.weekly_commute_frequency}
                  onChange={e => setFormValues({ ...formValues, weekly_commute_frequency: e.target.value })}
                />
                {formErrors.weekly_commute_frequency && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{formErrors.weekly_commute_frequency}</span>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="diet_type">Dietary Profile</label>
                <select
                  id="diet_type"
                  className={styles.formSelect}
                  value={formValues.diet_type}
                  onChange={e => setFormValues({ ...formValues, diet_type: e.target.value })}
                >
                  <option value="Vegan">Vegan</option>
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Chicken">Chicken (Non-Veg)</option>
                  <option value="Beef">Beef (High Impact)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="meals_per_day">Meals Per Day</label>
                <input
                  id="meals_per_day"
                  type="number"
                  min="1"
                  required
                  className={styles.formInput}
                  value={formValues.meals_per_day}
                  onChange={e => setFormValues({ ...formValues, meals_per_day: e.target.value })}
                />
                {formErrors.meals_per_day && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{formErrors.meals_per_day}</span>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="household_size">Household Occupancy Size</label>
                <input
                  id="household_size"
                  type="number"
                  min="1"
                  required
                  className={styles.formInput}
                  value={formValues.household_size}
                  onChange={e => setFormValues({ ...formValues, household_size: e.target.value })}
                />
                {formErrors.household_size && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{formErrors.household_size}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="electricity_usage">Monthly Electricity consumption (kWh)</label>
                <input
                  id="electricity_usage"
                  type="number"
                  min="0"
                  step="any"
                  required
                  className={styles.formInput}
                  value={formValues.electricity_usage}
                  onChange={e => setFormValues({ ...formValues, electricity_usage: e.target.value })}
                />
                {formErrors.electricity_usage && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{formErrors.electricity_usage}</span>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="ai_usage_frequency">Daily AI queries</label>
                <input
                  id="ai_usage_frequency"
                  type="number"
                  min="0"
                  required
                  className={styles.formInput}
                  value={formValues.ai_usage_frequency}
                  onChange={e => setFormValues({ ...formValues, ai_usage_frequency: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="video_streaming_usage">Daily Video Streaming Hours</label>
                <input
                  id="video_streaming_usage"
                  type="number"
                  min="0"
                  step="any"
                  required
                  className={styles.formInput}
                  value={formValues.video_streaming_usage}
                  onChange={e => setFormValues({ ...formValues, video_streaming_usage: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" disabled={formLoading} className="btn btnPrimary" style={{ marginTop: '1.5rem', float: 'right' }}>
              {formLoading ? 'Submitting Form...' : 'Update Audit Baseline'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
