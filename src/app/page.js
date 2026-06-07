'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setHourlyRate('');
    setError('');
    setSuccess('');
  };

  const handleTabSwitch = (toSignUp) => {
    setIsSignUp(toSignUp);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(
          email,
          password,
          fullName,
          parseFloat(hourlyRate) || 0
        );
        setSuccess('Account created successfully! Redirecting...');
        setTimeout(() => router.push('/dashboard'), 1200);
      } else {
        await signIn(email, password);
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Don't render auth page if user is already logged in or auth is loading
  if (authLoading || user) {
    return (
      <div className={styles.authPage}>
        <div className={styles.bgMesh}>
          <div className={styles.bgOrb} />
          <div className={styles.bgOrb} />
          <div className={styles.bgOrb} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.authPage}>
      {/* Animated Background */}
      <div className={styles.bgMesh}>
        <div className={styles.bgOrb} />
        <div className={styles.bgOrb} />
        <div className={styles.bgOrb} />
        <div className={styles.bgOrb} />
        <div className={styles.bgGrid} />
      </div>

      {/* Auth Card */}
      <div className={styles.authCard}>
        {/* Logo */}
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>
            <svg viewBox="0 0 24 24">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
            </svg>
          </div>
          <h1 className={styles.logoText}>BudgetFlow</h1>
          <p className={styles.tagline}>Smart budgeting for students with variable income</p>
        </div>

        {/* Tab Toggle */}
        <div className={styles.tabToggle}>
          <div
            className={`${styles.tabIndicator} ${isSignUp ? styles.tabIndicatorRight : ''}`}
          />
          <button
            type="button"
            className={`${styles.tabBtn} ${!isSignUp ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabSwitch(false)}
            id="auth-tab-signin"
          >
            Sign In
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${isSignUp ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabSwitch(true)}
            id="auth-tab-signup"
          >
            Sign Up
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className={styles.errorMsg}>
            <svg className={styles.errorIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className={styles.successMsg}>
            <svg className={styles.successIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Full Name (Sign Up only) */}
          {isSignUp && (
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel} htmlFor="auth-fullname">Full Name</label>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  id="auth-fullname"
                  className={styles.input}
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="auth-email">Email Address</label>
            <div className={styles.inputWrapper}>
              <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <input
                id="auth-email"
                className={styles.input}
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="auth-password">Password</label>
            <div className={styles.inputWrapper}>
              <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="auth-password"
                className={styles.input}
                type="password"
                placeholder={isSignUp ? 'Create a password' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </div>
          </div>

          {/* Hourly Rate (Sign Up only) */}
          {isSignUp && (
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel} htmlFor="auth-hourlyrate">Hourly Rate</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputPrefix}>R</span>
                <input
                  id="auth-hourlyrate"
                  className={`${styles.input} ${styles.inputWithPrefix}`}
                  type="number"
                  placeholder="15.00"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  min="0"
                  step="0.01"
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
            id="auth-submit-btn"
          >
            <span className={styles.btnContent}>
              {loading && <span className={styles.spinner} />}
              {loading
                ? (isSignUp ? 'Creating Account...' : 'Signing In...')
                : (isSignUp ? 'Create Account' : 'Sign In')
              }
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
