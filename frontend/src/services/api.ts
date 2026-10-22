import axios from 'axios'
import type {
  AuthResponse,
  User,
  ExpenseOverviewResponse,
  BudgetOverviewResponse,
  SavingsOverviewResponse,
  Expense,
  SavingsGoal,
} from '../types'
import {
  localAuth,
  localExpenses,
  localBudgets,
  localSavings,
} from './localBackend'
import { isSupabaseConfigured } from './supabaseClient'
import {
  supabaseAuth,
  supabaseExpenses,
  supabaseBudgets,
  supabaseSavings,
} from './supabaseApi'

// In standalone mode (e.g. deployed to Vercel without external VITE_API_URL or Supabase),
// we use the client-side local persistence directly to ensure zero latency and prevent 405 static errors.
const isStandalone =
  typeof window !== 'undefined' &&
  !isSupabaseConfigured &&
  !import.meta.env.VITE_API_URL &&
  (window.location.hostname.includes('vercel.app') || window.location.hostname !== 'localhost')

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 3000,
})

// Attach Bearer token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle Unauthorized
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (localStorage.getItem('token')) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.dispatchEvent(new Event('auth-logout'))
      }
    }
    return Promise.reject(error)
  }
)

const shouldFallback = (error: any): boolean => {
  if (!error || !error.response) return true // Network Error / server offline
  if ([400, 404, 405, 500, 502, 503, 504].includes(error.response.status)) return true
  // If response is HTML index fallback from SPA host (Vercel static rewrite)
  const contentType = error.response.headers?.['content-type'] || ''
  if (typeof error.response.data === 'string' && contentType.includes('text/html')) return true
  return false
}

// -------------------------------------------------------------
// Auth API
// -------------------------------------------------------------
export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    if (isSupabaseConfigured) return await supabaseAuth.login(email, password)
    if (isStandalone) return await localAuth.login(email, password)
    try {
      const res = await API.post<AuthResponse>('/auth/login', { email, password })
      if (res.data && res.data.token) return res.data
      return await localAuth.login(email, password)
    } catch (err: any) {
      if (shouldFallback(err)) return await localAuth.login(email, password)
      throw err
    }
  },
  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    if (isSupabaseConfigured) return await supabaseAuth.register(name, email, password)
    if (isStandalone) return await localAuth.register(name, email, password)
    try {
      const res = await API.post<AuthResponse>('/auth/register', { name, email, password })
      if (res.data && res.data.token) return res.data
      return await localAuth.register(name, email, password)
    } catch (err: any) {
      if (shouldFallback(err)) return await localAuth.register(name, email, password)
      throw err
    }
  },
  getMe: async (): Promise<User> => {
    if (isSupabaseConfigured) return await supabaseAuth.getMe()
    if (isStandalone) return await localAuth.getMe()
    try {
      const res = await API.get<User>('/auth/me')
      if (res.data && res.data.id) return res.data
      return await localAuth.getMe()
    } catch (err: any) {
      if (shouldFallback(err)) return await localAuth.getMe()
      throw err
    }
  },
  updateProfile: async (data: {
    name?: string
    email?: string
    avatar_url?: string
    phone?: string
    currency?: string
    bio?: string
  }): Promise<User> => {
    if (isSupabaseConfigured) return await supabaseAuth.updateProfile(data)
    if (isStandalone) return await localAuth.updateProfile(data)
    try {
      const res = await API.put<User>('/auth/profile', data)
      if (res.data && res.data.id) return res.data
      return await localAuth.updateProfile(data)
    } catch (err: any) {
      if (shouldFallback(err)) return await localAuth.updateProfile(data)
      throw err
    }
  },
  changePassword: async (oldPassword: string, newPassword: string): Promise<{ message: string }> => {
    if (isSupabaseConfigured) return await supabaseAuth.changePassword(oldPassword, newPassword)
    if (isStandalone) return await localAuth.changePassword(oldPassword, newPassword)
    try {
      const res = await API.put<{ message: string }>('/auth/password', {
        old_password: oldPassword,
        new_password: newPassword,
      })
      if (res.data && res.data.message) return res.data
      return await localAuth.changePassword(oldPassword, newPassword)
    } catch (err: any) {
      if (shouldFallback(err)) return await localAuth.changePassword(oldPassword, newPassword)
      throw err
    }
  },
  resetData: async (): Promise<{ message: string }> => {
    if (isSupabaseConfigured) return await supabaseAuth.resetData()
    return await localAuth.resetData()
  },
}

// -------------------------------------------------------------
// Expenses API
// -------------------------------------------------------------
export const expensesApi = {
  getOverview: async (date?: string, month?: string): Promise<ExpenseOverviewResponse> => {
    if (isSupabaseConfigured) return await supabaseExpenses.getOverview(date, month)
    if (isStandalone) return await localExpenses.getOverview(date, month)
    try {
      const params = new URLSearchParams()
      if (date) params.append('date', date)
      if (month) params.append('month', month)
      const res = await API.get<ExpenseOverviewResponse>(`/expenses/overview?${params.toString()}`)
      if (res.data && res.data.expenses) return res.data
      return await localExpenses.getOverview(date, month)
    } catch (err: any) {
      if (shouldFallback(err)) return await localExpenses.getOverview(date, month)
      throw err
    }
  },
  createExpense: async (data: {
    title: string
    amount: number
    category: string
    expense_date: string
    notes?: string
  }): Promise<{ message: string; expense: Expense; date_total: number }> => {
    if (isSupabaseConfigured) return await supabaseExpenses.createExpense(data)
    if (isStandalone) return await localExpenses.createExpense(data)
    try {
      const res = await API.post('/expenses', data)
      if (res.data && res.data.expense) return res.data
      return await localExpenses.createExpense(data)
    } catch (err: any) {
      if (shouldFallback(err)) return await localExpenses.createExpense(data)
      throw err
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
    if (isSupabaseConfigured) return await supabaseExpenses.updateExpense(id, data)
    if (isStandalone) return await localExpenses.updateExpense(Number(id), data)
    try {
      const res = await API.put<Expense>(`/expenses/${id}`, data)
      if (res.data && res.data.id) return res.data
      return await localExpenses.updateExpense(Number(id), data)
    } catch (err: any) {
      if (shouldFallback(err)) return await localExpenses.updateExpense(Number(id), data)
      throw err
    }
  },
  deleteExpense: async (id: number | string): Promise<{ message: string }> => {
    if (isSupabaseConfigured) return await supabaseExpenses.deleteExpense(id)
    if (isStandalone) return await localExpenses.deleteExpense(Number(id))
    try {
      const res = await API.delete(`/expenses/${id}`)
      if (res.data && res.data.message) return res.data
      return await localExpenses.deleteExpense(Number(id))
    } catch (err: any) {
      if (shouldFallback(err)) return await localExpenses.deleteExpense(Number(id))
      throw err
    }
  },
}

// -------------------------------------------------------------
// Budgets API
// -------------------------------------------------------------
export const budgetsApi = {
  getOverview: async (): Promise<BudgetOverviewResponse> => {
    if (isSupabaseConfigured) return await supabaseBudgets.getOverview()
    if (isStandalone) return await localBudgets.getOverview()
    try {
      const res = await API.get<BudgetOverviewResponse>('/budgets/overview')
      if (res.data && res.data.daily) return res.data
      return await localBudgets.getOverview()
    } catch (err: any) {
      if (shouldFallback(err)) return await localBudgets.getOverview()
      throw err
    }
  },
  setLimits: async (data: {
    daily_limit: number
    weekly_limit: number
    monthly_limit: number
  }): Promise<BudgetOverviewResponse> => {
    if (isSupabaseConfigured) return await supabaseBudgets.setLimits(data)
    if (isStandalone) return await localBudgets.setLimits(data)
    try {
      const res = await API.post<BudgetOverviewResponse>('/budgets/limits', data)
      if (res.data && res.data.daily) return res.data
      return await localBudgets.setLimits(data)
    } catch (err: any) {
      if (shouldFallback(err)) return await localBudgets.setLimits(data)
      throw err
    }
  },
}

// -------------------------------------------------------------
// Savings API
// -------------------------------------------------------------
export const savingsApi = {
  getGoals: async (): Promise<SavingsOverviewResponse> => {
    if (isSupabaseConfigured) return await supabaseSavings.getGoals()
    if (isStandalone) return await localSavings.getGoals()
    try {
      const res = await API.get<SavingsOverviewResponse>('/savings')
      if (res.data && res.data.goals) return res.data
      return await localSavings.getGoals()
    } catch (err: any) {
      if (shouldFallback(err)) return await localSavings.getGoals()
      throw err
    }
  },
  createGoal: async (data: {
    title: string
    target_amount: number
    target_date?: string
    notes?: string
  }): Promise<SavingsGoal> => {
    if (isSupabaseConfigured) return await supabaseSavings.createGoal(data)
    if (isStandalone) return await localSavings.createGoal(data)
    try {
      const res = await API.post<SavingsGoal>('/savings', data)
      if (res.data && res.data.id) return res.data
      return await localSavings.createGoal(data)
    } catch (err: any) {
      if (shouldFallback(err)) return await localSavings.createGoal(data)
      throw err
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
    if (isSupabaseConfigured) return await supabaseSavings.updateGoal(id, data)
    if (isStandalone) return await localSavings.updateGoal(Number(id), data)
    try {
      const res = await API.put<SavingsGoal>(`/savings/${id}`, data)
      if (res.data && res.data.id) return res.data
      return await localSavings.updateGoal(Number(id), data)
    } catch (err: any) {
      if (shouldFallback(err)) return await localSavings.updateGoal(Number(id), data)
      throw err
    }
  },
  deleteGoal: async (id: number | string): Promise<{ message: string }> => {
    if (isSupabaseConfigured) return await supabaseSavings.deleteGoal(id)
    if (isStandalone) return await localSavings.deleteGoal(Number(id))
    try {
      const res = await API.delete(`/savings/${id}`)
      if (res.data && res.data.message) return res.data
      return await localSavings.deleteGoal(Number(id))
    } catch (err: any) {
      if (shouldFallback(err)) return await localSavings.deleteGoal(Number(id))
      throw err
    }
  },
  addTransaction: async (
    id: number | string,
    data: {
      type: 'deposit' | 'withdraw'
      amount: number
      notes?: string
    }
  ): Promise<{ message: string; goal: SavingsGoal }> => {
    if (isSupabaseConfigured) return await supabaseSavings.addTransaction(id, data)
    if (isStandalone) return await localSavings.addTransaction(Number(id), data)
    try {
      const res = await API.post(`/savings/${id}/transaction`, data)
      if (res.data && res.data.goal) return res.data
      return await localSavings.addTransaction(Number(id), data)
    } catch (err: any) {
      if (shouldFallback(err)) return await localSavings.addTransaction(Number(id), data)
      throw err
    }
  },
}
