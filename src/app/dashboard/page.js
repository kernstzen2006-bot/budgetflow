'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './Dashboard.module.css';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate, getPayCycle } from '@/lib/utils';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';

function getRelativeDate(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr + 'T00:00:00');
  date.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - date.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return 'Last week';
  return formatDate(dateStr);
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    incomeThisMonth: 0,
    incomeLastMonth: 0,
    expensesThisMonth: 0,
    expensesLastMonth: 0,
    savingsThisMonth: 0,
    savingsLastMonth: 0,
    activeGoals: [],
    recentExpenses: [],
  });

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const now = new Date();
      const currentCycle = getPayCycle(now);
      const thisMonthStart = currentCycle.start;
      const thisMonthEnd = currentCycle.end;
      
      const lastMonthAnchor = new Date(currentCycle.anchorMonth);
      lastMonthAnchor.setMonth(lastMonthAnchor.getMonth() - 1);
      const lastCycle = getPayCycle(lastMonthAnchor);
      const lastMonthStart = lastCycle.start;
      const lastMonthEnd = lastCycle.end;

      const [
        paychecksThisMonth,
        paychecksLastMonth,
        expensesThisMonth,
        expensesLastMonth,
        contributionsThisMonth,
        contributionsLastMonth,
        activeGoals,
        recentExpenses,
      ] = await Promise.all([
        supabase
          .from('paychecks')
          .select('amount')
          .eq('user_id', user.id)
          .gte('date', thisMonthStart)
          .lte('date', thisMonthEnd),
        supabase
          .from('paychecks')
          .select('amount')
          .eq('user_id', user.id)
          .gte('date', lastMonthStart)
          .lte('date', lastMonthEnd),
        supabase
          .from('expenses')
          .select('amount')
          .eq('user_id', user.id)
          .gte('date', thisMonthStart)
          .lte('date', thisMonthEnd),
        supabase
          .from('expenses')
          .select('amount')
          .eq('user_id', user.id)
          .gte('date', lastMonthStart)
          .lte('date', lastMonthEnd),
        supabase
          .from('goal_contributions')
          .select('amount')
          .eq('user_id', user.id)
          .gte('created_at', thisMonthStart)
          .lte('created_at', thisMonthEnd + 'T23:59:59'),
        supabase
          .from('goal_contributions')
          .select('amount')
          .eq('user_id', user.id)
          .gte('created_at', lastMonthStart)
          .lte('created_at', lastMonthEnd + 'T23:59:59'),
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('expenses')
          .select('*, categories(name, icon, color)')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(8),
      ]);

      const sumAmounts = (result) =>
        (result.data || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

      setData({
        incomeThisMonth: sumAmounts(paychecksThisMonth),
        incomeLastMonth: sumAmounts(paychecksLastMonth),
        expensesThisMonth: sumAmounts(expensesThisMonth),
        expensesLastMonth: sumAmounts(expensesLastMonth),
        savingsThisMonth: sumAmounts(contributionsThisMonth),
        savingsLastMonth: sumAmounts(contributionsLastMonth),
        activeGoals: activeGoals.data || [],
        recentExpenses: recentExpenses.data || [],
      });
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const safeToSpend =
    data.incomeThisMonth - data.savingsThisMonth - data.expensesThisMonth;
  const isNegative = safeToSpend < 0;

  const getComparison = (current, previous) => {
    if (previous === 0) {
      return current > 0
        ? { text: 'New this month', direction: 'up' }
        : { text: 'No change', direction: 'neutral' };
    }
    const diff = ((current - previous) / previous) * 100;
    const rounded = Math.abs(diff).toFixed(0);
    if (diff > 0)
      return { text: `↑ ${rounded}% vs last month`, direction: 'up' };
    if (diff < 0)
      return { text: `↓ ${rounded}% vs last month`, direction: 'down' };
    return { text: 'No change', direction: 'neutral' };
  };

  const incomeComparison = getComparison(
    data.incomeThisMonth,
    data.incomeLastMonth
  );
  const expenseComparison = getComparison(
    data.expensesThisMonth,
    data.expensesLastMonth
  );
  const savingsPercentage =
    data.incomeThisMonth > 0
      ? ((data.savingsThisMonth / data.incomeThisMonth) * 100).toFixed(0)
      : 0;

  if (loading) {
    return (
      <AppLayout pageTitle="Dashboard">
        <div className={styles.skeletonContainer}>
          <div className={`${styles.skeletonHero} ${styles.shimmer}`} />
          <div className={styles.skeletonStatsRow}>
            <div className={`${styles.skeletonCard} ${styles.shimmer}`} />
            <div className={`${styles.skeletonCard} ${styles.shimmer}`} />
            <div className={`${styles.skeletonCard} ${styles.shimmer}`} />
          </div>
          <div className={`${styles.skeletonSection} ${styles.shimmer}`} />
          <div className={`${styles.skeletonSection} ${styles.shimmer}`} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Dashboard">
      <div className={styles.dashboardContainer}>
        {/* Hero - Safe to Spend */}
        <div
          className={`${styles.heroCard} ${isNegative ? styles.heroNegative : ''}`}
          style={{ '--delay': '0ms' }}
        >
          <div className={styles.heroGradientBg} />
          <div className={styles.heroContent}>
            <div className={styles.heroLabel}>
              {isNegative && <span className={styles.warningIcon}>⚠️</span>}
              <span>Safe to Spend</span>
            </div>
            <div
              className={`${styles.heroAmount} ${isNegative ? styles.heroAmountNegative : ''}`}
            >
              {formatCurrency(safeToSpend)}
            </div>
            <div className={styles.heroSubtitle}>Available this month</div>
          </div>
          <div className={styles.heroOrbs}>
            <div className={styles.orb1} />
            <div className={styles.orb2} />
          </div>
        </div>

        {/* Stats Row */}
        <div className={styles.statsRow}>
          <div className={styles.statCard} style={{ '--delay': '80ms' }}>
            <div className={styles.statIcon}>💰</div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Income</span>
              <span className={styles.statAmount}>
                {formatCurrency(data.incomeThisMonth)}
              </span>
              <span
                className={`${styles.statComparison} ${
                  incomeComparison.direction === 'up'
                    ? styles.compUp
                    : incomeComparison.direction === 'down'
                      ? styles.compDown
                      : ''
                }`}
              >
                {incomeComparison.text}
              </span>
            </div>
          </div>

          <div className={styles.statCard} style={{ '--delay': '160ms' }}>
            <div className={styles.statIcon}>🛒</div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Expenses</span>
              <span className={styles.statAmount}>
                {formatCurrency(data.expensesThisMonth)}
              </span>
              <span
                className={`${styles.statComparison} ${
                  expenseComparison.direction === 'up'
                    ? styles.compDown
                    : expenseComparison.direction === 'down'
                      ? styles.compUp
                      : ''
                }`}
              >
                {expenseComparison.text}
              </span>
            </div>
          </div>

          <div className={styles.statCard} style={{ '--delay': '240ms' }}>
            <div className={styles.statIcon}>🏦</div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Savings</span>
              <span className={styles.statAmount}>
                {formatCurrency(data.savingsThisMonth)}
              </span>
              <span className={`${styles.statComparison} ${styles.compUp}`}>
                {savingsPercentage}% of income
              </span>
            </div>
          </div>
        </div>

        {/* Goals Progress */}
        <div className={styles.section} style={{ '--delay': '320ms' }}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Goal Progress</h2>
            <Link href="/goals" className={styles.viewAll}>
              View All →
            </Link>
          </div>
          {data.activeGoals.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🎯</span>
              <p className={styles.emptyText}>
                No active goals yet. Start saving towards something!
              </p>
            </div>
          ) : (
            <div className={styles.goalsList}>
              {data.activeGoals.map((goal, idx) => {
                const pct =
                  goal.target_amount > 0
                    ? Math.min(
                        (goal.current_amount / goal.target_amount) * 100,
                        100
                      )
                    : 0;
                return (
                  <div
                    key={goal.id}
                    className={styles.goalCard}
                    style={{ '--delay': `${380 + idx * 60}ms` }}
                  >
                    <div className={styles.goalTop}>
                      <div className={styles.goalIconName}>
                        <span className={styles.goalIcon}>{goal.icon || '🎯'}</span>
                        <span className={styles.goalName}>{goal.name}</span>
                      </div>
                      <span className={styles.goalAmounts}>
                        {formatCurrency(goal.current_amount)}{' '}
                        <span className={styles.goalTarget}>
                          / {formatCurrency(goal.target_amount)}
                        </span>
                      </span>
                    </div>
                    <div className={styles.progressTrack}>
                      <div
                        className={styles.progressFill}
                        style={{
                          '--progress': `${pct}%`,
                          '--bar-color': goal.color || 'var(--accent-primary)',
                        }}
                      />
                    </div>
                    <span className={styles.progressPct}>
                      {pct.toFixed(0)}% complete
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className={styles.section} style={{ '--delay': '400ms' }}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Expenses</h2>
            <Link href="/expenses" className={styles.viewAll}>
              View All →
            </Link>
          </div>
          {data.recentExpenses.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📭</span>
              <p className={styles.emptyText}>
                No expenses recorded yet. Your wallet is safe… for now!
              </p>
            </div>
          ) : (
            <div className={styles.transactionsList}>
              {data.recentExpenses.map((expense, idx) => (
                <div
                  key={expense.id}
                  className={styles.transactionRow}
                  style={{ '--delay': `${460 + idx * 50}ms` }}
                >
                  <div className={styles.txLeft}>
                    <span
                      className={styles.txIcon}
                      style={{
                        '--cat-color':
                          expense.categories?.color || 'var(--accent-primary)',
                      }}
                    >
                      {expense.categories?.icon || '📦'}
                    </span>
                    <div className={styles.txDetails}>
                      <span className={styles.txDescription}>
                        {expense.description || expense.categories?.name || 'Expense'}
                      </span>
                      <span className={styles.txDate}>
                        {getRelativeDate(expense.date)}
                      </span>
                    </div>
                  </div>
                  <span className={styles.txAmount}>
                    -{formatCurrency(expense.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
