'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/utils';
import styles from './Analytics.module.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DATE_RANGES = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_3_months', label: 'Last 3 Months' },
  { key: 'last_6_months', label: 'Last 6 Months' },
  { key: 'this_year', label: 'This Year' },
];

const FALLBACK_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#f97316', '#eab308', '#64748b',
];

// ---------------------------------------------------------------------------
// Date-range helpers
// ---------------------------------------------------------------------------
function getDateRange(rangeKey) {
  const now = new Date();
  let start;

  switch (rangeKey) {
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'last_3_months':
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      break;
    case 'last_6_months':
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      break;
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return {
    start: start.toISOString().slice(0, 10),
    end: now.toISOString().slice(0, 10),
  };
}

function getPreviousRange(rangeKey) {
  const now = new Date();
  let start, end;

  switch (rangeKey) {
    case 'this_month': {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    }
    case 'last_3_months': {
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      end = new Date(now.getFullYear(), now.getMonth() - 2, 0);
      break;
    }
    case 'last_6_months': {
      start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      end = new Date(now.getFullYear(), now.getMonth() - 5, 0);
      break;
    }
    case 'this_year': {
      start = new Date(now.getFullYear() - 1, 0, 1);
      end = new Date(now.getFullYear() - 1, 11, 31);
      break;
    }
    default: {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    }
  }

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

// ---------------------------------------------------------------------------
// Custom Tooltip Components
// ---------------------------------------------------------------------------
function CategoryTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className={styles.customTooltip}>
      <div className={styles.tooltipRow}>
        <span className={styles.tooltipName}>
          <span className={styles.tooltipDot} style={{ background: data.color }} />
          {data.icon} {data.name}
        </span>
      </div>
      <div className={styles.tooltipRow}>
        <span className={styles.tooltipValue}>{formatCurrency(data.value)}</span>
        <span className={styles.tooltipPercent}>{data.percent?.toFixed(1)}%</span>
      </div>
    </div>
  );
}

function IncomeExpenseTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className={styles.customTooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.map((entry) => (
        <div className={styles.tooltipRow} key={entry.dataKey}>
          <span className={styles.tooltipName}>
            <span className={styles.tooltipDot} style={{ background: entry.color }} />
            {entry.name}
          </span>
          <span className={styles.tooltipValue}>{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

function DailySpendingTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className={styles.customTooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      <div className={styles.tooltipRow}>
        <span className={styles.tooltipName}>
          <span className={styles.tooltipDot} style={{ background: '#6366f1' }} />
          Spent
        </span>
        <span className={styles.tooltipValue}>{formatCurrency(payload[0].value)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function AnalyticsPage() {
  const { user } = useAuth();

  const [selectedRange, setSelectedRange] = useState('this_month');
  const [loading, setLoading] = useState(true);

  // Raw data
  const [expenses, setExpenses] = useState([]);
  const [paychecks, setPaychecks] = useState([]);
  const [goalContributions, setGoalContributions] = useState([]);

  // Previous period data for trend calculation
  const [prevPaychecks, setPrevPaychecks] = useState([]);
  const [prevGoalContributions, setPrevGoalContributions] = useState([]);
  const [prevExpenses, setPrevExpenses] = useState([]);

  // --------------------------------------------------------------------------
  // Data Fetching
  // --------------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { start, end } = getDateRange(selectedRange);
    const prev = getPreviousRange(selectedRange);

    try {
      const [expensesRes, paychecksRes, contributionsRes, prevPayRes, prevContRes, prevExpRes] =
        await Promise.all([
          supabase
            .from('expenses')
            .select('id, amount, description, date, category_id, categories(id, name, icon, color)')
            .eq('user_id', user.id)
            .gte('date', start)
            .lte('date', end)
            .order('date', { ascending: true }),
          supabase
            .from('paychecks')
            .select('id, amount, date')
            .eq('user_id', user.id)
            .gte('date', start)
            .lte('date', end),
          supabase
            .from('goal_contributions')
            .select('id, amount, created_at')
            .eq('user_id', user.id)
            .gte('created_at', `${start}T00:00:00`)
            .lte('created_at', `${end}T23:59:59`),
          supabase
            .from('paychecks')
            .select('id, amount, date')
            .eq('user_id', user.id)
            .gte('date', prev.start)
            .lte('date', prev.end),
          supabase
            .from('goal_contributions')
            .select('id, amount, created_at')
            .eq('user_id', user.id)
            .gte('created_at', `${prev.start}T00:00:00`)
            .lte('created_at', `${prev.end}T23:59:59`),
          supabase
            .from('expenses')
            .select('id, amount, date')
            .eq('user_id', user.id)
            .gte('date', prev.start)
            .lte('date', prev.end),
        ]);

      setExpenses(expensesRes.data || []);
      setPaychecks(paychecksRes.data || []);
      setGoalContributions(contributionsRes.data || []);
      setPrevPaychecks(prevPayRes.data || []);
      setPrevGoalContributions(prevContRes.data || []);
      setPrevExpenses(prevExpRes.data || []);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --------------------------------------------------------------------------
  // Derived / Aggregated Data
  // --------------------------------------------------------------------------

  // Total income & expenses
  const totalIncome = useMemo(
    () => paychecks.reduce((sum, p) => sum + Number(p.amount), 0),
    [paychecks]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses]
  );

  const totalSavings = useMemo(
    () => goalContributions.reduce((sum, c) => sum + Number(c.amount), 0),
    [goalContributions]
  );

  const netBalance = totalIncome - totalExpenses;

  // ---- Spending by Category (Donut) ----
  const categoryData = useMemo(() => {
    const map = {};
    expenses.forEach((exp) => {
      const cat = exp.categories;
      if (!cat) return;
      const key = cat.id;
      if (!map[key]) {
        map[key] = { id: key, name: cat.name, icon: cat.icon, color: cat.color, value: 0 };
      }
      map[key].value += Number(exp.amount);
    });

    const items = Object.values(map).sort((a, b) => b.value - a.value);
    const total = items.reduce((s, i) => s + i.value, 0);
    return items.map((item, idx) => ({
      ...item,
      color: item.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
      percent: total > 0 ? (item.value / total) * 100 : 0,
    }));
  }, [expenses]);

  // ---- Income vs Expenses (Bar) ----
  const monthlyBarData = useMemo(() => {
    const months = {};

    paychecks.forEach((p) => {
      const key = p.date.slice(0, 7); // YYYY-MM
      if (!months[key]) months[key] = { month: key, Income: 0, Expenses: 0 };
      months[key].Income += Number(p.amount);
    });

    expenses.forEach((e) => {
      const key = e.date.slice(0, 7);
      if (!months[key]) months[key] = { month: key, Income: 0, Expenses: 0 };
      months[key].Expenses += Number(e.amount);
    });

    return Object.values(months)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((item) => {
        const d = new Date(item.month + '-01T00:00:00');
        return {
          ...item,
          label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        };
      });
  }, [expenses, paychecks]);

  // ---- Daily Spending Trend (Area) ----
  const dailySpendingData = useMemo(() => {
    const map = {};
    expenses.forEach((e) => {
      const key = e.date;
      map[key] = (map[key] || 0) + Number(e.amount);
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => {
        const d = new Date(date + 'T00:00:00');
        return {
          date,
          amount,
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
      });
  }, [expenses]);

  // ---- Savings Rate ----
  const savingsRate = useMemo(() => {
    if (totalIncome === 0) return 0;
    return Math.min(((totalSavings) / totalIncome) * 100, 100);
  }, [totalIncome, totalSavings]);

  const prevSavingsRate = useMemo(() => {
    const prevInc = prevPaychecks.reduce((s, p) => s + Number(p.amount), 0);
    const prevSav = prevGoalContributions.reduce((s, c) => s + Number(c.amount), 0);
    if (prevInc === 0) return 0;
    return Math.min((prevSav / prevInc) * 100, 100);
  }, [prevPaychecks, prevGoalContributions]);

  const savingsTrend = savingsRate - prevSavingsRate;

  // ---- Top Spending Categories ----
  const topCategories = useMemo(() => {
    return categoryData.slice(0, 6);
  }, [categoryData]);

  // --------------------------------------------------------------------------
  // SVG Progress Ring
  // --------------------------------------------------------------------------
  const ringSize = 130;
  const ringStroke = 8;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (savingsRate / 100) * ringCircumference;

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <AppLayout pageTitle="Analytics">
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <span className={styles.loadingText}>Loading your analytics…</span>
        </div>
      </AppLayout>
    );
  }

  const hasData = expenses.length > 0 || paychecks.length > 0;

  if (!hasData) {
    return (
      <AppLayout pageTitle="Analytics">
        <div className={styles.analyticsContainer}>
          {/* Date Range Selector */}
          <div className={styles.dateRangeSelector} id="analytics-date-range">
            {DATE_RANGES.map((range) => (
              <button
                key={range.key}
                id={`range-${range.key}`}
                className={`${styles.rangePill} ${selectedRange === range.key ? styles.rangePillActive : ''}`}
                onClick={() => setSelectedRange(range.key)}
              >
                {range.label}
              </button>
            ))}
          </div>

          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📊</span>
            <h2 className={styles.emptyTitle}>No Data Yet</h2>
            <p className={styles.emptyText}>
              Start logging your expenses and paychecks to see beautiful analytics and insights about your spending habits.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Analytics">
      <div className={styles.analyticsContainer}>
        {/* ================================================================
            Date Range Selector
            ================================================================ */}
        <div className={styles.dateRangeSelector} id="analytics-date-range">
          {DATE_RANGES.map((range) => (
            <button
              key={range.key}
              id={`range-${range.key}`}
              className={`${styles.rangePill} ${selectedRange === range.key ? styles.rangePillActive : ''}`}
              onClick={() => setSelectedRange(range.key)}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* ================================================================
            Summary Row
            ================================================================ */}
        <div className={styles.summaryRow} id="analytics-summary">
          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIconBox} ${styles.summaryIconIncome}`}>💰</div>
            <div className={styles.summaryInfo}>
              <span className={styles.summaryLabel}>Total Income</span>
              <span className={styles.summaryValue}>{formatCurrency(totalIncome)}</span>
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIconBox} ${styles.summaryIconExpense}`}>💸</div>
            <div className={styles.summaryInfo}>
              <span className={styles.summaryLabel}>Total Expenses</span>
              <span className={styles.summaryValue}>{formatCurrency(totalExpenses)}</span>
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIconBox} ${styles.summaryIconNet}`}>
              {netBalance >= 0 ? '📈' : '📉'}
            </div>
            <div className={styles.summaryInfo}>
              <span className={styles.summaryLabel}>Net Balance</span>
              <span className={styles.summaryValue}>{formatCurrency(netBalance)}</span>
            </div>
          </div>
        </div>

        {/* ================================================================
            Charts Grid
            ================================================================ */}
        <div className={styles.chartsGrid}>
          {/* ---- 1. Spending by Category (Donut) ---- */}
          <div className={`${styles.glassCard} ${styles.delay1}`} id="chart-spending-category">
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.cardTitle}>
                  <span className={styles.cardTitleIcon}>🍩</span>
                  Spending by Category
                </div>
                <div className={styles.cardSubtitle}>
                  {categoryData.length} {categoryData.length === 1 ? 'category' : 'categories'}
                </div>
              </div>
            </div>

            {categoryData.length > 0 ? (
              <>
                <div className={`${styles.chartContainer} ${styles.donutWrapper}`}>
                  {/* Center label */}
                  <div className={styles.donutCenterLabel}>
                    <div className={styles.donutCenterAmount}>
                      {formatCurrency(totalExpenses)}
                    </div>
                    <div className={styles.donutCenterSubtext}>Total Spent</div>
                  </div>

                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="45%"
                        innerRadius="60%"
                        outerRadius="82%"
                        dataKey="value"
                        paddingAngle={2}
                        stroke="none"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CategoryTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Category Legend */}
                <div className={styles.categoryLegend}>
                  {categoryData.map((cat) => (
                    <div key={cat.id} className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: cat.color }} />
                      <span className={styles.legendIcon}>{cat.icon}</span>
                      <div className={styles.legendText}>
                        <div className={styles.legendName}>{cat.name}</div>
                        <div className={styles.legendAmount}>{formatCurrency(cat.value)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🍩</span>
                <p className={styles.emptyText}>No expense data for this period.</p>
              </div>
            )}
          </div>

          {/* ---- 2. Savings Rate ---- */}
          <div className={`${styles.glassCard} ${styles.delay2}`} id="chart-savings-rate">
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.cardTitle}>
                  <span className={styles.cardTitleIcon}>🎯</span>
                  Savings Rate
                </div>
                <div className={styles.cardSubtitle}>Goal contributions vs income</div>
              </div>
            </div>

            <div className={styles.savingsCard}>
              {/* SVG Progress Ring */}
              <div className={styles.savingsRingWrapper}>
                <svg
                  className={styles.savingsRing}
                  width={ringSize}
                  height={ringSize}
                  viewBox={`0 0 ${ringSize} ${ringSize}`}
                >
                  <defs>
                    <linearGradient id="savingsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <circle
                    className={styles.savingsRingBg}
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                  />
                  <circle
                    className={styles.savingsRingFill}
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    style={{
                      '--ring-circumference': ringCircumference,
                      '--ring-offset': ringOffset,
                    }}
                  />
                </svg>
                <div className={styles.savingsRingCenter}>
                  <span className={styles.savingsPercent}>
                    {savingsRate.toFixed(1)}
                    <span className={styles.savingsPercentSymbol}>%</span>
                  </span>
                </div>
              </div>

              {/* Savings Details */}
              <div className={styles.savingsDetails}>
                <div className={styles.savingsTitle}>Saved This Period</div>
                <div className={styles.savingsAmount}>{formatCurrency(totalSavings)}</div>

                {/* Trend Indicator */}
                <div
                  className={`${styles.savingsTrend} ${
                    savingsTrend > 0
                      ? styles.trendUp
                      : savingsTrend < 0
                      ? styles.trendDown
                      : styles.trendNeutral
                  }`}
                >
                  {savingsTrend > 0 ? '↑' : savingsTrend < 0 ? '↓' : '→'}
                  {Math.abs(savingsTrend).toFixed(1)}% vs prev period
                </div>

                {/* Breakdown */}
                <div className={styles.savingsBreakdown}>
                  <div className={styles.breakdownItem}>
                    <span className={styles.breakdownLabel}>Income</span>
                    <span className={styles.breakdownValue}>{formatCurrency(totalIncome)}</span>
                  </div>
                  <div className={styles.breakdownItem}>
                    <span className={styles.breakdownLabel}>Saved</span>
                    <span className={styles.breakdownValue}>{formatCurrency(totalSavings)}</span>
                  </div>
                  <div className={styles.breakdownItem}>
                    <span className={styles.breakdownLabel}>Spent</span>
                    <span className={styles.breakdownValue}>{formatCurrency(totalExpenses)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---- 3. Income vs Expenses (Bar) ---- */}
          <div className={`${styles.glassCard} ${styles.fullWidth} ${styles.delay3}`} id="chart-income-expense">
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.cardTitle}>
                  <span className={styles.cardTitleIcon}>📊</span>
                  Income vs Expenses
                </div>
                <div className={styles.cardSubtitle}>Monthly comparison</div>
              </div>
            </div>

            {monthlyBarData.length > 0 ? (
              <div className={`${styles.chartContainer} ${styles.chartContainerTall}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyBarData}
                    margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1e293b"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      axisLine={{ stroke: '#1e293b' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                      }
                    />
                    <Tooltip content={<IncomeExpenseTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ paddingTop: 12, fontSize: 12, color: '#94a3b8' }}
                    />
                    <Bar
                      dataKey="Income"
                      name="Income"
                      fill="#6366f1"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={40}
                    />
                    <Bar
                      dataKey="Expenses"
                      name="Expenses"
                      fill="#ef4444"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📊</span>
                <p className={styles.emptyText}>No monthly data for this period.</p>
              </div>
            )}
          </div>

          {/* ---- 4. Daily Spending Trend (Area) ---- */}
          <div className={`${styles.glassCard} ${styles.fullWidth} ${styles.delay4}`} id="chart-daily-spending">
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.cardTitle}>
                  <span className={styles.cardTitleIcon}>📈</span>
                  Daily Spending Trend
                </div>
                <div className={styles.cardSubtitle}>
                  {dailySpendingData.length} {dailySpendingData.length === 1 ? 'day' : 'days'} with spending
                </div>
              </div>
            </div>

            {dailySpendingData.length > 0 ? (
              <div className={`${styles.chartContainer} ${styles.chartContainerTall}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dailySpendingData}
                    margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1e293b"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={{ stroke: '#1e293b' }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                      }
                    />
                    <Tooltip content={<DailySpendingTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fill="url(#areaGradient)"
                      dot={false}
                      activeDot={{
                        r: 5,
                        fill: '#6366f1',
                        stroke: '#fff',
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📈</span>
                <p className={styles.emptyText}>No daily spending data for this period.</p>
              </div>
            )}
          </div>

          {/* ---- 5. Top Spending Categories ---- */}
          <div className={`${styles.glassCard} ${styles.fullWidth} ${styles.delay5}`} id="chart-top-categories">
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.cardTitle}>
                  <span className={styles.cardTitleIcon}>🏆</span>
                  Top Spending Categories
                </div>
                <div className={styles.cardSubtitle}>
                  Ranked by total amount spent
                </div>
              </div>
            </div>

            {topCategories.length > 0 ? (
              <div className={styles.topCategoriesList}>
                {topCategories.map((cat, index) => {
                  const maxVal = topCategories[0]?.value || 1;
                  const fillPercent = (cat.value / maxVal) * 100;

                  return (
                    <div key={cat.id} className={styles.topCategoryItem}>
                      <span className={styles.topCategoryRank}>{index + 1}</span>
                      <span className={styles.topCategoryIcon}>{cat.icon}</span>
                      <div className={styles.topCategoryInfo}>
                        <div className={styles.topCategoryHeader}>
                          <span className={styles.topCategoryName}>{cat.name}</span>
                          <span className={styles.topCategoryAmount}>
                            {formatCurrency(cat.value)}
                            <span className={styles.topCategoryPercent}>
                              {cat.percent.toFixed(1)}%
                            </span>
                          </span>
                        </div>
                        <div className={styles.topCategoryBarBg}>
                          <div
                            className={styles.topCategoryBarFill}
                            style={{
                              width: `${fillPercent}%`,
                              background: cat.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🏆</span>
                <p className={styles.emptyText}>No spending data for this period.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
