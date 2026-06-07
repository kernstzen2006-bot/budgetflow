'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency, getMonthName } from '@/lib/utils'
import AppLayout from '@/components/AppLayout'
import AddExpenseModal from '@/components/AddExpenseModal'
import styles from './Expenses.module.css'

export default function Expenses() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('all')
  const [dateFilter, setDateFilter] = useState('This Month')
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const fetchData = async () => {
    if (!user) return
    setLoading(true)

    // Fetch categories
    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name')
    setCategories(cats || [])

    // Fetch expenses with category details
    const { data: exps } = await supabase
      .from('expenses')
      .select('*, categories(*)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    
    setExpenses(exps || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [user])

  // Filter logic
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // Category filter
      if (selectedCategoryId !== 'all' && exp.category_id !== selectedCategoryId) return false
      
      // Search filter
      if (searchQuery && !exp.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false

      // Date filter
      const expDate = new Date(exp.date)
      const now = new Date()
      
      if (dateFilter === 'This Month') {
        if (expDate.getMonth() !== now.getMonth() || expDate.getFullYear() !== now.getFullYear()) return false
      } else if (dateFilter === 'Last Month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        if (expDate.getMonth() !== lastMonth.getMonth() || expDate.getFullYear() !== lastMonth.getFullYear()) return false
      } else if (dateFilter === 'Last 3 Months') {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        if (expDate < threeMonthsAgo) return false
      }

      return true
    })
  }, [expenses, selectedCategoryId, searchQuery, dateFilter])

  // Aggregate stats for current view
  const totalSpent = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  
  // Group by date for display
  const groupedExpenses = useMemo(() => {
    const groups = {}
    filteredExpenses.forEach(exp => {
      const dateStr = new Date(exp.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
      if (!groups[dateStr]) groups[dateStr] = []
      groups[dateStr].push(exp)
    })
    return groups
  }, [filteredExpenses])

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return
    await supabase.from('expenses').delete().eq('id', id)
    fetchData()
  }

  return (
    <AppLayout pageTitle="Expenses">
      <div className={styles.container}>
        
        {/* Top Summary */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryInfo}>
            <span className={styles.summaryLabel}>Total Spent</span>
            <span className={styles.summaryAmount}>{formatCurrency(totalSpent)}</span>
          </div>
          <div className={styles.summaryComparison}>
            {/* simplified comparison badge */}
            <span className={styles.badgeDanger}>Expense View</span>
          </div>
        </div>

        {/* Categories Filter */}
        <div className={styles.categoryFilterScroll}>
          <div className={styles.categoryFilters}>
            <button 
              className={`${styles.categoryChip} ${selectedCategoryId === 'all' ? styles.activeChip : ''}`}
              onClick={() => setSelectedCategoryId('all')}
            >
              All Categories
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                className={`${styles.categoryChip} ${selectedCategoryId === cat.id ? styles.activeChip : ''}`}
                onClick={() => setSelectedCategoryId(cat.id)}
                style={{ borderColor: selectedCategoryId === cat.id ? cat.color : 'transparent' }}
              >
                <span>{cat.icon}</span> {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Date Filter */}
        <div className={styles.filterControls}>
          <input 
            type="text" 
            placeholder="Search expenses..." 
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select 
            className={styles.dateSelect}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option>This Month</option>
            <option>Last Month</option>
            <option>Last 3 Months</option>
            <option>All Time</option>
          </select>
        </div>

        {/* Expenses List */}
        <div className={styles.expensesList}>
          {loading ? (
            <div className={styles.loadingState}>Loading expenses...</div>
          ) : filteredExpenses.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>💸</span>
              <p>No expenses found.</p>
            </div>
          ) : (
            Object.entries(groupedExpenses).map(([date, exps]) => (
              <div key={date} className={styles.dateGroup}>
                <h4 className={styles.dateHeader}>{date}</h4>
                {exps.map(exp => (
                  <div key={exp.id} className={styles.expenseCard}>
                    <div className={styles.expIconWrapper} style={{ backgroundColor: `${exp.categories?.color}20`, color: exp.categories?.color }}>
                      {exp.categories?.icon || '🛒'}
                    </div>
                    <div className={styles.expDetails}>
                      <span className={styles.expDescription}>{exp.description || exp.categories?.name}</span>
                      <span className={styles.expCategoryName} style={{ color: exp.categories?.color }}>
                        {exp.categories?.name}
                      </span>
                    </div>
                    <div className={styles.expRight}>
                      <span className={styles.expAmount}>-{formatCurrency(exp.amount)}</span>
                      <button onClick={() => handleDelete(exp.id)} className={styles.deleteBtn}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Floating Add Button */}
        <button 
          className={styles.fab}
          onClick={() => setIsAddModalOpen(true)}
          aria-label="Add Expense"
        >
          +
        </button>

        {isAddModalOpen && (
          <AddExpenseModal 
            isOpen={isAddModalOpen} 
            onClose={() => setIsAddModalOpen(false)} 
            onSave={() => {
              setIsAddModalOpen(false)
              fetchData()
            }}
            categories={categories}
            userId={user?.id}
          />
        )}

      </div>
    </AppLayout>
  )
}
