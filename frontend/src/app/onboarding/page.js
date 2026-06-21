'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import { submitAuditChat, submitAuditForm, saveGoal } from '../../services/api';
import styles from '../../styles/Onboarding.module.css';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  
  // Preferences & Data State
  const [auditMethod, setAuditMethod] = useState('chat'); // 'chat' or 'form'
  const [profileData, setProfileData] = useState(null);
  const [baselineData, setBaselineData] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState('reduce_10');

  // Conversational Audit State
  const [chatHistory, setChatHistory] = useState([
    { sender: 'bot', text: "Hi, I'm EcoAI. I'll help estimate your sustainability footprint through a quick conversation. First, what is your display name?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Form Audit State
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
  const [formLoading, setFormLoading] = useState(false);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const handleNextStep = () => setStep((prev) => prev + 1);
  const handlePrevStep = () => setStep((prev) => prev - 1);

  // Step 3 Chat Audit submit handler
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
        setProfileData(response.profile);
        setBaselineData(response.baseline);
        // Save preferences
        await submitAuditForm({
          ...response.profile,
          sustainability_goal: 'reduce_10'
        }, user?.id);
        handleNextStep();
      } else {
        setChatHistory([...updatedHistory, { sender: 'bot', text: response.message }]);
      }
    } catch (err) {
      console.error('Conversational audit error:', err);
      setChatHistory([
        ...updatedHistory,
        { sender: 'bot', text: 'Sorry, I encountered an issue: ' + (err.message || 'Please switch to the form audit.') }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Step 3 Form Audit submit handler
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    // Client-side validation
    const errors = {};
    if (!formValues.name.trim()) errors.name = 'Name is required';
    if (isNaN(parseFloat(formValues.daily_distance)) || parseFloat(formValues.daily_distance) < 0) {
      errors.daily_distance = 'Commute distance must be a positive number';
    }
    if (isNaN(parseInt(formValues.weekly_commute_frequency)) || parseInt(formValues.weekly_commute_frequency) < 0 || parseInt(formValues.weekly_commute_frequency) > 7) {
      errors.weekly_commute_frequency = 'Commute frequency must be between 0 and 7';
    }
    if (isNaN(parseInt(formValues.meals_per_day)) || parseInt(formValues.meals_per_day) < 1) {
      errors.meals_per_day = 'Meals count must be at least 1';
    }
    if (isNaN(parseInt(formValues.household_size)) || parseInt(formValues.household_size) < 1) {
      errors.household_size = 'Household size must be at least 1';
    }
    if (isNaN(parseFloat(formValues.electricity_usage)) || parseFloat(formValues.electricity_usage) < 0) {
      errors.electricity_usage = 'Electricity usage must be a positive number';
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
        sustainability_goal: 'reduce_10'
      }, user?.id);

      setProfileData(response.profile);
      setBaselineData(response.baseline);
      handleNextStep();
    } catch (err) {
      console.error('Form audit submit error:', err);
      setFormErrors({ submit: err.message || 'Failed to submit form.' });
    } finally {
      setFormLoading(false);
    }
  };

  // Step 4 Goals submit handler
  const handleGoalSubmit = async () => {
    if (!profileData || !baselineData) return;
    
    setFormLoading(true);
    try {
      // Calculate monthly target based on baseline footprint
      const baselineMonthly = baselineData.total_emission;
      let monthlyTarget = baselineMonthly * 0.9; // Default 10%
      if (selectedGoal === 'reduce_20') {
        monthlyTarget = baselineMonthly * 0.8;
      } else if (selectedGoal === 'eco_optimizer') {
        monthlyTarget = 2.0 * 30; // 60 kg
      } else if (selectedGoal === 'low_impact') {
        monthlyTarget = 1.5 * 30; // 45 kg
      }

      // Save goal parameters
      await saveGoal({ monthly_target: parseFloat(monthlyTarget.toFixed(2)) }, user?.id);

      // Save updated profile goals
      await submitAuditForm({
        ...profileData,
        sustainability_goal: selectedGoal
      }, user?.id);

      handleNextStep();
    } catch (err) {
      console.error('Goal submission error:', err);
      alert('Failed to save goal target: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Finish Onboarding
  const handleFinish = () => {
    router.push('/dashboard');
  };

  // Helper for sustainability persona
  const getPersona = (dailyAvg) => {
    if (dailyAvg <= 1.5) return 'Low Impact Champion';
    if (dailyAvg <= 2.5) return 'Green Custodian';
    if (dailyAvg <= 3.5) return 'Eco Advocate';
    if (dailyAvg <= 4.5) return 'Conscious Consumer';
    if (dailyAvg <= 5.5) return 'Carbon Moderate';
    return 'High Intensity Consumer';
  };

  // Calculate highest carbon driver in baseline
  const getHighestDriver = () => {
    if (!baselineData) return 'Transportation';
    const drivers = [
      { name: 'Transportation', value: baselineData.transport_emission },
      { name: 'Food & Commute Meals', value: baselineData.food_emission },
      { name: 'Household Electricity', value: baselineData.electricity_emission },
      { name: 'Digital Footprint (AI)', value: baselineData.digital_emission || 0 }
    ];
    drivers.sort((a, b) => b.value - a.value);
    return drivers[0].name;
  };

  return (
    <div className={styles.container}>
      <div className={styles.onboardingCard}>
        {/* Stepper Progress bar */}
        <div className={styles.stepper} aria-label="Onboarding Progress">
          <div className={styles.stepperLine}></div>
          <div 
            className={styles.stepperLineActive} 
            style={{ width: `${((step - 1) / 4) * 100}%` }}
          ></div>
          {[1, 2, 3, 4, 5].map((s) => (
            <div 
              key={s} 
              className={`${styles.stepCircle} ${step === s ? styles.stepActive : ''} ${step > s ? styles.stepComplete : ''}`}
            >
              {step > s ? '✓' : s}
            </div>
          ))}
        </div>

        {/* Step 1: Welcome to EcoAI */}
        {step === 1 && (
          <div className={styles.welcomePanel}>
            <div className={styles.welcomeIcon} aria-hidden="true">🌱</div>
            <h1 className={styles.welcomeTitle}>Welcome to EcoAI</h1>
            <p>
              Your personal AI-driven companion to monitor, simulate, and reduce your carbon footprint.
              Let's build a greener lifestyle together.
            </p>
            <div className={styles.welcomeFeatures}>
              <div className={styles.featureCard}>
                <span className={styles.featureIcon} aria-hidden="true">📊</span>
                <span className={styles.featureTitle}>Emissions Tracking</span>
                <span className={styles.featureText}>Log transportation, diet, and electricity to trace daily carbon footprint.</span>
              </div>
              <div className={styles.featureCard}>
                <span className={styles.featureIcon} aria-hidden="true">👥</span>
                <span className={styles.featureTitle}>Carbon Twin</span>
                <span className={styles.featureText}>Compare your current behavior to a simulated optimized future version.</span>
              </div>
              <div className={styles.featureCard}>
                <span className={styles.featureIcon} aria-hidden="true">🤖</span>
                <span className={styles.featureTitle}>AI Coach</span>
                <span className={styles.featureText}>Receive personalized, regional sustainability advice and high-impact reductions.</span>
              </div>
              <div className={styles.featureCard}>
                <span className={styles.featureIcon} aria-hidden="true">🎯</span>
                <span className={styles.featureTitle}>Goal Milestones</span>
                <span className={styles.featureText}>Set realistic targets, watch carbon budgets, and unlock badges.</span>
              </div>
            </div>
            <button onClick={handleNextStep} className="btn btnPrimary" style={{ marginTop: '1.5rem' }}>
              Get Started
            </button>
          </div>
        )}

        {/* Step 2: Choose Audit Method */}
        {step === 2 && (
          <div>
            <h2 className="cardTitle" style={{ marginBottom: '0.5rem' }}>Choose Baseline Setup Method</h2>
            <p className="subtitle" style={{ marginBottom: '1.5rem' }}>
              Select how you would like to complete your initial baseline sustainability audit.
            </p>
            <div className={styles.selectionGrid}>
              <div 
                className={`${styles.selectionCard} ${auditMethod === 'chat' ? styles.selectionSelected : ''}`}
                onClick={() => setAuditMethod('chat')}
                role="radio"
                aria-checked={auditMethod === 'chat'}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setAuditMethod('chat')}
              >
                <div className={styles.recommendBadge}>Recommended</div>
                <div className={styles.welcomeIcon} style={{ fontSize: '2.5rem' }}>💬</div>
                <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Conversational Audit</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  A friendly, interactive chat interface guided by EcoAI.
                </p>
              </div>

              <div 
                className={`${styles.selectionCard} ${auditMethod === 'form' ? styles.selectionSelected : ''}`}
                onClick={() => setAuditMethod('form')}
                role="radio"
                aria-checked={auditMethod === 'form'}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setAuditMethod('form')}
              >
                <div className={styles.welcomeIcon} style={{ fontSize: '2.5rem' }}>📝</div>
                <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Traditional Form</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Quickly fill out a questionnaire form with your details.
                </p>
              </div>
            </div>

            <div className={styles.btnRow}>
              <button onClick={handlePrevStep} className="btn btnSecondary">Back</button>
              <button onClick={handleNextStep} className="btn btnPrimary">Continue</button>
            </div>
          </div>
        )}

        {/* Step 3: Sustainability Data Collection */}
        {step === 3 && (
          <div>
            <h2 className="cardTitle" style={{ marginBottom: '0.5rem' }}>Baseline Sustainability Audit</h2>
            <p className="subtitle" style={{ marginBottom: '1.5rem' }}>
              We need to gather some basic details to evaluate your carbon baseline footprint.
            </p>

            {auditMethod === 'chat' ? (
              /* Conversational Chat Audit */
              <div className={styles.chatArea}>
                <div className={styles.chatHistory}>
                  {chatHistory.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`${styles.messageBubble} ${msg.sender === 'user' ? styles.userBubble : styles.botBubble}`}
                    >
                      {msg.text}
                    </div>
                  ))}
                  {chatLoading && (
                    <div className={`${styles.messageBubble} ${styles.botBubble}`}>
                      Thinking...
                    </div>
                  )}
                  <div ref={chatEndRef}></div>
                </div>
                <form onSubmit={handleChatSubmit} className={styles.chatInputArea}>
                  <input
                    type="text"
                    className={styles.chatInput}
                    placeholder="Type your reply..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={chatLoading}
                    aria-label="Chat input message"
                  />
                  <button 
                    type="submit" 
                    className={styles.chatSendBtn} 
                    disabled={chatLoading || !chatInput.trim()}
                    aria-label="Send message"
                  >
                    ➔
                  </button>
                </form>
              </div>
            ) : (
              /* Traditional Form Audit */
              <form onSubmit={handleFormSubmit}>
                {formErrors.submit && (
                  <div className={`${styles.alert} ${styles.alertError}`} role="alert" style={{ marginBottom: '1rem' }}>
                    {formErrors.submit}
                  </div>
                )}
                <div className={styles.formGrid}>
                  <div className="formGroup">
                    <label htmlFor="name" className="formLabel">Your Display Name</label>
                    <input
                      id="name"
                      type="text"
                      className="formInput"
                      value={formValues.name}
                      onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                      placeholder="e.g. Eco Warrior"
                    />
                    {formErrors.name && <span className={styles.errorText}>{formErrors.name}</span>}
                  </div>

                  <div className="formGroup">
                    <label htmlFor="transport_type" className="formLabel">Primary Transportation</label>
                    <select
                      id="transport_type"
                      className="formSelect"
                      value={formValues.transport_type}
                      onChange={(e) => setFormValues({ ...formValues, transport_type: e.target.value })}
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

                  <div className="formGroup">
                    <label htmlFor="daily_distance" className="formLabel">Daily Commute Distance (km)</label>
                    <input
                      id="daily_distance"
                      type="number"
                      min="0"
                      className="formInput"
                      value={formValues.daily_distance}
                      onChange={(e) => setFormValues({ ...formValues, daily_distance: e.target.value })}
                    />
                    {formErrors.daily_distance && <span className={styles.errorText}>{formErrors.daily_distance}</span>}
                  </div>

                  <div className="formGroup">
                    <label htmlFor="weekly_commute_frequency" className="formLabel">Weekly Commute Days</label>
                    <input
                      id="weekly_commute_frequency"
                      type="number"
                      min="0"
                      max="7"
                      className="formInput"
                      value={formValues.weekly_commute_frequency}
                      onChange={(e) => setFormValues({ ...formValues, weekly_commute_frequency: e.target.value })}
                    />
                    {formErrors.weekly_commute_frequency && <span className={styles.errorText}>{formErrors.weekly_commute_frequency}</span>}
                  </div>

                  <div className="formGroup">
                    <label htmlFor="diet_type" className="formLabel">Dietary Pattern</label>
                    <select
                      id="diet_type"
                      className="formSelect"
                      value={formValues.diet_type}
                      onChange={(e) => setFormValues({ ...formValues, diet_type: e.target.value })}
                    >
                      <option value="Vegan">Vegan</option>
                      <option value="Vegetarian">Vegetarian</option>
                      <option value="Chicken">Chicken (Non-Veg)</option>
                      <option value="Beef">Beef (High Impact)</option>
                    </select>
                  </div>

                  <div className="formGroup">
                    <label htmlFor="meals_per_day" className="formLabel">Meals Per Day</label>
                    <input
                      id="meals_per_day"
                      type="number"
                      min="1"
                      className="formInput"
                      value={formValues.meals_per_day}
                      onChange={(e) => setFormValues({ ...formValues, meals_per_day: e.target.value })}
                    />
                    {formErrors.meals_per_day && <span className={styles.errorText}>{formErrors.meals_per_day}</span>}
                  </div>

                  <div className="formGroup">
                    <label htmlFor="household_size" className="formLabel">Household Occupancy</label>
                    <input
                      id="household_size"
                      type="number"
                      min="1"
                      className="formInput"
                      value={formValues.household_size}
                      onChange={(e) => setFormValues({ ...formValues, household_size: e.target.value })}
                    />
                    {formErrors.household_size && <span className={styles.errorText}>{formErrors.household_size}</span>}
                  </div>

                  <div className="formGroup">
                    <label htmlFor="electricity_usage" className="formLabel">Monthly Electricity (kWh)</label>
                    <input
                      id="electricity_usage"
                      type="number"
                      min="0"
                      className="formInput"
                      value={formValues.electricity_usage}
                      onChange={(e) => setFormValues({ ...formValues, electricity_usage: e.target.value })}
                    />
                    {formErrors.electricity_usage && <span className={styles.errorText}>{formErrors.electricity_usage}</span>}
                  </div>

                  <div className="formGroup">
                    <label htmlFor="ai_usage_frequency" className="formLabel">AI Inferences / Day</label>
                    <input
                      id="ai_usage_frequency"
                      type="number"
                      min="0"
                      className="formInput"
                      value={formValues.ai_usage_frequency}
                      onChange={(e) => setFormValues({ ...formValues, ai_usage_frequency: e.target.value })}
                    />
                  </div>

                  <div className="formGroup">
                    <label htmlFor="video_streaming_usage" className="formLabel">Video Streaming (Hours / Day)</label>
                    <input
                      id="video_streaming_usage"
                      type="number"
                      min="0"
                      className="formInput"
                      value={formValues.video_streaming_usage}
                      onChange={(e) => setFormValues({ ...formValues, video_streaming_usage: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.btnRow}>
                  <button type="button" onClick={handlePrevStep} className="btn btnSecondary">Back</button>
                  <button type="submit" className="btn btnPrimary" disabled={formLoading}>
                    {formLoading ? 'Submitting...' : 'Analyze Baseline'}
                  </button>
                </div>
              </form>
            )}
            
            {auditMethod === 'chat' && (
              <div className={styles.btnRow}>
                <button onClick={handlePrevStep} className="btn btnSecondary">Back</button>
                <button onClick={() => setAuditMethod('form')} className="btn btnSecondary">Switch to Form Audit</button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Goals Selection */}
        {step === 4 && (
          <div>
            <h2 className="cardTitle" style={{ marginBottom: '0.5rem' }}>Select Sustainability Target</h2>
            <p className="subtitle" style={{ marginBottom: '1.5rem' }}>
              Choose a monthly target reduction. This defines your Future Carbon Twin simulation.
            </p>
            <div className={styles.goalsGrid}>
              <div 
                className={`${styles.goalCard} ${selectedGoal === 'reduce_10' ? styles.goalSelected : ''}`}
                onClick={() => setSelectedGoal('reduce_10')}
                role="radio"
                aria-checked={selectedGoal === 'reduce_10'}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedGoal('reduce_10')}
              >
                <div className={styles.goalInfo}>
                  <span className={styles.goalName}>Eco Conscious (10% Reduction)</span>
                  <span className={styles.goalDesc}>A comfortable target to trim excess waste in daily commutes and energy.</span>
                </div>
                <div className={styles.goalSelectIndicator}>
                  {selectedGoal === 'reduce_10' && <span className={styles.checkMark}>✓</span>}
                </div>
              </div>

              <div 
                className={`${styles.goalCard} ${selectedGoal === 'reduce_20' ? styles.goalSelected : ''}`}
                onClick={() => setSelectedGoal('reduce_20')}
                role="radio"
                aria-checked={selectedGoal === 'reduce_20'}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedGoal('reduce_20')}
              >
                <div className={styles.goalInfo}>
                  <span className={styles.goalName}>Carbon Fighter (20% Reduction)</span>
                  <span className={styles.goalDesc}>Our recommended baseline. Implies moderate lifestyle modifications.</span>
                </div>
                <div className={styles.goalSelectIndicator}>
                  {selectedGoal === 'reduce_20' && <span className={styles.checkMark}>✓</span>}
                </div>
              </div>

              <div 
                className={`${styles.goalCard} ${selectedGoal === 'eco_optimizer' ? styles.goalSelected : ''}`}
                onClick={() => setSelectedGoal('eco_optimizer')}
                role="radio"
                aria-checked={selectedGoal === 'eco_optimizer'}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedGoal('eco_optimizer')}
              >
                <div className={styles.goalInfo}>
                  <span className={styles.goalName}>Eco Optimizer (2.0 kg / day)</span>
                  <span className={styles.goalDesc}>Aligns emissions directly with highly efficient grid and public transit usage.</span>
                </div>
                <div className={styles.goalSelectIndicator}>
                  {selectedGoal === 'eco_optimizer' && <span className={styles.checkMark}>✓</span>}
                </div>
              </div>

              <div 
                className={`${styles.goalCard} ${selectedGoal === 'low_impact' ? styles.goalSelected : ''}`}
                onClick={() => setSelectedGoal('low_impact')}
                role="radio"
                aria-checked={selectedGoal === 'low_impact'}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedGoal('low_impact')}
              >
                <div className={styles.goalInfo}>
                  <span className={styles.goalName}>Low Impact Champion (1.5 kg / day)</span>
                  <span className={styles.goalDesc}>Strict green standard. Adopts a plant-based diet and walking/cycling transit.</span>
                </div>
                <div className={styles.goalSelectIndicator}>
                  {selectedGoal === 'low_impact' && <span className={styles.checkMark}>✓</span>}
                </div>
              </div>
            </div>

            <div className={styles.btnRow}>
              <button onClick={handlePrevStep} className="btn btnSecondary" disabled={formLoading}>Back</button>
              <button onClick={handleGoalSubmit} className="btn btnPrimary" disabled={formLoading}>
                {formLoading ? 'Saving target...' : 'Confirm Goal'}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Initial Baseline Report */}
        {step === 5 && (
          <div className={styles.reportPanel}>
            <div className={styles.welcomeIcon} aria-hidden="true">🎉</div>
            <h1 className={styles.welcomeTitle}>Your Sustainability Baseline</h1>
            <p>
              Excellent job completing your audit! Here is your starting footprint.
              We've created your Carbon Twin and logged your starting goal values.
            </p>
            
            <div className={styles.reportSummaryRow}>
              <div className={styles.reportCard}>
                <span className={styles.reportVal}>
                  {baselineData ? baselineData.total_emission.toFixed(1) : '0.0'} kg
                </span>
                <span className={styles.reportLabel}>Monthly Baseline</span>
              </div>
              <div className={styles.reportCard}>
                <span className={styles.reportVal} style={{ fontSize: '1.2rem', whiteSpace: 'nowrap' }}>
                  {baselineData ? getPersona(baselineData.total_emission / 30) : 'Green Advocate'}
                </span>
                <span className={styles.reportLabel}>Sustainability Persona</span>
              </div>
              <div className={styles.reportCard}>
                <span className={styles.reportVal} style={{ fontSize: '1.2rem' }}>
                  {getHighestDriver()}
                </span>
                <span className={styles.reportLabel}>Top Emission Source</span>
              </div>
            </div>

            <button onClick={handleFinish} className="btn btnPrimary" style={{ marginTop: '1.5rem' }}>
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
