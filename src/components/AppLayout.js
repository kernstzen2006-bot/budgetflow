'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import styles from './AppLayout.module.css';

export default function AppLayout({ children, pageTitle }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Full-screen loading state
  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingLogo}>
          <div className={styles.loadingIcon}>
            <svg viewBox="0 0 24 24">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className={styles.loadingText}>BudgetFlow</span>
        </div>
        <div className={styles.loadingSpinner} />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className={styles.layoutShell}>
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Bottom Nav */}
      <MobileNav />

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {pageTitle && (
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>{pageTitle}</h1>
          </div>
        )}
        <div className={styles.pageContent}>
          {children}
        </div>
      </main>
    </div>
  );
}
