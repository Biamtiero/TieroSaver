import type {
  User,
  AuthResponse,
  Expense,
  ExpenseOverviewResponse,
  DailyGroupSummary,
  BudgetOverviewResponse,
  LimitStatusItem,
  SavingsGoal,
  SavingsOverviewResponse,
  SavingsTransaction,
} from '../types'

// LocalStorage Keys
const USERS_KEY = 'tierosaver_local_users'
const CURRENT_USER_KEY = 'tierosaver_local_current_user'

interface StoredBudget {
  daily_limit: number
  weekly_limit: number
  monthly_limit: number
}

interface StoredUser extends User {
  password?: string
}

// Helpers
const getStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : defaultValue
  } catch {
    return defaultValue
  }
}

const setStorage = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value))
}

// Get user-specific storage keys
const getUserExpensesKey = (userId: number | string) => `tierosaver_expenses_user_${userId}`
const getUserBudgetKey = (userId: number | string) => `tierosaver_budget_user_${userId}`
const getUserSavingsKey = (userId: number | string) => `tierosaver_savings_user_${userId}`

// Resolve the currently authenticated user
export const getCurrentUser = (): User => {
  // Check 'user' from AuthContext first
  try {
    const saved = localStorage.getItem('user')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed && parsed.id) return parsed
    }
  } catch {}

  const localUser = getStorage<User | null>(CURRENT_USER_KEY, null)
  if (localUser && localUser.id) return localUser

  // Fallback demo user
  return {
    id: 1,
    name: 'Demo User',
    email: 'demo@tierosaver.com',
    created_at: new Date().toISOString(),
  }
}

// Initialize starter sample data ONLY for User 1 (Demo) so new registered users start fresh
const initSampleDataForUser = (userId: number | string, isDemo = false) => {
  const expKey = getUserExpensesKey(userId)
  const existingExpenses = getStorage<Expense[]>(expKey, [])

  // Only create dummy transactions for user ID 1 or demo
  if (isDemo && existingExpenses.length === 0) {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    const samples: Expense[] = [
      {
        id: Date.now() - 1000,
        user_id: userId,
        title: 'Makan Siang & Minuman',
        amount: 35000,
        category: 'Makanan & Minuman',
        expense_date: today,
        notes: 'Makan siang favorit',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: Date.now() - 2000,
        user_id: userId,
        title: 'Bensin Motor',
        amount: 25000,
        category: 'Transportasi',
        expense_date: today,
        notes: 'Pertalite',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: Date.now() - 3000,
        user_id: userId,
        title: 'Belanja Kebutuhan Harian',
        amount: 85000,
        category: 'Belanja',
        expense_date: yesterday,
        notes: 'Sabun & cemilan',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ]
    setStorage(expKey, samples)
  }

  // Budgets
  const budgetKey = getUserBudgetKey(userId)
  const existingBudget = getStorage<StoredBudget | null>(budgetKey, null)
  if (!existingBudget) {
    setStorage(budgetKey, {
      daily_limit: 100000,
      weekly_limit: 600000,
      monthly_limit: 2500000,
    })
  }

  // Savings
  const savKey = getUserSavingsKey(userId)
  const existingSavings = getStorage<SavingsGoal[]>(savKey, [])
  if (isDemo && existingSavings.length === 0) {
    const sampleGoal: SavingsGoal = {
      id: Date.now(),
      user_id: userId,
      title: 'Target Tabungan Pertama',
      target_amount: 1000000,
      current_amount: 250000,
      target_date: '2026-12-31',
      notes: 'Contoh tabungan impian',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      progress_percentage: 25,
      remaining_amount: 750000,
      is_reached: false,
      transactions: [
        {
          id: Date.now(),
          savings_goal_id: 1,
          user_id: userId,
          type: 'deposit',
          amount: 250000,
          notes: 'Setoran tabungan awal',
          created_at: new Date().toISOString(),
        },
      ],
    }
    setStorage(savKey, [sampleGoal])
  }
}

// -------------------------------------------------------------
// Auth API
// -------------------------------------------------------------
export const localAuth = {
  login: async (email: string, password?: string): Promise<AuthResponse> => {
    const users = getStorage<StoredUser[]>(USERS_KEY, [])
    const normalizedEmail = email.trim().toLowerCase()
    let user = users.find((u) => u.email.toLowerCase() === normalizedEmail)

    if (!user) {
      // Auto-register seamless experience if user enters new credentials
      const name = normalizedEmail.split('@')[0] || 'User'
      user = {
        id: users.length + 1,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        email: normalizedEmail,
        password: password || '',
        created_at: new Date().toISOString(),
      }
      users.push(user)
      setStorage(USERS_KEY, users)
    }

    const cleanUser: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    }

    setStorage(CURRENT_USER_KEY, cleanUser)
    localStorage.setItem('user', JSON.stringify(cleanUser))
    localStorage.setItem('token', `local_jwt_token_${cleanUser.id}_${Date.now()}`)

    // Init sample data only if it is user #1
    initSampleDataForUser(cleanUser.id, cleanUser.id === 1)

    return {
      token: `local_jwt_token_${cleanUser.id}_${Date.now()}`,
      user: cleanUser,
    }
  },

  register: async (name: string, email: string, password?: string): Promise<AuthResponse> => {
    const users = getStorage<StoredUser[]>(USERS_KEY, [])
    const normalizedEmail = email.trim().toLowerCase()
    let user = users.find((u) => u.email.toLowerCase() === normalizedEmail)

    if (user) {
      // Update name if changed
      if (name) user.name = name
      setStorage(USERS_KEY, users)
    } else {
      user = {
        id: users.length + 1,
        name: name.trim() || 'User',
        email: normalizedEmail,
        password: password || '',
        created_at: new Date().toISOString(),
      }
      users.push(user)
      setStorage(USERS_KEY, users)
    }

    const cleanUser: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    }

    setStorage(CURRENT_USER_KEY, cleanUser)
    localStorage.setItem('user', JSON.stringify(cleanUser))
    localStorage.setItem('token', `local_jwt_token_${cleanUser.id}_${Date.now()}`)

    // Clean start for new registered users (no dummy expenses)
    initSampleDataForUser(cleanUser.id, false)

    return {
      token: `local_jwt_token_${cleanUser.id}_${Date.now()}`,
      user: cleanUser,
    }
  },

  getMe: async (): Promise<User> => {
    return getCurrentUser()
  },

  updateProfile: async (data: {
    name?: string
    email?: string
    avatar_url?: string
    phone?: string
    currency?: string
    bio?: string
  }): Promise<User> => {
    const currentUser = getCurrentUser()
    const users = getStorage<StoredUser[]>(USERS_KEY, [])
    const index = users.findIndex((u) => u.id === currentUser.id)

    if (data.email && data.email.trim().toLowerCase() !== currentUser.email.toLowerCase()) {
      const emailTaken = users.some(
        (u) => u.id !== currentUser.id && u.email.toLowerCase() === data.email!.trim().toLowerCase()
      )
      if (emailTaken) {
        throw new Error('Email tersebut sudah digunakan oleh akun lain')
      }
    }

    const updatedUser: StoredUser = {
      ...(index !== -1 ? users[index] : currentUser),
      ...data,
      id: currentUser.id,
      email: data.email ? data.email.trim().toLowerCase() : currentUser.email,
      name: data.name ? data.name.trim() : currentUser.name,
      avatar_url: data.avatar_url !== undefined ? data.avatar_url : currentUser.avatar_url,
      phone: data.phone !== undefined ? data.phone.trim() : currentUser.phone,
      currency: data.currency || currentUser.currency || 'IDR',
      bio: data.bio !== undefined ? data.bio : currentUser.bio,
      created_at: currentUser.created_at,
    }

    if (index !== -1) {
      users[index] = updatedUser
    } else {
      users.push(updatedUser)
    }
    setStorage(USERS_KEY, users)

    const cleanUser: User = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatar_url: updatedUser.avatar_url,
      phone: updatedUser.phone,
      currency: updatedUser.currency,
      bio: updatedUser.bio,
      created_at: updatedUser.created_at,
    }

    setStorage(CURRENT_USER_KEY, cleanUser)
    localStorage.setItem('user', JSON.stringify(cleanUser))
    return cleanUser
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<{ message: string }> => {
    const currentUser = getCurrentUser()
    const users = getStorage<StoredUser[]>(USERS_KEY, [])
    const index = users.findIndex((u) => u.id === currentUser.id)
    if (index === -1) throw new Error('Akun tidak ditemukan')

    const storedUser = users[index]
    if (storedUser.password && storedUser.password !== oldPassword) {
      throw new Error('Kata sandi lama tidak sesuai')
    }

    if (newPassword.length < 6) {
      throw new Error('Kata sandi baru minimal 6 karakter')
    }

    storedUser.password = newPassword
    users[index] = storedUser
    setStorage(USERS_KEY, users)
    return { message: 'Kata sandi berhasil diperbarui' }
  },

  resetData: async (): Promise<{ message: string }> => {
    const currentUser = getCurrentUser()
    setStorage(getUserExpensesKey(currentUser.id), [])
    setStorage(getUserSavingsKey(currentUser.id), [])
    setStorage(getUserBudgetKey(currentUser.id), {
      daily_limit: 100000,
      weekly_limit: 600000,
      monthly_limit: 2500000,
    })
    return { message: 'Semua data transaksi & anggaran telah berhasil direset' }
  },
}

// -------------------------------------------------------------
// Expenses API (Strictly Scoped by User ID)
// -------------------------------------------------------------
export const localExpenses = {
  getOverview: async (date?: string, month?: string): Promise<ExpenseOverviewResponse> => {
    const user = getCurrentUser()
    const expKey = getUserExpensesKey(user.id)
    const userExpenses = getStorage<Expense[]>(expKey, [])

    const todayStr = new Date().toISOString().split('T')[0]
    const targetDate = date || todayStr

    // Calculate Today Sum
    const todaySum = userExpenses
      .filter((e) => e.expense_date === todayStr)
      .reduce((sum, e) => sum + e.amount, 0)

    // Calculate Week Sum (last 7 days)
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 86400000)
    const weekSum = userExpenses
      .filter((e) => {
        const d = new Date(e.expense_date)
        return d >= weekAgo && d <= now
      })
      .reduce((sum, e) => sum + e.amount, 0)

    // Calculate Month Sum
    const targetMonth = month || todayStr.substring(0, 7) // YYYY-MM
    const monthExpenses = userExpenses.filter((e) => e.expense_date.startsWith(targetMonth))
    const monthSum = monthExpenses.reduce((sum, e) => sum + e.amount, 0)

    // Selected Date Sum
    const selectedDateSum = userExpenses
      .filter((e) => e.expense_date === targetDate)
      .reduce((sum, e) => sum + e.amount, 0)

    // Daily breakdown for charts (group by date)
    const groupMap = new Map<string, Expense[]>()
    userExpenses.forEach((exp) => {
      const arr = groupMap.get(exp.expense_date) || []
      arr.push(exp)
      groupMap.set(exp.expense_date, arr)
    })

    const daily_breakdown: DailyGroupSummary[] = Array.from(groupMap.entries())
      .map(([d, items]) => ({
        date: d,
        total_amount: items.reduce((s, it) => s + it.amount, 0),
        count: items.length,
        expenses: items,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))

    // Category breakdown
    const category_breakdown: Record<string, number> = {}
    monthExpenses.forEach((exp) => {
      category_breakdown[exp.category] = (category_breakdown[exp.category] || 0) + exp.amount
    })

    return {
      selected_date: targetDate,
      selected_date_sum: selectedDateSum,
      today_sum: todaySum,
      week_sum: weekSum,
      month_sum: monthSum,
      expenses: [...userExpenses].sort((a, b) => b.expense_date.localeCompare(a.expense_date)),
      daily_breakdown,
      category_breakdown,
    }
  },

  createExpense: async (data: {
    title: string
    amount: number
    category: string
    expense_date: string
    notes?: string
  }): Promise<{ message: string; expense: Expense; date_total: number }> => {
    const user = getCurrentUser()
    const expKey = getUserExpensesKey(user.id)
    const expenses = getStorage<Expense[]>(expKey, [])

    const newExp: Expense = {
      id: Date.now(),
      user_id: user.id,
      title: data.title,
      amount: data.amount,
      category: data.category,
      expense_date: data.expense_date,
      notes: data.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    expenses.unshift(newExp)
    setStorage(expKey, expenses)

    const dateTotal = expenses
      .filter((e) => e.expense_date === data.expense_date)
      .reduce((sum, e) => sum + e.amount, 0)

    return {
      message: 'Expense created successfully',
      expense: newExp,
      date_total: dateTotal,
    }
  },

  updateExpense: async (
    id: number,
    data: {
      title?: string
      amount?: number
      category?: string
      expense_date?: string
      notes?: string
    }
  ): Promise<Expense> => {
    const user = getCurrentUser()
    const expKey = getUserExpensesKey(user.id)
    const expenses = getStorage<Expense[]>(expKey, [])
    const index = expenses.findIndex((e) => e.id === id)
    if (index === -1) throw new Error('Expense not found')

    const updated: Expense = {
      ...expenses[index],
      ...data,
      updated_at: new Date().toISOString(),
    }
    expenses[index] = updated
    setStorage(expKey, expenses)
    return updated
  },

  deleteExpense: async (id: number): Promise<{ message: string }> => {
    const user = getCurrentUser()
    const expKey = getUserExpensesKey(user.id)
    let expenses = getStorage<Expense[]>(expKey, [])
    expenses = expenses.filter((e) => e.id !== id)
    setStorage(expKey, expenses)
    return { message: 'Expense deleted successfully' }
  },
}

// -------------------------------------------------------------
// Budgets API (Strictly Scoped by User ID)
// -------------------------------------------------------------
export const localBudgets = {
  getOverview: async (): Promise<BudgetOverviewResponse> => {
    const user = getCurrentUser()
    const budgetKey = getUserBudgetKey(user.id)
    const budget = getStorage<StoredBudget>(budgetKey, {
      daily_limit: 100000,
      weekly_limit: 600000,
      monthly_limit: 2500000,
    })

    const expensesOverview = await localExpenses.getOverview()

    const makeLimitItem = (
      period: 'daily' | 'weekly' | 'monthly',
      limit: number,
      spent: number
    ): LimitStatusItem => {
      if (limit <= 0) {
        return {
          period,
          limit: 0,
          spent,
          remaining: 0,
          percentage: 0,
          status: 'not_set',
        }
      }
      const percentage = Math.round((spent / limit) * 100)
      const remaining = Math.max(0, limit - spent)
      let status: 'safe' | 'warning' | 'exceeded' = 'safe'
      if (percentage >= 100) status = 'exceeded'
      else if (percentage >= 80) status = 'warning'

      return {
        period,
        limit,
        spent,
        remaining,
        percentage,
        status,
      }
    }

    return {
      daily_limit: budget.daily_limit,
      weekly_limit: budget.weekly_limit,
      monthly_limit: budget.monthly_limit,
      daily: makeLimitItem('daily', budget.daily_limit, expensesOverview.today_sum),
      weekly: makeLimitItem('weekly', budget.weekly_limit, expensesOverview.week_sum),
      monthly: makeLimitItem('monthly', budget.monthly_limit, expensesOverview.month_sum),
    }
  },

  setLimits: async (data: {
    daily_limit: number
    weekly_limit: number
    monthly_limit: number
  }): Promise<BudgetOverviewResponse> => {
    const user = getCurrentUser()
    const budgetKey = getUserBudgetKey(user.id)
    const newBudget: StoredBudget = {
      daily_limit: data.daily_limit,
      weekly_limit: data.weekly_limit,
      monthly_limit: data.monthly_limit,
    }
    setStorage(budgetKey, newBudget)
    return localBudgets.getOverview()
  },
}

// -------------------------------------------------------------
// Savings API (Strictly Scoped by User ID)
// -------------------------------------------------------------
export const localSavings = {
  getGoals: async (): Promise<SavingsOverviewResponse> => {
    const user = getCurrentUser()
    const savKey = getUserSavingsKey(user.id)
    const goals = getStorage<SavingsGoal[]>(savKey, [])

    const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0)
    const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0)

    return {
      total_saved: totalSaved,
      total_target: totalTarget,
      goals_count: goals.length,
      goals,
    }
  },

  createGoal: async (data: {
    title: string
    target_amount: number
    target_date?: string
    notes?: string
  }): Promise<SavingsGoal> => {
    const user = getCurrentUser()
    const savKey = getUserSavingsKey(user.id)
    const goals = getStorage<SavingsGoal[]>(savKey, [])

    const newGoal: SavingsGoal = {
      id: Date.now(),
      user_id: user.id,
      title: data.title,
      target_amount: data.target_amount,
      current_amount: 0,
      target_date: data.target_date,
      notes: data.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      progress_percentage: 0,
      remaining_amount: data.target_amount,
      is_reached: false,
      transactions: [],
    }

    goals.unshift(newGoal)
    setStorage(savKey, goals)
    return newGoal
  },

  updateGoal: async (
    id: number,
    data: {
      title?: string
      target_amount?: number
      target_date?: string
      notes?: string
    }
  ): Promise<SavingsGoal> => {
    const user = getCurrentUser()
    const savKey = getUserSavingsKey(user.id)
    const goals = getStorage<SavingsGoal[]>(savKey, [])
    const index = goals.findIndex((g) => g.id === id)
    if (index === -1) throw new Error('Goal not found')

    const current = goals[index]
    const targetAmount = data.target_amount ?? current.target_amount
    const progressPercentage =
      targetAmount > 0
        ? Math.min(100, Math.round((current.current_amount / targetAmount) * 10000) / 100)
        : 0

    const updated: SavingsGoal = {
      ...current,
      ...data,
      target_amount: targetAmount,
      progress_percentage: progressPercentage,
      remaining_amount: Math.max(0, targetAmount - current.current_amount),
      is_reached: current.current_amount >= targetAmount,
      updated_at: new Date().toISOString(),
    }

    goals[index] = updated
    setStorage(savKey, goals)
    return updated
  },

  deleteGoal: async (id: number): Promise<{ message: string }> => {
    const user = getCurrentUser()
    const savKey = getUserSavingsKey(user.id)
    let goals = getStorage<SavingsGoal[]>(savKey, [])
    goals = goals.filter((g) => g.id !== id)
    setStorage(savKey, goals)
    return { message: 'Savings goal deleted successfully' }
  },

  addTransaction: async (
    id: number,
    data: {
      type: 'deposit' | 'withdraw'
      amount: number
      notes?: string
    }
  ): Promise<{ message: string; goal: SavingsGoal }> => {
    const user = getCurrentUser()
    const savKey = getUserSavingsKey(user.id)
    const goals = getStorage<SavingsGoal[]>(savKey, [])
    const index = goals.findIndex((g) => g.id === id)
    if (index === -1) throw new Error('Goal not found')

    const goal = goals[index]
    const newTx: SavingsTransaction = {
      id: Date.now(),
      savings_goal_id: goal.id,
      user_id: goal.user_id,
      type: data.type,
      amount: data.amount,
      notes: data.notes || '',
      created_at: new Date().toISOString(),
    }

    let newCurrent = goal.current_amount
    if (data.type === 'deposit') {
      newCurrent += data.amount
    } else {
      newCurrent = Math.max(0, newCurrent - data.amount)
    }

    const progressPercentage =
      goal.target_amount > 0
        ? Math.min(100, Math.round((newCurrent / goal.target_amount) * 10000) / 100)
        : 0

    const updatedGoal: SavingsGoal = {
      ...goal,
      current_amount: newCurrent,
      progress_percentage: progressPercentage,
      remaining_amount: Math.max(0, goal.target_amount - newCurrent),
      is_reached: newCurrent >= goal.target_amount,
      transactions: [newTx, ...(goal.transactions || [])],
      updated_at: new Date().toISOString(),
    }

    goals[index] = updatedGoal
    setStorage(savKey, goals)
    return {
      message: 'Transaction recorded successfully',
      goal: updatedGoal,
    }
  },
}
