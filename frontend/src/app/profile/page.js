'use client';

import { useState, useEffect } from 'react';
import { fetchSession, submitAuditForm } from '../../services/api';
import styles from '../../styles/Dashboard.module.css';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Notification configurations
  const [notifications, setNotifications] = useState({
    weeklyDigest: true,
    budgetAlerts: true,
    coachReminders: false
  });

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
    video_streaming_usage: '2',
    sustainability_goal: 'reduce_10'
  });

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
            video_streaming_usage: session.user.profile.video_streaming_usage?.toString() || '2',
            sustainability_goal: session.user.profile.sustainability_goal || 'reduce_10'
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

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
        sustainability_goal: formValues.sustainability_goal
      }, user?.id);

      setProfile(response.profile);
      setSuccess('Profile configuration preferences updated successfully!');
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.message || 'Failed to save updated profile preferences.');
    }
  };

  if (loading) return <div className={styles.container}>Loading Profile Preferences...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>User Preferences & Profile</h1>
          <p className={styles.subtitle}>Manage your details, commute distances, and notification settings.</p>
        </div>
      </header>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', color: 'var(--danger)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', color: 'var(--success)' }}>
          ✅ {success}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        {/* Profile details */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Profile Information</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="name">Full Display Name</label>
                <input
                  id="name"
                  type="text"
                  required
                  className={styles.formInput}
                  value={formValues.name}
                  onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="transport_type">Primary Transport Mode</label>
                <select
                  id="transport_type"
                  className={styles.formSelect}
                  value={formValues.transport_type}
                  onChange={e => setFormValues({ ...formValues, transport_type: e.target.value })}
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
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
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
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="weekly_commute_frequency">Weekly Commute Days</label>
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
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
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
                  <option value="Chicken">Chicken</option>
                  <option value="Beef">Beef</option>
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
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
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
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="electricity_usage">Monthly Electricity (kWh)</label>
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
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1rem', marginTop: '0.75rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="sustainability_goal">Active Goal Strategy</label>
                <select
                  id="sustainability_goal"
                  className={styles.formSelect}
                  value={formValues.sustainability_goal}
                  onChange={e => setFormValues({ ...formValues, sustainability_goal: e.target.value })}
                >
                  <option value="reduce_10">Reduce emissions by 10%</option>
                  <option value="reduce_20">Reduce emissions by 20%</option>
                  <option value="eco_optimizer">Reach Eco Optimizer</option>
                  <option value="low_impact">Reach Low Impact Lifestyle</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="ai_usage">Daily AI Queries</label>
                  <input
                    id="ai_usage"
                    type="number"
                    min="0"
                    required
                    className={styles.formInput}
                    value={formValues.ai_usage_frequency}
                    onChange={e => setFormValues({ ...formValues, ai_usage_frequency: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="stream_usage">Daily Video hours</label>
                  <input
                    id="stream_usage"
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
            </div>

            <button type="submit" className="btn btnPrimary" style={{ marginTop: '1.5rem', float: 'right' }}>
              Save Profile Settings
            </button>
          </form>
        </div>

        {/* Notifications and preferences */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Communication Preferences</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Configure notification channels for carbon digests, alerts, and coach advices.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Weekly Digest Reports</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email summary of carbon footprints every Monday.</span>
              </div>
              <input
                type="checkbox"
                checked={notifications.weeklyDigest}
                onChange={(e) => setNotifications({ ...notifications, weeklyDigest: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                aria-label="Weekly digest reports notification check"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Budget Alerts</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Notify when emissions cross 80% of budget limit.</span>
              </div>
              <input
                type="checkbox"
                checked={notifications.budgetAlerts}
                onChange={(e) => setNotifications({ ...notifications, budgetAlerts: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                aria-label="Budget utilization alerts check"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Daily Coaching Advice Reminders</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Send push notification hints from the AI Sustainability Coach.</span>
              </div>
              <input
                type="checkbox"
                checked={notifications.coachReminders}
                onChange={(e) => setNotifications({ ...notifications, coachReminders: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                aria-label="Daily coaching reminders check"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
