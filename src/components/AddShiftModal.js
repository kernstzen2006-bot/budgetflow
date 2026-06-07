'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './AddShiftModal.module.css';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function AddShiftModal({ isOpen, onClose, onSave, defaultRate }) {
  const { user } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(todayStr);
  const [hours, setHours] = useState('');
  const [rate, setRate] = useState(defaultRate || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      setHours('');
      setRate(defaultRate || '');
      setNotes('');
      setError('');
      setLoading(false);
    }
  }, [isOpen, defaultRate]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const estimatedEarnings = useCallback(() => {
    const h = parseFloat(hours) || 0;
    const r = parseFloat(rate) || 0;
    return (h * r).toFixed(2);
  }, [hours, rate]);

  const dismissError = () => {
    if (error) setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    dismissError();

    // Validation
    if (!date) {
      setError('Please select a date.');
      return;
    }
    if (!hours || parseFloat(hours) <= 0) {
      setError('Hours worked must be greater than 0.');
      return;
    }
    if (!rate || parseFloat(rate) <= 0) {
      setError('Hourly rate must be greater than 0.');
      return;
    }

    setLoading(true);

    try {
      const { error: insertError } = await supabase.from('shifts').insert([
        {
          user_id: user.id,
          date,
          hours: parseFloat(hours),
          hourly_rate: parseFloat(rate),
          notes: notes.trim() || null,
        },
      ]);

      if (insertError) throw insertError;

      // Success
      onSave();
      setDate(new Date().toISOString().split('T')[0]);
      setHours('');
      setRate(defaultRate || '');
      setNotes('');
      setError('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save shift. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Add Shift</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
            type="button"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSave}
          className={`${styles.form} ${loading ? styles.formDisabled : ''}`}
        >
          {/* Date */}
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="shift-date">
              Date
            </label>
            <input
              id="shift-date"
              type="date"
              className={styles.input}
              value={date}
              onChange={(e) => { setDate(e.target.value); dismissError(); }}
              disabled={loading}
              required
            />
          </div>

          {/* Hours Worked */}
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="shift-hours">
              Hours Worked
            </label>
            <input
              id="shift-hours"
              type="number"
              className={styles.input}
              step="0.25"
              min="0"
              placeholder="0.00"
              value={hours}
              onChange={(e) => { setHours(e.target.value); dismissError(); }}
              disabled={loading}
            />
          </div>

          {/* Hourly Rate */}
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="shift-rate">
              Hourly Rate (R)
            </label>
            <input
              id="shift-rate"
              type="number"
              className={styles.input}
              step="0.01"
              min="0"
              placeholder="0.00"
              value={rate}
              onChange={(e) => { setRate(e.target.value); dismissError(); }}
              disabled={loading}
            />
          </div>

          {/* Notes */}
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="shift-notes">
              Notes <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              id="shift-notes"
              className={styles.textarea}
              rows={3}
              placeholder="Any notes about this shift..."
              value={notes}
              onChange={(e) => { setNotes(e.target.value); dismissError(); }}
              disabled={loading}
            />
          </div>

          {/* Earnings Preview */}
          <div className={styles.earningsPreview}>
            <span className={styles.earningsLabel}>Estimated Earnings</span>
            <span className={styles.earningsValue}>R{estimatedEarnings()}</span>
          </div>

          {/* Error Display */}
          {error && (
            <div className={styles.errorCard}>
              <p className={styles.errorText}>{error}</p>
            </div>
          )}

          {/* Footer Buttons */}
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.saveButton} ${loading ? styles.saveButtonLoading : ''}`}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
