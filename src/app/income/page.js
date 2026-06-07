'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './Income.module.css';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import AppLayout from '@/components/AppLayout';
import AddShiftModal from '@/components/AddShiftModal';
import AddPaycheckModal from '@/components/AddPaycheckModal';

export default function IncomePage() {
  const { user } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [paychecks, setPaychecks] = useState([]);
  const [hourlyRate, setHourlyRate] = useState(0);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [newRate, setNewRate] = useState('');
  const [loading, setLoading] = useState(true);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showPaycheckModal, setShowPaycheckModal] = useState(false);

  /* ── helpers ── */
  const getMonthRange = useCallback((date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }, []);

  const formatMonthYear = (date) =>
    date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const isCurrentMonth = (date) => {
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  };

  const isFutureMonth = (date) => {
    const now = new Date();
    const check = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const current = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return check > current;
  };

  /* ── data fetching ── */
  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('hourly_rate')
      .eq('id', user.id)
      .single();
    if (data) {
      setHourlyRate(data.hourly_rate || 0);
      setNewRate(String(data.hourly_rate || ''));
    }
  }, [user?.id]);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { start, end } = getMonthRange(selectedMonth);

    const [shiftsRes, paychecksRes] = await Promise.all([
      supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false }),
      supabase
        .from('paychecks')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false }),
    ]);

    setShifts(shiftsRes.data || []);
    setPaychecks(paychecksRes.data || []);
    setLoading(false);
  }, [user?.id, selectedMonth, getMonthRange]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── rate editing ── */
  const handleSaveRate = async () => {
    const parsed = parseFloat(newRate);
    if (isNaN(parsed) || parsed < 0) return;
    await supabase
      .from('profiles')
      .update({ hourly_rate: parsed })
      .eq('id', user.id);
    setHourlyRate(parsed);
    setIsEditingRate(false);
  };

  const handleCancelRate = () => {
    setNewRate(String(hourlyRate));
    setIsEditingRate(false);
  };

  /* ── month navigation ── */
  const navigateMonth = (dir) => {
    const next = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + dir, 1);
    if (dir > 0 && isFutureMonth(next)) return;
    setSelectedMonth(next);
  };

  /* ── delete handlers ── */
  const deleteShift = async (id) => {
    if (!window.confirm('Delete this shift?')) return;
    await supabase.from('shifts').delete().eq('id', id);
    fetchData();
  };

  const deletePaycheck = async (id) => {
    if (!window.confirm('Delete this paycheck?')) return;
    await supabase.from('paychecks').delete().eq('id', id);
    fetchData();
  };

  /* ── computed values ── */
  const estimatedIncome = shifts.reduce(
    (sum, s) => sum + (s.hours || 0) * (s.hourly_rate || 0),
    0,
  );
  const actualIncome = paychecks.reduce((sum, p) => sum + (p.amount || 0), 0);
  const comparisonMax = Math.max(estimatedIncome, actualIncome, 1);

  /* ── render ── */
  return (
    <AppLayout pageTitle="Income">
      <div className={styles.page}>
        {/* ── Hourly-Rate Badge ── */}
        <div className={styles.rateCard}>
          <div className={styles.rateInner}>
            <span className={styles.rateLabel}>Hourly Rate</span>

            {isEditingRate ? (
              <div className={styles.rateEditRow}>
                <div className={styles.rateInputWrap}>
                  <span className={styles.currencySign}>$</span>
                  <input
                    className={styles.rateInput}
                    type="number"
                    min="0"
                    step="0.01"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    autoFocus
                  />
                </div>
                <button className={styles.rateSaveBtn} onClick={handleSaveRate}>
                  ✓
                </button>
                <button className={styles.rateCancelBtn} onClick={handleCancelRate}>
                  ✕
                </button>
              </div>
            ) : (
              <div className={styles.rateDisplay}>
                <span className={styles.rateValue}>{formatCurrency(hourlyRate)}</span>
                <button
                  className={styles.rateEditBtn}
                  onClick={() => {
                    setNewRate(String(hourlyRate));
                    setIsEditingRate(true);
                  }}
                  aria-label="Edit hourly rate"
                >
                  ✏️
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Month Selector ── */}
        <div className={styles.monthSelector}>
          <button className={styles.monthArrow} onClick={() => navigateMonth(-1)} aria-label="Previous month">
            ‹
          </button>
          <span className={styles.monthLabel}>{formatMonthYear(selectedMonth)}</span>
          <button
            className={`${styles.monthArrow} ${isFutureMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1)) ? styles.monthArrowDisabled : ''}`}
            onClick={() => navigateMonth(1)}
            disabled={isFutureMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        {/* ── Monthly Summary ── */}
        <div className={styles.summaryCard}>
          <h2 className={styles.summaryTitle}>Monthly Summary</h2>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryItemLabel}>Estimated Income</span>
              <span className={styles.summaryItemValue}>{formatCurrency(estimatedIncome)}</span>
              <div className={styles.barTrack}>
                <div
                  className={`${styles.barFill} ${styles.barEstimated}`}
                  style={{ width: `${(estimatedIncome / comparisonMax) * 100}%` }}
                />
              </div>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryItemLabel}>Actual Income</span>
              <span className={`${styles.summaryItemValue} ${styles.actualValue}`}>
                {formatCurrency(actualIncome)}
              </span>
              <div className={styles.barTrack}>
                <div
                  className={`${styles.barFill} ${styles.barActual}`}
                  style={{ width: `${(actualIncome / comparisonMax) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Two-column body ── */}
        <div className={styles.columns}>
          {/* ── Shifts ── */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleRow}>
                <h2 className={styles.sectionTitle}>Shifts</h2>
                <span className={styles.countBadge}>{shifts.length}</span>
              </div>
              <button className={styles.addBtn} onClick={() => setShowShiftModal(true)}>
                <span className={styles.addBtnIcon}>+</span> Add Shift
              </button>
            </div>

            {loading ? (
              <div className={styles.loader}>
                <div className={styles.spinner} />
              </div>
            ) : shifts.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyEmoji}>⏰</span>
                <p className={styles.emptyText}>
                  No shifts logged this month.
                  <br />
                  Start tracking your hours!
                </p>
              </div>
            ) : (
              <ul className={styles.list}>
                {shifts.map((shift, i) => (
                  <li
                    key={shift.id}
                    className={styles.card}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className={styles.cardMain}>
                      <div className={styles.cardLeft}>
                        <span className={styles.cardDate}>{formatDate(shift.date)}</span>
                        {shift.notes && (
                          <span className={styles.cardNotes} title={shift.notes}>
                            {shift.notes.length > 40
                              ? shift.notes.slice(0, 40) + '…'
                              : shift.notes}
                          </span>
                        )}
                      </div>
                      <div className={styles.cardRight}>
                        <span className={styles.hoursChip}>{shift.hours} hrs</span>
                        <span className={styles.cardRate}>
                          @ {formatCurrency(shift.hourly_rate)}/hr
                        </span>
                        <span className={styles.cardEarnings}>
                          {formatCurrency(shift.hours * shift.hourly_rate)}
                        </span>
                      </div>
                    </div>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => deleteShift(shift.id)}
                      aria-label="Delete shift"
                    >
                      🗑
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Income ── */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleRow}>
                <h2 className={styles.sectionTitle}>Income Received</h2>
                <span className={styles.countBadge}>{paychecks.length}</span>
              </div>
              <button className={styles.addBtn} onClick={() => setShowPaycheckModal(true)}>
                <span className={styles.addBtnIcon}>+</span> Add Income
              </button>
            </div>

            {loading ? (
              <div className={styles.loader}>
                <div className={styles.spinner} />
              </div>
            ) : paychecks.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyEmoji}>💰</span>
                <p className={styles.emptyText}>
                  No income recorded this month.
                  <br />
                  Add your first income entry!
                </p>
              </div>
            ) : (
              <ul className={styles.list}>
                {paychecks.map((pc, i) => (
                  <li
                    key={pc.id}
                    className={styles.card}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className={styles.cardMain}>
                      <div className={styles.cardLeft}>
                        <span className={styles.cardDate}>{formatDate(pc.date)}</span>
                        {pc.period_start && pc.period_end && (
                          <span className={styles.cardPeriod}>
                            {formatDate(pc.period_start)} – {formatDate(pc.period_end)}
                          </span>
                        )}
                        {pc.notes && (
                          <span className={styles.cardNotes} title={pc.notes}>
                            {pc.notes.length > 40
                              ? pc.notes.slice(0, 40) + '…'
                              : pc.notes}
                          </span>
                        )}
                        <span className={styles.incomeTypeBadge}>
                          {pc.income_type || 'Wages'}
                        </span>
                      </div>
                      <div className={styles.cardRight}>
                        <span className={styles.paycheckAmount}>
                          {formatCurrency(pc.amount)}
                        </span>
                      </div>
                    </div>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => deletePaycheck(pc.id)}
                      aria-label="Delete income"
                    >
                      🗑
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* ── Modals ── */}
      {showShiftModal && (
        <AddShiftModal
          isOpen={showShiftModal}
          onClose={() => setShowShiftModal(false)}
          onSave={() => {
            setShowShiftModal(false);
            fetchData();
          }}
        />
      )}
      {showPaycheckModal && (
        <AddPaycheckModal
          isOpen={showPaycheckModal}
          userId={user?.id}
          onClose={() => setShowPaycheckModal(false)}
          onSave={() => {
            setShowPaycheckModal(false);
            fetchData();
          }}
        />
      )}
    </AppLayout>
  );
}
