'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import AppLayout from '@/components/AppLayout';
import AddGoalModal from '@/components/AddGoalModal';
import styles from './Goals.module.css';

// ---------------------------------------------------------------------------
// SVG Circular Progress Ring
// ---------------------------------------------------------------------------
function ProgressRing({ percentage, color, size = 100, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(percentage, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg
      className={styles.progressRing}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      {/* Background track */}
      <circle
        className={styles.ringTrack}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Progress arc */}
      <circle
        className={styles.ringProgress}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        fill="none"
        stroke={color}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
      />
      {/* Center text */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className={styles.ringText}
        fill="var(--text-primary)"
      >
        {Math.round(clamped)}%
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Goal Card
// ---------------------------------------------------------------------------
function GoalCard({ goal, avgIncome, onEdit, onDelete }) {
  const pct = goal.target_amount > 0
    ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
    : 0;

  // Estimate completion date
  const estimatedCompletion = useCallback(() => {
    if (!avgIncome || goal.percentage <= 0 || goal.current_amount >= goal.target_amount) {
      return null;
    }
    const monthlyContribution = (avgIncome * goal.percentage) / 100;
    if (monthlyContribution <= 0) return null;
    const remaining = goal.target_amount - goal.current_amount;
    const monthsLeft = Math.ceil(remaining / monthlyContribution);
    const est = new Date();
    est.setMonth(est.getMonth() + monthsLeft);
    return est;
  }, [avgIncome, goal]);

  const estDate = estimatedCompletion();

  return (
    <div
      className={styles.goalCard}
      style={{ '--goal-color': goal.color || '#6366f1' }}
    >
      <div className={styles.goalCardBorder} />

      {/* Header */}
      <div className={styles.goalHeader}>
        <div className={styles.goalIdentity}>
          <span className={styles.goalIcon}>{goal.icon || '🎯'}</span>
          <h3 className={styles.goalName}>{goal.name}</h3>
        </div>
        <div className={styles.goalActions}>
          <button
            className={styles.actionBtn}
            onClick={() => onEdit(goal)}
            title="Edit goal"
            id={`goal-edit-${goal.id}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            className={`${styles.actionBtn} ${styles.deleteBtn}`}
            onClick={() => onDelete(goal.id)}
            title="Delete goal"
            id={`goal-delete-${goal.id}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress Ring */}
      <div className={styles.ringContainer}>
        <ProgressRing percentage={pct} color={goal.color || '#6366f1'} size={110} strokeWidth={9} />
      </div>

      {/* Amounts */}
      <div className={styles.goalAmounts}>
        <span className={styles.currentAmount}>{formatCurrency(goal.current_amount)}</span>
        <span className={styles.amountSep}>of</span>
        <span className={styles.targetAmount}>{formatCurrency(goal.target_amount)}</span>
      </div>

      {/* Meta badges */}
      <div className={styles.goalMeta}>
        <span className={styles.allocationBadge} style={{ backgroundColor: `${goal.color}22`, color: goal.color }}>
          {goal.percentage}% of income
        </span>
        {goal.deadline && (
          <span className={styles.deadlineBadge}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Due by {new Date(goal.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </span>
        )}
        {estDate && goal.current_amount < goal.target_amount && (
          <span className={styles.estBadge}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Est. {estDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>

      {/* Completed overlay */}
      {pct >= 100 && (
        <div className={styles.completedOverlay}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>Goal Reached!</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Goals Page
// ---------------------------------------------------------------------------
export default function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [paychecks, setPaychecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // -----------------------------------------------------------------------
  // Fetch data
  // -----------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [goalsRes, contribRes, paychecksRes] = await Promise.all([
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('goal_contributions')
          .select('*, goals(name, icon, color)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('paychecks')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false }),
      ]);

      if (goalsRes.data) setGoals(goalsRes.data);
      if (contribRes.data) setContributions(contribRes.data);
      if (paychecksRes.data) setPaychecks(paychecksRes.data);
    } catch (err) {
      console.error('Error fetching goals data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -----------------------------------------------------------------------
  // Computed values
  // -----------------------------------------------------------------------
  const activeGoals = goals.filter((g) => g.is_active !== false);
  const totalPercentage = activeGoals.reduce((sum, g) => sum + (g.percentage || 0), 0);

  // Average monthly income (from last 6 paychecks or all available)
  const avgIncome = paychecks.length > 0
    ? paychecks.slice(0, 6).reduce((sum, p) => sum + Number(p.amount), 0) / Math.min(paychecks.length, 6)
    : 0;

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------
  const handleDeleteGoal = async (goalId) => {
    if (deleteConfirm !== goalId) {
      setDeleteConfirm(goalId);
      return;
    }

    try {
      // Delete contributions first, then the goal
      await supabase.from('goal_contributions').delete().eq('goal_id', goalId);
      const { error } = await supabase.from('goals').delete().eq('id', goalId);
      if (error) throw error;
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      console.error('Error deleting goal:', err);
    }
  };

  const handleEdit = (goal) => {
    setEditGoal(goal);
    setModalOpen(true);
  };

  const handleSave = () => {
    setModalOpen(false);
    setEditGoal(null);
    fetchData();
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditGoal(null);
  };

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------
  const renderAllocationBar = () => {
    if (activeGoals.length === 0) return null;

    return (
      <div className={styles.allocationBar}>
        {activeGoals.map((goal) => {
          const widthPct = totalPercentage > 0
            ? ((goal.percentage || 0) / totalPercentage) * 100
            : 0;
          return (
            <div
              key={goal.id}
              className={styles.allocationSegment}
              style={{
                width: `${widthPct}%`,
                backgroundColor: goal.color || '#6366f1',
              }}
              title={`${goal.name}: ${goal.percentage}%`}
            />
          );
        })}
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <AppLayout pageTitle="Goals">
      <div className={styles.goalsPage}>

        {/* Allocation Summary Card */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryGlow} />
          <div className={styles.summaryHeader}>
            <div className={styles.summaryLeft}>
              <div className={styles.sweepBadge}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Auto-Sweep Active
              </div>
              <h2 className={styles.summaryTitle}>
                {totalPercentage}% of every paycheck is automatically saved
              </h2>
              <p className={styles.summarySubtext}>
                Distributed across {activeGoals.length} active goal{activeGoals.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className={styles.summaryRight}>
              <div className={styles.totalPctCircle}>
                <span className={styles.totalPctValue}>{totalPercentage}%</span>
                <span className={styles.totalPctLabel}>allocated</span>
              </div>
            </div>
          </div>

          {/* Warning if over 100% */}
          {totalPercentage > 100 && (
            <div className={styles.overWarning}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Total allocation exceeds 100% — adjust your goal percentages
            </div>
          )}

          {/* Stacked Allocation Bar */}
          {renderAllocationBar()}

          {/* Legend */}
          {activeGoals.length > 0 && (
            <div className={styles.allocationLegend}>
              {activeGoals.map((goal) => (
                <div key={goal.id} className={styles.legendItem}>
                  <span
                    className={styles.legendDot}
                    style={{ backgroundColor: goal.color || '#6366f1' }}
                  />
                  <span className={styles.legendName}>{goal.name}</span>
                  <span className={styles.legendPct}>{goal.percentage}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Goal Button */}
        <button
          className={styles.addGoalBtn}
          onClick={() => { setEditGoal(null); setModalOpen(true); }}
          id="goals-add-btn"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add New Goal
        </button>

        {/* Loading State */}
        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading your goals...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && goals.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎯</div>
            <h3 className={styles.emptyTitle}>No goals yet</h3>
            <p className={styles.emptyText}>
              Create your first savings goal and BudgetFlow will automatically allocate
              a percentage of each paycheck towards it.
            </p>
          </div>
        )}

        {/* Goals Grid */}
        {!loading && goals.length > 0 && (
          <div className={styles.goalsGrid}>
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                avgIncome={avgIncome}
                onEdit={handleEdit}
                onDelete={handleDeleteGoal}
              />
            ))}
          </div>
        )}

        {/* Delete Confirmation Tooltip */}
        {deleteConfirm && (
          <div className={styles.deleteToast}>
            <span>Click delete again to confirm</span>
            <button
              className={styles.cancelDeleteBtn}
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Contribution History */}
        {!loading && contributions.length > 0 && (
          <div className={styles.historySection}>
            <button
              className={styles.historyToggle}
              onClick={() => setHistoryOpen(!historyOpen)}
              id="goals-history-toggle"
            >
              <div className={styles.historyToggleLeft}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Recent Contributions</span>
                <span className={styles.historyCount}>{contributions.length}</span>
              </div>
              <svg
                className={`${styles.chevron} ${historyOpen ? styles.chevronOpen : ''}`}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {historyOpen && (
              <div className={styles.historyList}>
                {contributions.map((contrib) => {
                  const goalData = contrib.goals;
                  return (
                    <div key={contrib.id} className={styles.historyItem}>
                      <div className={styles.historyItemLeft}>
                        <span
                          className={styles.historyDot}
                          style={{ backgroundColor: goalData?.color || '#6366f1' }}
                        />
                        <div className={styles.historyInfo}>
                          <span className={styles.historyGoalName}>
                            {goalData?.icon || '🎯'} {goalData?.name || 'Goal'}
                          </span>
                          <span className={styles.historyDate}>
                            {formatDate(contrib.created_at?.split('T')[0] || contrib.created_at)}
                          </span>
                        </div>
                      </div>
                      <span className={styles.historyAmount}>
                        +{formatCurrency(contrib.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Add/Edit Goal Modal */}
        <AddGoalModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          userId={user?.id}
          goal={editGoal}
        />
      </div>
    </AppLayout>
  );
}
