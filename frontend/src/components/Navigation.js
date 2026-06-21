'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import styles from '../styles/Navigation.module.css';
import { useEffect, useState } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ecoai_high_contrast') === 'true';
    setHighContrast(saved);
    const root = document.getElementById('app-root');
    if (root) {
      if (saved) {
        root.classList.add('high-contrast');
      } else {
        root.classList.remove('high-contrast');
      }
    }
  }, []);

  const toggleContrast = () => {
    const nextVal = !highContrast;
    setHighContrast(nextVal);
    localStorage.setItem('ecoai_high_contrast', String(nextVal));
    const root = document.getElementById('app-root');
    if (root) {
      if (nextVal) {
        root.classList.add('high-contrast');
      } else {
        root.classList.remove('high-contrast');
      }
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Audit', path: '/audit', icon: '📝' },
    { name: 'Decision Coach', path: '/decision-coach', icon: '🤖' },
    { name: 'Carbon Twin', path: '/carbon-twin', icon: '👥' },
    { name: 'Receipt Scanner', path: '/receipt-scanner', icon: '📄' },
    { name: 'Goals', path: '/goals', icon: '🎯' },
    { name: 'Profile', path: '/profile', icon: '👤' }
  ];

  // Helper to determine if path matches
  const isActive = (path) => pathname === path;

  // Don't show navigation on auth screens
  const authRoutes = ['/login', '/signup', '/forgot-password', '/onboarding'];
  if (authRoutes.includes(pathname)) {
    return null;
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={styles.sidebar} aria-label="Main Navigation">
        <div>
          <div className={styles.logoArea}>
            <span className={styles.logoIcon}>🌱</span>
            <span className={styles.logoText}>EcoAI</span>
          </div>
          
          <nav className={styles.navLinks}>
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`${styles.navLink} ${isActive(item.path) ? styles.activeLink : ''}`}
                aria-current={isActive(item.path) ? 'page' : undefined}
              >
                <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className={styles.footer}>
          <button
            onClick={toggleContrast}
            className={styles.contrastBtn}
            aria-label="Toggle High Contrast Accessibility Mode"
          >
            <span>👁️</span>
            <span>{highContrast ? 'Normal Contrast' : 'High Contrast'}</span>
          </button>
          
          {user && (
            <div className={styles.userInfo}>
              <div className={styles.userDetails}>
                <span className={styles.userName}>
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Eco Champion'}
                </span>
                <span className={styles.userEmail}>{user.email}</span>
              </div>
              <button
                onClick={() => signOut()}
                className={styles.logoutBtn}
                title="Log Out"
                aria-label="Log Out"
              >
                🚪
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className={styles.mobileNav} aria-label="Mobile Navigation">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`${styles.mobileLink} ${isActive(item.path) ? styles.mobileActive : ''}`}
            aria-current={isActive(item.path) ? 'page' : undefined}
          >
            <span className={styles.mobileIcon} aria-hidden="true">{item.icon}</span>
            <span>{item.name.replace('Decision Coach', 'Coach').replace('Receipt Scanner', 'Scan')}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
