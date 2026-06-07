'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './AddExpenseModal.module.css'

export default function AddExpenseModal({ isOpen, onClose, onSave, categories, userId }) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!amount || !categoryId || !date) {
      setError('Please fill in all required fields')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase
      .from('expenses')
      .insert({
        user_id: userId,
        amount: parseFloat(amount),
        description: description || null,
        category_id: categoryId,
        date: date
      })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      setLoading(false)
      onSave()
    }
  }

  const quickAmounts = [1, 5, 10, 20, 50, 100]

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title}>Add Expense</h2>
        
        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.amountGroup}>
            <span className={styles.currencySymbol}>R</span>
            <input 
              type="number" 
              className={styles.amountInput}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              required
              autoFocus
            />
          </div>

          <div className={styles.quickAmounts}>
            {quickAmounts.map(amt => (
              <button 
                key={amt} 
                type="button" 
                className={styles.quickAmtBtn}
                onClick={() => setAmount(amt.toString())}
              >
                +R{amt}
              </button>
            ))}
          </div>

          <div className={styles.formGroup}>
            <label>Description (Optional)</label>
            <input 
              type="text" 
              className={styles.input}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Coffee at Starbucks"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Category</label>
            <select 
              className={styles.select}
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              required
            >
              <option value="" disabled>Select a category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Date</label>
            <input 
              type="date" 
              className={styles.input}
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={loading}>
              {loading ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
