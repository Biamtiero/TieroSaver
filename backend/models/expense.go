package models

import (
	"time"
)

type Expense struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      uint      `gorm:"not null;index" json:"user_id"`
	Title       string    `gorm:"size:200;not null" json:"title"`
	Amount      float64   `gorm:"type:numeric(15,2);not null" json:"amount"`
	Category    string    `gorm:"size:50;not null;default:'Lainnya'" json:"category"`
	ExpenseDate string    `gorm:"size:10;not null;index" json:"expense_date"` // Format: YYYY-MM-DD
	Notes       string    `gorm:"type:text" json:"notes"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateExpenseRequest struct {
	Title       string  `json:"title" binding:"required"`
	Amount      float64 `json:"amount" binding:"required,gt=0"`
	Category    string  `json:"category" binding:"required"`
	ExpenseDate string  `json:"expense_date" binding:"required"` // YYYY-MM-DD
	Notes       string  `json:"notes"`
}

type UpdateExpenseRequest struct {
	Title       string  `json:"title"`
	Amount      float64 `json:"amount" binding:"omitempty,gt=0"`
	Category    string  `json:"category"`
	ExpenseDate string  `json:"expense_date"`
	Notes       string  `json:"notes"`
}

type DailyGroupSummary struct {
	Date        string    `json:"date"`
	TotalAmount float64   `json:"total_amount"`
	Count       int64     `json:"count"`
	Expenses    []Expense `json:"expenses"`
}

type ExpenseOverviewResponse struct {
	SelectedDate    string             `json:"selected_date"`
	SelectedDateSum float64            `json:"selected_date_sum"`
	TodaySum        float64            `json:"today_sum"`
	WeekSum         float64            `json:"week_sum"`
	MonthSum        float64            `json:"month_sum"`
	Expenses        []Expense          `json:"expenses"`
	DailyBreakdown  []DailyGroupSummary `json:"daily_breakdown"`
	CategoryBreakdown map[string]float64 `json:"category_breakdown"`
}
