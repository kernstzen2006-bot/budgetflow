'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import styles from './AddPaycheckModal.module.css';

export default function AddPaycheckModal({ isOpen, onClose, onSave, userId }) {
  const [amount, setAmount] = useState('');
  const [incomeType, setIncomeType] = useState('Wages');
  const [date, setDate] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [goalsLoading, setGoalsLoading] = useState(false);

  const getTodayDate = useCallback(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const resetForm = useCallback(() => {
    setAmount('');
    setIncomeType('Wages');
    setDate(getTodayDate());
    setPeriodStart('');
    setPeriodEnd('');
    setNotes('');
    setError('');
  }, [getTodayDate]);

  const fetchGoals = useCallback(async () => {
    if (!userId) return;
    setGoalsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (fetchError) {
        console.error('Error fetching goals:', fetchError);
        setGoals([]);
      } else {
        setGoals(data || []);
      }
    } catch (err) {
      console.error('Error fetching goals:', err);
      setGoals([]);
    } finally {
      setGoalsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      fetchGoals();
    }
  }, [isOpen, resetForm, fetchGoals]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const parsedAmount = parseFloat(amount) || 0;
  const goalsWithSweep = goals.filter((g) => g.percentage > 0);
  const showSweepPreview = parsedAmount > 0 && goalsWithSweep.length > 0;

  const sweepAllocations = goalsWithSweep.map((goal) => ({
    ...goal,
    allocation: (goal.percentage / 100) * parsedAmount,
  }));

  const totalAllocated = sweepAllocations.reduce(
    (sum, g) => sum + g.allocation,
    0
  );
  const remainingAfterSweep = parsedAmount - totalAllocated;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSave = async () => {
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid paycheck amount greater than 0.');
      return;
    }
    if (!date) {
      setError('Please select a paycheck date.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: paycheckData, error: paycheckError } = await supabase
        .from('paychecks')
        .insert([
          {
            user_id: userId,
            amount: parseFloat(amount),
            income_type: incomeType,
            date,
            period_start: periodStart || null,
            period_end: periodEnd || null,
            notes: notes.trim() || null,
          },
        ])
        .select()
        .single();

      if (paycheckError) {
        setError(`Failed to save paycheck: ${paycheckError.message}`);
        setLoading(false);
        return;
      }

      const insertedPaycheck = paycheckData;
      let contributionErrors = [];

      for (const goal of goalsWithSweep) {
        const contribution = (goal.percentage / 100) * parseFloat(amount);

        try {
          const { error: contribError } = await supabase
            .from('goal_contributions')
            .insert([
              {
                user_id: userId,
                goal_id: goal.id,
                paycheck_id: insertedPaycheck.id,
                amount: contribution,
              },
            ]);

          if (contribError) {
            contributionErrors.push(
              `${goal.name}: ${contribError.message}`
            );
            continue;
          }

          const { error: updateError } = await supabase
            .from('goals')
            .update({
              current_amount: goal.current_amount + contribution,
            })
            .eq('id', goal.id);

          if (updateError) {
            contributionErrors.push(
              `${goal.name} update: ${updateError.message}`
            );
          }
        } catch (err) {
          contributionErrors.push(`${goal.name}: ${err.message}`);
        }
      }

      if (contributionErrors.length > 0) {
        console.warn('Some goal contributions failed:', contributionErrors);
      }

      onSave();
      resetForm();
      onClose();
    } catch (err) {
      setError(`An unexpected error occurred: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Add Income</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
            type="button"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {error && (
            <div className={styles.errorCard}>
              <span className={styles.errorIcon}>⚠️</span>
              <p className={styles.errorText}>{error}</p>
            </div>
          )}

          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            {/* Amount & Type */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="paycheck-amount">
                  Amount <span className={styles.required}>*</span>
                </label>
                <div className={styles.amountInputWrapper}>
                  <span className={styles.currencySymbol}>R</span>
                  <input
                    id="paycheck-amount"
                    className={styles.input}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="income-type">
                  Income Type
                </label>
                <select
                  id="income-type"
                  className={styles.input}
                  value={incomeType}
                  onChange={(e) => setIncomeType(e.target.value)}
                  disabled={loading}
                >
                  <option value="Wages">Wages / Salary</option>
                  <option value="Side Hustle">Side Hustle</option>
                  <option value="Gift">Gift</option>
                  <option value="Refund">Refund</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Date */}
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="paycheck-date">
                Date <span className={styles.required}>*</span>
              </label>
              <input
                id="paycheck-date"
                className={styles.input}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Period Start / End */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="paycheck-period-start">
                  Period Start
                </label>
                <input
                  id="paycheck-period-start"
                  className={styles.input}
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="paycheck-period-end">
                  Period End
                </label>
                <input
                  id="paycheck-period-end"
                  className={styles.input}
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Notes */}
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="paycheck-notes">
                Notes
              </label>
              <textarea
                id="paycheck-notes"
                className={styles.textarea}
                rows={3}
                placeholder="Optional notes about this paycheck..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
              />
            </div>
          </form>

          {/* Sweep Preview */}
          {goalsLoading && (
            <div className={styles.sweepLoading}>
              <div className={styles.sweepLoadingSpinner} />
              <span>Loading goals...</span>
            </div>
          )}

          {!goalsLoading && parsedAmount > 0 && goals.length > 0 && goalsWithSweep.length === 0 && (
            <div className={styles.sweepCard}>
              <div className={styles.sweepHeader}>
                <span className={styles.sweepIcon}>💰</span>
                <span className={styles.sweepTitle}>Auto Goal Sweep Preview</span>
              </div>
              <p className={styles.sweepEmpty}>
                No active goals with auto-sweep percentages.
              </p>
            </div>
          )}

          {showSweepPreview && (
            <div className={styles.sweepCard}>
              <div className={styles.sweepHeader}>
                <span className={styles.sweepIcon}>💰</span>
                <span className={styles.sweepTitle}>Auto Goal Sweep Preview</span>
              </div>

              <div className={styles.sweepGoals}>
                {sweepAllocations.map((goal) => (
                  <div key={goal.id} className={styles.sweepGoalRow}>
                    <div className={styles.sweepGoalInfo}>
                      <span className={styles.sweepGoalIcon}>
                        {goal.icon || '🎯'}
                      </span>
                      <span className={styles.sweepGoalName}>{goal.name}</span>
                    </div>
                    <div className={styles.sweepGoalValues}>
                      <span className={styles.sweepGoalPercentage}>
                        {goal.percentage}%
                      </span>
                      <span className={styles.sweepGoalAmount}>
                        R{goal.allocation.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.sweepDivider} />

              <div className={styles.sweepTotals}>
                <div className={styles.sweepTotalRow}>
                  <span className={styles.sweepTotalLabel}>Total Allocated</span>
                  <span className={styles.sweepTotalAmount}>
                    R{totalAllocated.toFixed(2)}
                  </span>
                </div>
                <div className={styles.sweepRemainingRow}>
                  <span className={styles.sweepRemainingLabel}>
                    Remaining After Sweep
                  </span>
                  <span className={styles.sweepRemainingAmount}>
                    R{remainingAfterSweep.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={loading}
            type="button"
          >
            Cancel
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={loading}
            type="button"
          >
            {loading ? (
              <span className={styles.savingState}>
                <span className={styles.savingSpinner} />
                Processing...
              </span>
            ) : (
              'Save Income'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
