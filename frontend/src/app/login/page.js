'use client';

import { useState } from 'react';
import { useAuth } from '../../components/AuthProvider';
import Link from 'next/link';
import { z } from 'zod';
import styles from '../../styles/Auth.module.css';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' })
});

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    
    // Client-side Zod validation
    const validation = loginSchema.safeParse(form);
    if (!validation.success) {
      const formattedErrors = {};
      validation.error.errors.forEach((err) => {
        formattedErrors[err.path[0]] = err.message;
      });
      setErrors(formattedErrors);
      return;
    }

    setLoading(true);
    try {
      await signIn(form.email, form.password);
      // AuthProvider handles redirecting to dashboard upon state update
    } catch (err) {
      console.error('Login error:', err);
      setSubmitError(err.message || 'Invalid email or password.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSubmitError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google Sign-In error:', err);
      setSubmitError(err.message || 'Failed to initialize Google Sign-In.');
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <header className={styles.authHeader}>
          <h1 className={styles.authTitle}>Welcome Back</h1>
          <p className={styles.authSubtitle}>Log in to track your carbon savings</p>
        </header>

        {submitError && (
          <div className={`${styles.alert} ${styles.alertError}`} role="alert">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={`${styles.formInput} ${errors.email ? styles.inputError : ''}`}
              value={form.email}
              onChange={handleChange}
              placeholder="e.g. warrior@eco.org"
              required
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <span id="email-error" className={styles.errorText}>
                {errors.email}
              </span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className={`${styles.formInput} ${errors.password ? styles.inputError : ''}`}
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            {errors.password && (
              <span id="password-error" className={styles.errorText}>
                {errors.password}
              </span>
            )}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className={styles.divider}>or</div>

        <button onClick={handleGoogleLogin} className={styles.googleBtn} type="button">
          <span>🌐</span> Sign in with Google
        </button>

        <footer className={styles.authLinks}>
          <div>
            Don't have an account?{' '}
            <Link href="/signup" className={styles.authLink}>
              Sign Up
            </Link>
          </div>
          <div>
            <Link href="/forgot-password" className={styles.authLink}>
              Forgot Password?
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
