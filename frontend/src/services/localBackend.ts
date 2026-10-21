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
const EXPENSES_KEY = 'tierosaver_local_expenses'
const BUDGETS_KEY = 'tierosaver_local_budgets'
const SAVINGS_KEY = 'tierosaver_local_savings'

interface StoredBudget {
  daily_limit: number
  weekly_limit: number
  monthly_limit: number
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

// Initialize default sample data if fresh
const initSampleData = (userId: number) => {
  const existingExpenses = getStorage<Expense[]>(EXPENSES_KEY, [])
  if (existingExpenses.length === 0) {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0]

    const samples: Expense[] = [
      {
        id: 1,
        user_id: userId,
        title: 'Makan Siang & Es Kopi',
        amount: 35000,
        category: 'Makanan & Minuman',
        expense_date: today,
        notes: 'Makan di warung favorit',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        user_id: userId,
        title: 'Bensin Motor',
        amount: 25000,
        category: 'Transportasi',
        expense_date: today,
        notes: 'Pertalite full tank',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 3,
        user_id: userId,
        title: 'Belanja Mingguan',
        amount: 120000,
        category: 'Belanja',
        expense_date: yesterday,
        notes: 'Bahan masakan & sabun',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 4,
        user_id: userId,
        title: 'Langganan Streaming Musik',
        amount: 55000,
        category: 'Hiburan',
        expense_date: twoDaysAgo,
        notes: 'Paket 1 bulan',
        created_at: new Date(Date.now() - 172800000).toISOString(),
        updated_at: new Date(Date.now() - 172800000).toISOString(),
      },
    ]
    setStorage(EXPENSES_KEY, samples)
  }

  const existingBudgets = getStorage<Record<number, StoredBudget>>(BUDGETS_KEY, {})
  if (!existingBudgets[userId]) {
    existingBudgets[userId] = {
      daily_limit: 100000,
      weekly_limit: 600000,
      monthly_limit: 2500000,
    }
    setStorage(BUDGETS_KEY, existingBudgets)
  }

  const existingSavings = getStorage<SavingsGoal[]>(SAVINGS_KEY, [])
  if (existingSavings.length === 0) {
    const sampleGoal: SavingsGoal = {
      id: 1,
      user_id: userId,
      title: 'Dana Darurat & Liburan Akhir Tahun',
      target_amount: 3000000,
      current_amount: 1250000,
      target_date: '2026-12-31',
      notes: 'Target tabungan mandiri',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      progress_percentage: 41.67,
      remaining_amount: 1750000,
      is_reached: false,
      transactions: [
        {
          id: 1,
          savings_goal_id: 1,
          user_id: userId,
          type: 'deposit',
          amount: 1000000,
          notes: 'Setoran awal',
          created_at: new Date(Date.now() - 604800000).toISOString(),
        },
        {
          id: 2,
          savings_goal_id: 1,
          user_id: userId,
          type: 'deposit',
          amount: 250000,
          notes: 'Sisa uang saku',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
    }
    setStorage(SAVINGS_KEY, [sampleGoal])
  }
}

// -------------------------------------------------------------
// Auth
// -------------------------------------------------------------
export const localAuth = {
  login: async (email: string, _password: string): Promise<AuthResponse> => {
    const users = getStorage<User[]>(USERS_KEY, [])
    let user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())

    if (!user) {
      // Auto-register convenience for seamless testing
      const name = email.split('@')[0] || 'User'
      user = {
        id: users.length + 1,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        email,
        created_at: new Date().toISOString(),
      }
      users.push(user)
      setStorage(USERS_KEY, users)
    }

    setStorage(CURRENT_USER_KEY, user)
    initSampleData(user.id)

    return {
      token: `local_jwt_token_${user.id}_${Date.now()}`,
      user,
    }
  },

  register: async (name: string, email: string, _password: string): Promise<AuthResponse> => {
    const users = getStorage<User[]>(USERS_KEY, [])
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (existing) {
      setStorage(CURRENT_USER_KEY, existing)
      initSampleData(existing.id)
      return {
        token: `local_jwt_token_${existing.id}_${Date.now()}`,
        user: existing,
      }
    }

    const newUser: User = {
      id: users.length + 1,
      name,
      email,
      created_at: new Date().toISOString(),
    }
    users.push(newUser)
    setStorage(USERS_KEY, users)
    setStorage(CURRENT_USER_KEY, newUser)
    initSampleData(newUser.id)

    return {
      token: `local_jwt_token_${newUser.id}_${Date.now()}`,
      user: newUser,
    }
  },

  getMe: async (): Promise<User> => {
    const user = getStorage<User | null>(CURRENT_USER_KEY, null)
    if (!user) {
      throw new Error('Not authenticated')
    }
    return user
  },
}

// -------------------------------------------------------------
// Expenses
// -------------------------------------------------------------
export const localExpenses = {
  getOverview: async (date?: string, month?: string): Promise<ExpenseOverviewResponse> => {
    const user = getStorage<User | null>(CURRENT_USER_KEY, null)
    const userId = user?.id || 1
    const allExpenses = getStorage<Expense[]>(EXPENSES_KEY, []).filter(
      (e) => e.user_id === userId
    )

    const todayStr = new Date().toISOString().split('T')[0]
    const targetDate = date || todayStr

    // Calculate Today Sum
    const todaySum = allExpenses
      .filter((e) => e.expense_date === todayStr)
      .reduce((sum, e) => sum + e.amount, 0)

    // Calculate Week Sum (last 7 days)
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 86400000)
    const weekSum = allExpenses
      .filter((e) => {
        const d = new Date(e.expense_date)
        return d >= weekAgo && d <= now
      })
      .reduce((sum, e) => sum + e.amount, 0)

    // Calculate Month Sum
    const targetMonth = month || todayStr.substring(0, 7) // YYYY-MM
    const monthExpenses = allExpenses.filter((e) => e.expense_date.startsWith(targetMonth))
    const monthSum = monthExpenses.reduce((sum, e) => sum + e.amount, 0)

    // Selected Date Sum
    const selectedDateSum = allExpenses
      .filter((e) => e.expense_date === targetDate)
      .reduce((sum, e) => sum + e.amount, 0)

    // Daily breakdown for charts (group by date)
    const groupMap = new Map<string, Expense[]>()
    allExpenses.forEach((exp) => {
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
      expenses: allExpenses.sort((a, b) => b.expense_date.localeCompare(a.expense_date)),
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
    const user = getStorage<User | null>(CURRENT_USER_KEY, null)
    const userId = user?.id || 1
    const expenses = getStorage<Expense[]>(EXPENSES_KEY, [])

    const newExp: Expense = {
      id: Date.now(),
      user_id: userId,
      title: data.title,
      amount: data.amount,
      category: data.category,
      expense_date: data.expense_date,
      notes: data.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    expenses.unshift(newExp)
    setStorage(EXPENSES_KEY, expenses)

    const dateTotal = expenses
      .filter((e) => e.user_id === userId && e.expense_date === data.expense_date)
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
    const expenses = getStorage<Expense[]>(EXPENSES_KEY, [])
    const index = expenses.findIndex((e) => e.id === id)
    if (index === -1) throw new Error('Expense not found')

    const updated: Expense = {
      ...expenses[index],
      ...data,
      updated_at: new Date().toISOString(),
    }
    expenses[index] = updated
    setStorage(EXPENSES_KEY, expenses)
    return updated
  },

  deleteExpense: async (id: number): Promise<{ message: string }> => {
    let expenses = getStorage<Expense[]>(EXPENSES_KEY, [])
    expenses = expenses.filter((e) => e.id !== id)
    setStorage(EXPENSES_KEY, expenses)
    return { message: 'Expense deleted successfully' }
  },
}

// -------------------------------------------------------------
// Budgets
// -------------------------------------------------------------
export const localBudgets = {
  getOverview: async (): Promise<BudgetOverviewResponse> => {
    const user = getStorage<User | null>(CURRENT_USER_KEY, null)
    const userId = user?.id || 1
    const budgetsMap = getStorage<Record<number, StoredBudget>>(BUDGETS_KEY, {})
    const budget = budgetsMap[userId] || {
      daily_limit: 100000,
      weekly_limit: 600000,
      monthly_limit: 2500000,
    }

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
    const user = getStorage<User | null>(CURRENT_USER_KEY, null)
    const userId = user?.id || 1
    const budgetsMap = getStorage<Record<number, StoredBudget>>(BUDGETS_KEY, {})
    budgetsMap[userId] = {
      daily_limit: data.daily_limit,
      weekly_limit: data.weekly_limit,
      monthly_limit: data.monthly_limit,
    }
    setStorage(BUDGETS_KEY, budgetsMap)
    return localBudgets.getOverview()
  },
}

// -------------------------------------------------------------
// Savings
// -------------------------------------------------------------
export const localSavings = {
  getGoals: async (): Promise<SavingsOverviewResponse> => {
    const user = getStorage<User | null>(CURRENT_USER_KEY, null)
    const userId = user?.id || 1
    const goals = getStorage<SavingsGoal[]>(SAVINGS_KEY, []).filter(
      (g) => g.user_id === userId
    )

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
    const user = getStorage<User | null>(CURRENT_USER_KEY, null)
    const userId = user?.id || 1
    const goals = getStorage<SavingsGoal[]>(SAVINGS_KEY, [])

    const newGoal: SavingsGoal = {
      id: Date.now(),
      user_id: userId,
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
    setStorage(SAVINGS_KEY, goals)
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
    const goals = getStorage<SavingsGoal[]>(SAVINGS_KEY, [])
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
    setStorage(SAVINGS_KEY, goals)
    return updated
  },

  deleteGoal: async (id: number): Promise<{ message: string }> => {
    let goals = getStorage<SavingsGoal[]>(SAVINGS_KEY, [])
    goals = goals.filter((g) => g.id !== id)
    setStorage(SAVINGS_KEY, goals)
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
    const goals = getStorage<SavingsGoal[]>(SAVINGS_KEY, [])
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
    setStorage(SAVINGS_KEY, goals)
    return {
      message: 'Transaction recorded successfully',
      goal: updatedGoal,
    }
  },
}
