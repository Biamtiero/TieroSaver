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

const API = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
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
      // If unauthorized and has token, clear session
      if (localStorage.getItem('token')) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.dispatchEvent(new Event('auth-logout'))
      }
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await API.post<AuthResponse>('/auth/login', { email, password })
    return res.data
  },
  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    const res = await API.post<AuthResponse>('/auth/register', { name, email, password })
    return res.data
  },
  getMe: async (): Promise<User> => {
    const res = await API.get<User>('/auth/me')
    return res.data
  },
}

export const expensesApi = {
  getOverview: async (date?: string, month?: string): Promise<ExpenseOverviewResponse> => {
    const params = new URLSearchParams()
    if (date) params.append('date', date)
    if (month) params.append('month', month)
    const res = await API.get<ExpenseOverviewResponse>(`/expenses/overview?${params.toString()}`)
    return res.data
  },
  createExpense: async (data: {
    title: string
    amount: number
    category: string
    expense_date: string
    notes?: string
  }): Promise<{ message: string; expense: Expense; date_total: number }> => {
    const res = await API.post('/expenses', data)
    return res.data
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
    const res = await API.put<Expense>(`/expenses/${id}`, data)
    return res.data
  },
  deleteExpense: async (id: number): Promise<{ message: string }> => {
    const res = await API.delete(`/expenses/${id}`)
    return res.data
  },
}

export const budgetsApi = {
  getOverview: async (): Promise<BudgetOverviewResponse> => {
    const res = await API.get<BudgetOverviewResponse>('/budgets/overview')
    return res.data
  },
  setLimits: async (data: {
    daily_limit: number
    weekly_limit: number
    monthly_limit: number
  }): Promise<BudgetOverviewResponse> => {
    const res = await API.post<BudgetOverviewResponse>('/budgets/limits', data)
    return res.data
  },
}

export const savingsApi = {
  getGoals: async (): Promise<SavingsOverviewResponse> => {
    const res = await API.get<SavingsOverviewResponse>('/savings')
    return res.data
  },
  createGoal: async (data: {
    title: string
    target_amount: number
    target_date?: string
    notes?: string
  }): Promise<SavingsGoal> => {
    const res = await API.post<SavingsGoal>('/savings', data)
    return res.data
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
    const res = await API.put<SavingsGoal>(`/savings/${id}`, data)
    return res.data
  },
  deleteGoal: async (id: number): Promise<{ message: string }> => {
    const res = await API.delete(`/savings/${id}`)
    return res.data
  },
  addTransaction: async (
    id: number,
    data: {
      type: 'deposit' | 'withdraw'
      amount: number
      notes?: string
    }
  ): Promise<{ message: string; goal: SavingsGoal }> => {
    const res = await API.post(`/savings/${id}/transaction`, data)
    return res.data
  },
}
