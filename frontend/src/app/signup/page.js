'use client';

import { useState } from 'react';
import { useAuth } from '../../components/AuthProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import styles from '../../styles/Auth.module.css';

const signupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
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
    setSubmitSuccess(false);

    // Client-side validation
    const validation = signupSchema.safeParse(form);
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
      await signUp(form.email, form.password);
      setSubmitSuccess(true);
      // Wait a moment and redirect to onboarding
      setTimeout(() => {
        router.push('/onboarding');
      }, 1500);
    } catch (err) {
      console.error('Signup error:', err);
      setSubmitError(err.message || 'An error occurred during sign up.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <header className={styles.authHeader}>
          <h1 className={styles.authTitle}>Create Account</h1>
          <p className={styles.authSubtitle}>Start your carbon-neutral journey today</p>
        </header>

        {submitError && (
          <div className={`${styles.alert} ${styles.alertError}`} role="alert">
            {submitError}
          </div>
        )}

        {submitSuccess && (
          <div className={`${styles.alert} ${styles.alertSuccess}`} role="alert">
            Registration successful! Redirecting to onboarding...
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
              placeholder="e.g. champion@ecoai.in"
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

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.formLabel}>
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className={`${styles.formInput} ${errors.confirmPassword ? styles.inputError : ''}`}
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
              aria-invalid={errors.confirmPassword ? 'true' : 'false'}
              aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
            />
            {errors.confirmPassword && (
              <span id="confirm-password-error" className={styles.errorText}>
                {errors.confirmPassword}
              </span>
            )}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading || submitSuccess}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <footer className={styles.authLinks}>
          <div>
            Already have an account?{' '}
            <Link href="/login" className={styles.authLink}>
              Log In
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
