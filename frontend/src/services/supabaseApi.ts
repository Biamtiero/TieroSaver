import { supabase } from './supabaseClient'
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

const getClient = () => {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

// Helper to get current profile
const getCurrentUserProfile = async (): Promise<User> => {
  const client = getClient()
  const { data: { user }, error: userError } = await client.auth.getUser()
  if (userError || !user) throw new Error('Tidak terautentikasi')

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    // If trigger hasn't created profile yet, fallback to user metadata
    return {
      id: user.id,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      created_at: user.created_at,
    }
  }

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    avatar_url: profile.avatar_url || '',
    phone: profile.phone || '',
    currency: profile.currency || 'IDR',
    bio: profile.bio || '',
    created_at: profile.created_at,
  }
}

// -------------------------------------------------------------
// Auth
// -------------------------------------------------------------
export const supabaseAuth = {
  login: async (email: string, password?: string): Promise<AuthResponse> => {
    const client = getClient()
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password || '',
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Email atau kata sandi tidak cocok')
      }
      throw new Error(error.message)
    }

    if (!data.user || !data.session) {
      throw new Error('Gagal masuk ke akun')
    }

    const profile = await getCurrentUserProfile()
    return {
      token: data.session.access_token,
      user: profile,
    }
  },

  register: async (name: string, email: string, password?: string): Promise<AuthResponse> => {
    const client = getClient()
    const { data, error } = await client.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password || '',
      options: {
        data: {
          name: name.trim(),
        },
      },
    })

    if (error) {
      if (error.message.includes('already registered')) {
        throw new Error('Email ini sudah terdaftar. Silakan login.')
      }
      throw new Error(error.message)
    }

    if (!data.user) {
      throw new Error('Gagal mendaftar akun')
    }

    // Attempt login if session not automatically granted
    let token = data.session?.access_token || ''
    if (!token && password) {
      const loginRes = await client.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (loginRes.data.session) {
        token = loginRes.data.session.access_token
      }
    }

    const profile = await getCurrentUserProfile()
    return {
      token: token || 'authenticated',
      user: profile,
    }
  },

  getMe: async (): Promise<User> => {
    return getCurrentUserProfile()
  },

  updateProfile: async (data: {
    name?: string
    email?: string
    avatar_url?: string
    phone?: string
    currency?: string
    bio?: string
  }): Promise<User> => {
    const client = getClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) throw new Error('Tidak terautentikasi')

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (data.name !== undefined) updates.name = data.name
    if (data.avatar_url !== undefined) updates.avatar_url = data.avatar_url
    if (data.phone !== undefined) updates.phone = data.phone
    if (data.currency !== undefined) updates.currency = data.currency
    if (data.bio !== undefined) updates.bio = data.bio

    const { error } = await client
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (error) throw new Error(error.message)

    return getCurrentUserProfile()
  },

  changePassword: async (_oldPassword: string, newPassword: string): Promise<{ message: string }> => {
    const client = getClient()
    const { error } = await client.auth.updateUser({ password: newPassword })
    if (error) throw new Error(error.message)
    return { message: 'Kata sandi berhasil diperbarui' }
  },

  resetData: async (): Promise<{ message: string }> => {
    const client = getClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) throw new Error('Tidak terautentikasi')

    await client.from('expenses').delete().eq('user_id', user.id)
    await client.from('savings_goals').delete().eq('user_id', user.id)
    await client.from('budget_limits').update({
      daily_limit: 100000,
      weekly_limit: 600000,
      monthly_limit: 2500000,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id)

    return { message: 'Semua data transaksi di Supabase berhasil direset' }
  },
}

// -------------------------------------------------------------
// Expenses
// -------------------------------------------------------------
export const supabaseExpenses = {
  getOverview: async (date?: string, month?: string): Promise<ExpenseOverviewResponse> => {
    const client = getClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) throw new Error('Tidak terautentikasi')

    const todayStr = new Date().toISOString().split('T')[0]
    const targetDate = date || todayStr

    const { data: rows, error } = await client
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('expense_date', { ascending: false })

    if (error) throw new Error(error.message)
    const allExpenses: Expense[] = (rows || []).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      title: r.title,
      amount: Number(r.amount),
      category: r.category,
      expense_date: r.expense_date,
      notes: r.notes || '',
      created_at: r.created_at,
      updated_at: r.updated_at,
    }))

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
    const targetMonth = month || todayStr.substring(0, 7)
    const monthExpenses = allExpenses.filter((e) => e.expense_date.startsWith(targetMonth))
    const monthSum = monthExpenses.reduce((sum, e) => sum + e.amount, 0)

    // Selected Date Sum
    const selectedDateSum = allExpenses
      .filter((e) => e.expense_date === targetDate)
      .reduce((sum, e) => sum + e.amount, 0)

    // Daily breakdown for charts
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
      expenses: allExpenses,
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
    const client = getClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) throw new Error('Tidak terautentikasi')

    const { data: inserted, error } = await client
      .from('expenses')
      .insert({
        user_id: user.id,
        title: data.title,
        amount: data.amount,
        category: data.category,
        expense_date: data.expense_date,
        notes: data.notes || '',
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    const exp: Expense = {
      id: inserted.id,
      user_id: inserted.user_id,
      title: inserted.title,
      amount: Number(inserted.amount),
      category: inserted.category,
      expense_date: inserted.expense_date,
      notes: inserted.notes || '',
      created_at: inserted.created_at,
      updated_at: inserted.updated_at,
    }

    // Calculate new date total
    const overview = await supabaseExpenses.getOverview(data.expense_date)
    return {
      message: 'Pengeluaran berhasil dicatat di cloud Supabase!',
      expense: exp,
      date_total: overview.selected_date_sum,
    }
  },

  updateExpense: async (
    id: number | string,
    data: {
      title?: string
      amount?: number
      category?: string
      expense_date?: string
      notes?: string
    }
  ): Promise<Expense> => {
    const client = getClient()
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (data.title !== undefined) updates.title = data.title
    if (data.amount !== undefined) updates.amount = data.amount
    if (data.category !== undefined) updates.category = data.category
    if (data.expense_date !== undefined) updates.expense_date = data.expense_date
    if (data.notes !== undefined) updates.notes = data.notes

    const { data: updated, error } = await client
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)

    return {
      id: updated.id,
      user_id: updated.user_id,
      title: updated.title,
      amount: Number(updated.amount),
      category: updated.category,
      expense_date: updated.expense_date,
      notes: updated.notes || '',
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    }
  },

  deleteExpense: async (id: number | string): Promise<{ message: string }> => {
    const client = getClient()
    const { error } = await client.from('expenses').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { message: 'Pengeluaran berhasil dihapus' }
  },
}

// -------------------------------------------------------------
// Budgets
// -------------------------------------------------------------
export const supabaseBudgets = {
  getOverview: async (): Promise<BudgetOverviewResponse> => {
    const client = getClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) throw new Error('Tidak terautentikasi')

    const { data: row } = await client
      .from('budget_limits')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const budget = row || {
      daily_limit: 100000,
      weekly_limit: 600000,
      monthly_limit: 2500000,
    }

    const expensesOverview = await supabaseExpenses.getOverview()

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

    const dailyLimit = Number(budget.daily_limit)
    const weeklyLimit = Number(budget.weekly_limit)
    const monthlyLimit = Number(budget.monthly_limit)

    return {
      daily_limit: dailyLimit,
      weekly_limit: weeklyLimit,
      monthly_limit: monthlyLimit,
      daily: makeLimitItem('daily', dailyLimit, expensesOverview.today_sum),
      weekly: makeLimitItem('weekly', weeklyLimit, expensesOverview.week_sum),
      monthly: makeLimitItem('monthly', monthlyLimit, expensesOverview.month_sum),
    }
  },

  setLimits: async (data: {
    daily_limit: number
    weekly_limit: number
    monthly_limit: number
  }): Promise<BudgetOverviewResponse> => {
    const client = getClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) throw new Error('Tidak terautentikasi')

    const { error } = await client
      .from('budget_limits')
      .upsert({
        user_id: user.id,
        daily_limit: data.daily_limit,
        weekly_limit: data.weekly_limit,
        monthly_limit: data.monthly_limit,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (error) throw new Error(error.message)
    return supabaseBudgets.getOverview()
  },
}

// -------------------------------------------------------------
// Savings
// -------------------------------------------------------------
export const supabaseSavings = {
  getGoals: async (): Promise<SavingsOverviewResponse> => {
    const client = getClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) throw new Error('Tidak terautentikasi')

    const { data: goalsRows, error: goalsError } = await client
      .from('savings_goals')
      .select('*, savings_transactions(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (goalsError) throw new Error(goalsError.message)

    const goals: SavingsGoal[] = (goalsRows || []).map((g) => {
      const targetAmt = Number(g.target_amount)
      const currentAmt = Number(g.current_amount)
      const progress = targetAmt > 0 ? Math.min(100, Math.round((currentAmt / targetAmt) * 10000) / 100) : 0
      const txs: SavingsTransaction[] = (g.savings_transactions || []).map((t: any) => ({
        id: t.id,
        savings_goal_id: t.savings_goal_id,
        user_id: t.user_id,
        type: t.type,
        amount: Number(t.amount),
        notes: t.notes || '',
        created_at: t.created_at,
      })).sort((a: any, b: any) => b.id - a.id)

      return {
        id: g.id,
        user_id: g.user_id,
        title: g.title,
        target_amount: targetAmt,
        current_amount: currentAmt,
        target_date: g.target_date,
        notes: g.notes || '',
        created_at: g.created_at,
        updated_at: g.updated_at,
        progress_percentage: progress,
        remaining_amount: Math.max(0, targetAmt - currentAmt),
        is_reached: currentAmt >= targetAmt,
        transactions: txs,
      }
    })

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
    const client = getClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) throw new Error('Tidak terautentikasi')

    const { data: inserted, error } = await client
      .from('savings_goals')
      .insert({
        user_id: user.id,
        title: data.title,
        target_amount: data.target_amount,
        current_amount: 0,
        target_date: data.target_date || null,
        notes: data.notes || '',
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return {
      id: inserted.id,
      user_id: inserted.user_id,
      title: inserted.title,
      target_amount: Number(inserted.target_amount),
      current_amount: 0,
      target_date: inserted.target_date,
      notes: inserted.notes || '',
      created_at: inserted.created_at,
      updated_at: inserted.updated_at,
      progress_percentage: 0,
      remaining_amount: Number(inserted.target_amount),
      is_reached: false,
      transactions: [],
    }
  },

  updateGoal: async (
    id: number | string,
    data: {
      title?: string
      target_amount?: number
      target_date?: string
      notes?: string
    }
  ): Promise<SavingsGoal> => {
    const client = getClient()
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (data.title !== undefined) updates.title = data.title
    if (data.target_amount !== undefined) updates.target_amount = data.target_amount
    if (data.target_date !== undefined) updates.target_date = data.target_date || null
    if (data.notes !== undefined) updates.notes = data.notes

    const { data: updated, error } = await client
      .from('savings_goals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    const targetAmt = Number(updated.target_amount)
    const currentAmt = Number(updated.current_amount)

    return {
      id: updated.id,
      user_id: updated.user_id,
      title: updated.title,
      target_amount: targetAmt,
      current_amount: currentAmt,
      target_date: updated.target_date,
      notes: updated.notes || '',
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      progress_percentage: targetAmt > 0 ? Math.min(100, Math.round((currentAmt / targetAmt) * 10000) / 100) : 0,
      remaining_amount: Math.max(0, targetAmt - currentAmt),
      is_reached: currentAmt >= targetAmt,
    }
  },

  deleteGoal: async (id: number | string): Promise<{ message: string }> => {
    const client = getClient()
    const { error } = await client.from('savings_goals').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { message: 'Target tabungan berhasil dihapus' }
  },

  addTransaction: async (
    id: number | string,
    data: {
      type: 'deposit' | 'withdraw'
      amount: number
      notes?: string
    }
  ): Promise<{ message: string; goal: SavingsGoal }> => {
    const client = getClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) throw new Error('Tidak terautentikasi')

    // Fetch existing goal
    const { data: goalRow, error: fetchErr } = await client
      .from('savings_goals')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !goalRow) throw new Error('Target tabungan tidak ditemukan')

    // Insert transaction
    const { error: txErr } = await client
      .from('savings_transactions')
      .insert({
        savings_goal_id: id,
        user_id: user.id,
        type: data.type,
        amount: data.amount,
        notes: data.notes || '',
      })

    if (txErr) throw new Error(txErr.message)

    let newCurrent = Number(goalRow.current_amount)
    if (data.type === 'deposit') {
      newCurrent += data.amount
    } else {
      newCurrent = Math.max(0, newCurrent - data.amount)
    }

    const { data: updatedGoal, error: updateErr } = await client
      .from('savings_goals')
      .update({
        current_amount: newCurrent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateErr) throw new Error(updateErr.message)

    const targetAmt = Number(updatedGoal.target_amount)
    return {
      message: 'Transaksi tabungan berhasil disimpan ke cloud Supabase',
      goal: {
        id: updatedGoal.id,
        user_id: updatedGoal.user_id,
        title: updatedGoal.title,
        target_amount: targetAmt,
        current_amount: newCurrent,
        target_date: updatedGoal.target_date,
        notes: updatedGoal.notes || '',
        created_at: updatedGoal.created_at,
        updated_at: updatedGoal.updated_at,
        progress_percentage: targetAmt > 0 ? Math.min(100, Math.round((newCurrent / targetAmt) * 10000) / 100) : 0,
        remaining_amount: Math.max(0, targetAmt - newCurrent),
        is_reached: newCurrent >= targetAmt,
      },
    }
  },
}
