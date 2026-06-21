'use client';

import { useState, useEffect } from 'react';
import {
  fetchSession,
  extractReceiptFile,
  confirmReceiptData,
  fetchReceiptHistory
} from '../../services/api';
import styles from '../../styles/Dashboard.module.css';

export default function ReceiptScannerPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // OCR states
  const [receiptExtracting, setReceiptExtracting] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const [showReceiptReview, setShowReceiptReview] = useState(false);
  const [receiptReviewForm, setReceiptReviewForm] = useState({
    receiptId: '',
    date: '',
    distance: '',
    cost: '',
    transport_type: 'Car',
    electricity_kwh: ''
  });
  const [receiptHistory, setReceiptHistory] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const session = await fetchSession();
        setUser(session.user);
        
        const receipts = await fetchReceiptHistory(session.user.id);
        setReceiptHistory(receipts);
      } catch (err) {
        setError(err.message || 'Failed to retrieve receipt history.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function refreshHistory(userId) {
    try {
      const receipts = await fetchReceiptHistory(userId);
      setReceiptHistory(receipts);
    } catch (e) {
      console.error('Error fetching receipt history:', e);
    }
  }

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (4MB) and type
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      setReceiptError('Only PDF, PNG, JPG, and JPEG documents are supported.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setReceiptError('File size must be under 4MB.');
      return;
    }

    setReceiptError('');
    setReceiptExtracting(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(',')[1];
        const response = await extractReceiptFile(base64, file.name, file.type, user?.id);
        
        // Show review dialog pre-filled with extracted data
        setReceiptReviewForm({
          receiptId: response.receiptId,
          date: response.extracted.date || new Date().toISOString().split('T')[0],
          distance: response.extracted.distance != null ? response.extracted.distance.toString() : '',
          cost: response.extracted.cost != null ? response.extracted.cost.toString() : '',
          transport_type: response.extracted.transport_type || 'Car',
          electricity_kwh: response.extracted.electricity_kwh != null ? response.extracted.electricity_kwh.toString() : ''
        });
        setShowReceiptReview(true);
        await refreshHistory(user?.id);
      } catch (err) {
        setReceiptError(err.message || 'Receipt scanner failed. Verify API configuration keys.');
      } finally {
        setReceiptExtracting(false);
      }
    };
    reader.onerror = () => {
      setReceiptError('Failed to read upload file.');
      setReceiptExtracting(false);
    };
    reader.readAsDataURL(file);
  };

  const handleReceiptConfirmSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        receiptId: receiptReviewForm.receiptId,
        date: receiptReviewForm.date,
        distance: receiptReviewForm.distance ? parseFloat(receiptReviewForm.distance) : null,
        cost: receiptReviewForm.cost ? parseFloat(receiptReviewForm.cost) : null,
        transport_type: receiptReviewForm.transport_type || null,
        electricity_kwh: receiptReviewForm.electricity_kwh ? parseFloat(receiptReviewForm.electricity_kwh) : null
      };

      await confirmReceiptData(payload, user?.id);
      setShowReceiptReview(false);
      alert('Receipt activity successfully validated and logged to carbon history!');
      await refreshHistory(user?.id);
    } catch (err) {
      alert(err.message || 'Error confirming receipt details.');
    }
  };

  if (loading) return <div className={styles.container}>Loading Receipt Scanner...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>AI Carbon Receipt Scanner</h1>
          <p className={styles.subtitle}>Upload travel receipts or utility bills to automatically log carbon activities.</p>
        </div>
      </header>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', color: 'var(--danger)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {receiptError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', color: 'var(--danger)', fontSize: '0.85rem' }}>
          ⚠️ {receiptError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        {/* Upload card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Upload Document or Photo</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
              We support taxi receipts (Uber/Ola) and electric bills (MSEDCL/Tata Power) in PDF or PNG/JPG formats under 4MB.
            </p>
            
            <div style={{ border: '2px dashed rgba(255, 255, 255, 0.15)', borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center', background: 'rgba(0, 0, 0, 0.1)', transition: 'border-color 0.2s ease', position: 'relative' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📄</span>
              <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>Drag & Drop Receipt Here</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '1.5rem' }}>or browse from files</span>
              
              <input
                id="receipt-file-input"
                type="file"
                accept="application/pdf, image/png, image/jpeg, image/jpg"
                onChange={handleReceiptUpload}
                disabled={receiptExtracting}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                aria-label="Upload utility bill or travel taxi receipt file"
              />
              
              {receiptExtracting && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', borderRadius: '14px' }}>
                  <span style={{ fontSize: '2rem', animation: 'spin 1.5s linear infinite' }}>⏳</span>
                  <span style={{ fontWeight: '600', color: 'var(--primary)' }}>Running Google Vision OCR...</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Parsing date, cost, and distances...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* History card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Recent Scanner History</h2>
          <div className={styles.listScroll}>
            {receiptHistory.length > 0 ? (
              receiptHistory.map((receipt) => (
                <div key={receipt.id} className={styles.listItem}>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>{receipt.filename}</span>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      Status: <strong style={{ color: receipt.status === 'confirmed' ? 'var(--primary)' : 'var(--warning)' }}>{receipt.status.toUpperCase()}</strong>
                    </div>
                    {receipt.extracted_date && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Date: {receipt.extracted_date} {receipt.extracted_distance ? `· Dist: ${receipt.extracted_distance} km` : ''}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '1.25rem' }}>
                    {receipt.status === 'confirmed' ? '✅' : '⏳'}
                  </span>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                No receipts processed yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Human Review Modal Dialog */}
      {showReceiptReview && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="review-modal-title">
          <div className={styles.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 id="review-modal-title" className={styles.title} style={{ fontSize: '1.5rem', marginBottom: 0 }}>
                Human Verification Review
              </h2>
              <button
                onClick={() => setShowReceiptReview(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '1.25rem' }}
                aria-label="Close review dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReceiptConfirmSubmit}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Verify and correct the values extracted from your document below before logging to your carbon log history.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="rev-date">Extracted Date</label>
                  <input
                    id="rev-date"
                    type="date"
                    required
                    className={styles.formInput}
                    value={receiptReviewForm.date}
                    onChange={e => setReceiptReviewForm({ ...receiptReviewForm, date: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="rev-cost">Transaction Cost (INR ₹)</label>
                  <input
                    id="rev-cost"
                    type="number"
                    min="0"
                    step="any"
                    className={styles.formInput}
                    value={receiptReviewForm.cost}
                    onChange={e => setReceiptReviewForm({ ...receiptReviewForm, cost: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="rev-transport-type">Taxi Travel Mode</label>
                  <select
                    id="rev-transport-type"
                    className={styles.formSelect}
                    value={receiptReviewForm.transport_type}
                    onChange={e => setReceiptReviewForm({ ...receiptReviewForm, transport_type: e.target.value })}
                  >
                    <option value="Car">Car (Petrol Taxi)</option>
                    <option value="Auto Rickshaw">Auto Rickshaw</option>
                    <option value="Bus">Bus</option>
                    <option value="Motorcycle">Motorcycle</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="rev-distance">Taxi Distance (km)</label>
                  <input
                    id="rev-distance"
                    type="number"
                    min="0"
                    step="any"
                    className={styles.formInput}
                    value={receiptReviewForm.distance}
                    onChange={e => setReceiptReviewForm({ ...receiptReviewForm, distance: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '0.75rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="rev-electricity">Electricity consumption (Utility kWh)</label>
                  <input
                    id="rev-electricity"
                    type="number"
                    min="0"
                    step="any"
                    className={styles.formInput}
                    placeholder="e.g. 120"
                    value={receiptReviewForm.electricity_kwh}
                    onChange={e => setReceiptReviewForm({ ...receiptReviewForm, electricity_kwh: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowReceiptReview(false)} className={styles.btn} style={{ background: 'rgba(255, 255, 255, 0.05)' }}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Validate & Log Footprint</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
