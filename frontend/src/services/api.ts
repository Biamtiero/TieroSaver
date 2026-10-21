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

// In standalone mode (e.g. deployed to Vercel without external VITE_API_URL),
// we use the client-side local persistence directly to ensure zero latency and prevent 405 static errors.
const isStandalone =
  typeof window !== 'undefined' &&
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

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
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
}

export const expensesApi = {
  getOverview: async (date?: string, month?: string): Promise<ExpenseOverviewResponse> => {
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
    id: number,
    data: {
      title?: string
      amount?: number
      category?: string
      expense_date?: string
      notes?: string
    }
  ): Promise<Expense> => {
    if (isStandalone) return await localExpenses.updateExpense(id, data)
    try {
      const res = await API.put<Expense>(`/expenses/${id}`, data)
      if (res.data && res.data.id) return res.data
      return await localExpenses.updateExpense(id, data)
    } catch (err: any) {
      if (shouldFallback(err)) return await localExpenses.updateExpense(id, data)
      throw err
    }
  },
  deleteExpense: async (id: number): Promise<{ message: string }> => {
    if (isStandalone) return await localExpenses.deleteExpense(id)
    try {
      const res = await API.delete(`/expenses/${id}`)
      if (res.data && res.data.message) return res.data
      return await localExpenses.deleteExpense(id)
    } catch (err: any) {
      if (shouldFallback(err)) return await localExpenses.deleteExpense(id)
      throw err
    }
  },
}

export const budgetsApi = {
  getOverview: async (): Promise<BudgetOverviewResponse> => {
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

export const savingsApi = {
  getGoals: async (): Promise<SavingsOverviewResponse> => {
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
    id: number,
    data: {
      title?: string
      target_amount?: number
      target_date?: string
      notes?: string
    }
  ): Promise<SavingsGoal> => {
    if (isStandalone) return await localSavings.updateGoal(id, data)
    try {
      const res = await API.put<SavingsGoal>(`/savings/${id}`, data)
      if (res.data && res.data.id) return res.data
      return await localSavings.updateGoal(id, data)
    } catch (err: any) {
      if (shouldFallback(err)) return await localSavings.updateGoal(id, data)
      throw err
    }
  },
  deleteGoal: async (id: number): Promise<{ message: string }> => {
    if (isStandalone) return await localSavings.deleteGoal(id)
    try {
      const res = await API.delete(`/savings/${id}`)
      if (res.data && res.data.message) return res.data
      return await localSavings.deleteGoal(id)
    } catch (err: any) {
      if (shouldFallback(err)) return await localSavings.deleteGoal(id)
      throw err
    }
  },
  addTransaction: async (
    id: number,
    data: {
      type: 'deposit' | 'withdraw'
      amount: number
      notes?: string
    }
  ): Promise<{ message: string; goal: SavingsGoal }> => {
    if (isStandalone) return await localSavings.addTransaction(id, data)
    try {
      const res = await API.post(`/savings/${id}/transaction`, data)
      if (res.data && res.data.goal) return res.data
      return await localSavings.addTransaction(id, data)
    } catch (err: any) {
      if (shouldFallback(err)) return await localSavings.addTransaction(id, data)
      throw err
    }
  },
}
