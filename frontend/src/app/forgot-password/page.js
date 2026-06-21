'use client';

import { useState } from 'react';
import { useAuth } from '../../components/AuthProvider';
import Link from 'next/link';
import { z } from 'zod';
import styles from '../../styles/Auth.module.css';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' })
});

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Client-side validation
    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <header className={styles.authHeader}>
          <h1 className={styles.authTitle}>Reset Password</h1>
          <p className={styles.authSubtitle}>Enter your email to receive a recovery link</p>
        </header>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`} role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className={`${styles.alert} ${styles.alertSuccess}`} role="alert">
            Recovery link sent! Please check your email inbox.
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className={`${styles.formInput} ${error ? styles.inputError : ''}`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. champion@ecoai.in"
              required
              aria-invalid={error ? 'true' : 'false'}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading || success}>
            {loading ? 'Sending link...' : 'Send Recovery Link'}
          </button>
        </form>

        <footer className={styles.authLinks}>
          <div>
            Back to{' '}
            <Link href="/login" className={styles.authLink}>
              Log In
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
