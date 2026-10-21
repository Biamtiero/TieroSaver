export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
  phone?: string;
  currency?: string;
  bio?: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Expense {
  id: number;
  user_id: number;
  title: string;
  amount: number;
  category: string;
  expense_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DailyGroupSummary {
  date: string;
  total_amount: number;
  count: number;
  expenses: Expense[];
}

export interface ExpenseOverviewResponse {
  selected_date: string;
  selected_date_sum: number;
  today_sum: number;
  week_sum: number;
  month_sum: number;
  expenses: Expense[];
  daily_breakdown: DailyGroupSummary[];
  category_breakdown: Record<string, number>;
}

export interface LimitStatusItem {
  period: 'daily' | 'weekly' | 'monthly';
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'not_set' | 'safe' | 'warning' | 'exceeded';
}

export interface BudgetOverviewResponse {
  daily_limit: number;
  weekly_limit: number;
  monthly_limit: number;
  daily: LimitStatusItem;
  weekly: LimitStatusItem;
  monthly: LimitStatusItem;
}

export interface SavingsTransaction {
  id: number;
  savings_goal_id: number;
  user_id: number;
  type: 'deposit' | 'withdraw';
  amount: number;
  notes: string;
  created_at: string;
}

export interface SavingsGoal {
  id: number;
  user_id: number;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  progress_percentage: number;
  remaining_amount: number;
  is_reached: boolean;
  transactions?: SavingsTransaction[];
}

export interface SavingsOverviewResponse {
  total_saved: number;
  total_target: number;
  goals_count: number;
  goals: SavingsGoal[];
}
