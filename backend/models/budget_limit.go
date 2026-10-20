package models

import (
	"time"
)

type BudgetLimit struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	UserID       uint      `gorm:"uniqueIndex;not null" json:"user_id"`
	DailyLimit   float64   `gorm:"type:numeric(15,2);default:0" json:"daily_limit"`
	WeeklyLimit  float64   `gorm:"type:numeric(15,2);default:0" json:"weekly_limit"`
	MonthlyLimit float64   `gorm:"type:numeric(15,2);default:0" json:"monthly_limit"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type SetBudgetLimitRequest struct {
	DailyLimit   float64 `json:"daily_limit" binding:"min=0"`
	WeeklyLimit  float64 `json:"weekly_limit" binding:"min=0"`
	MonthlyLimit float64 `json:"monthly_limit" binding:"min=0"`
}

type LimitStatusItem struct {
	Period     string  `json:"period"` // "daily", "weekly", "monthly"
	Limit      float64 `json:"limit"`
	Spent      float64 `json:"spent"`
	Remaining  float64 `json:"remaining"`
	Percentage float64 `json:"percentage"`
	Status     string  `json:"status"` // "not_set", "safe", "warning", "exceeded"
}

type BudgetLimitOverviewResponse struct {
	DailyLimit   float64         `json:"daily_limit"`
	WeeklyLimit  float64         `json:"weekly_limit"`
	MonthlyLimit float64         `json:"monthly_limit"`
	Daily        LimitStatusItem `json:"daily"`
	Weekly       LimitStatusItem `json:"weekly"`
	Monthly      LimitStatusItem `json:"monthly"`
}
