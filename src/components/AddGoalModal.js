'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './AddGoalModal.module.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const EMOJI_OPTIONS = [
  '🎯', '🏠', '✈️', '📚', '💰', '🎓', '🚗', '💻',
  '🎮', '🏥', '🎁', '⭐', '🔥', '💎', '🌟', '🏖️',
  '📱', '🎵', '🏋️', '🐶', '👶', '💍', '🎨', '🧳',
];

const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
];

// ---------------------------------------------------------------------------
// AddGoalModal
// ---------------------------------------------------------------------------
export default function AddGoalModal({ isOpen, onClose, onSave, userId, goal }) {
  const isEditing = !!goal;

  // Form state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [targetAmount, setTargetAmount] = useState('');
  const [percentage, setPercentage] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // -----------------------------------------------------------------------
  // Pre-fill when editing
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (isOpen && goal) {
      setName(goal.name || '');
      setIcon(goal.icon || '🎯');
      setTargetAmount(goal.target_amount?.toString() || '');
      setPercentage(goal.percentage?.toString() || '');
      setColor(goal.color || '#6366f1');
      setDeadline(goal.deadline || '');
      setError('');
    } else if (isOpen && !goal) {
      // Reset for new goal
      setName('');
      setIcon('🎯');
      setTargetAmount('');
      setPercentage('');
      setColor('#6366f1');
      setDeadline('');
      setError('');
    }
  }, [isOpen, goal]);

  // -----------------------------------------------------------------------
  // Close on Escape
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // -----------------------------------------------------------------------
  // Submit handler
  // -----------------------------------------------------------------------
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim()) {
      setError('Please enter a goal name.');
      return;
    }

    const parsedTarget = parseFloat(targetAmount);
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      setError('Please enter a valid target amount.');
      return;
    }

    const parsedPct = parseFloat(percentage);
    if (isNaN(parsedPct) || parsedPct < 0 || parsedPct > 100) {
      setError('Percentage must be between 0 and 100.');
      return;
    }

    setSaving(true);

    try {
      const goalData = {
        user_id: userId,
        name: name.trim(),
        icon,
        target_amount: parsedTarget,
        percentage: parsedPct,
        color,
        deadline: deadline || null,
        is_active: true,
      };

      if (isEditing) {
        // Update existing goal
        const { error: updateErr } = await supabase
          .from('goals')
          .update(goalData)
          .eq('id', goal.id);

        if (updateErr) throw updateErr;
      } else {
        // Insert new goal
        const { error: insertErr } = await supabase
          .from('goals')
          .insert({
            ...goalData,
            current_amount: 0,
          });

        if (insertErr) throw insertErr;
      }

      onSave();
    } catch (err) {
      console.error('Error saving goal:', err);
      setError(err.message || 'Failed to save goal. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [name, targetAmount, percentage, icon, color, deadline, userId, isEditing, goal, onSave]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal glow */}
        <div className={styles.modalGlow} />

        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {isEditing ? 'Edit Goal' : 'Create New Goal'}
          </h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            type="button"
            id="goal-modal-close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className={styles.errorMsg}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </div>
        )}

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit}>

          {/* Emoji Picker */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Icon</label>
            <div className={styles.emojiGrid}>
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`${styles.emojiBtn} ${icon === emoji ? styles.emojiBtnActive : ''}`}
                  onClick={() => setIcon(emoji)}
                  id={`goal-emoji-${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="goal-name">Goal Name</label>
            <input
              id="goal-name"
              className={styles.input}
              type="text"
              placeholder="e.g. Emergency Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={60}
              autoComplete="off"
            />
          </div>

          {/* Target Amount */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="goal-target">Target Amount</label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputPrefix}>$</span>
              <input
                id="goal-target"
                className={`${styles.input} ${styles.inputWithPrefix}`}
                type="number"
                placeholder="5000.00"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                required
                min="1"
                step="0.01"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Percentage of Income */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="goal-percentage">
              % of Income to Allocate
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="goal-percentage"
                className={`${styles.input} ${styles.inputWithSuffix}`}
                type="number"
                placeholder="10"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                required
                min="0"
                max="100"
                step="0.5"
                autoComplete="off"
              />
              <span className={styles.inputSuffix}>%</span>
            </div>
            <span className={styles.fieldHint}>
              This percentage of every paycheck will be swept into this goal
            </span>
          </div>

          {/* Color Picker */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Color</label>
            <div className={styles.colorGrid}>
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.colorBtn} ${color === c ? styles.colorBtnActive : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  id={`goal-color-${c.replace('#', '')}`}
                >
                  {color === c && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="goal-deadline">
              Deadline <span className={styles.optionalTag}>Optional</span>
            </label>
            <input
              id="goal-deadline"
              className={styles.input}
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Preview badge */}
          {name && (
            <div className={styles.previewCard} style={{ '--preview-color': color }}>
              <span className={styles.previewIcon}>{icon}</span>
              <span className={styles.previewName}>{name}</span>
              {targetAmount && (
                <span className={styles.previewAmount}>
                  ${parseFloat(targetAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={saving}
              id="goal-modal-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveBtn}
              disabled={saving}
              id="goal-modal-save"
            >
              {saving && <span className={styles.spinner} />}
              {saving
                ? (isEditing ? 'Saving...' : 'Creating...')
                : (isEditing ? 'Save Changes' : 'Create Goal')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
