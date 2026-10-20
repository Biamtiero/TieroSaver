package models

import (
	"time"
)

type SavingsGoal struct {
	ID            uint                 `gorm:"primaryKey" json:"id"`
	UserID        uint                 `gorm:"not null;index" json:"user_id"`
	Title         string               `gorm:"size:200;not null" json:"title"`
	TargetAmount  float64              `gorm:"type:numeric(15,2);not null" json:"target_amount"`
	CurrentAmount float64              `gorm:"type:numeric(15,2);default:0" json:"current_amount"`
	TargetDate    string               `gorm:"size:10" json:"target_date"` // YYYY-MM-DD
	Notes         string               `gorm:"type:text" json:"notes"`
	CreatedAt     time.Time            `json:"created_at"`
	UpdatedAt     time.Time            `json:"updated_at"`
	Transactions  []SavingsTransaction `gorm:"foreignKey:SavingsGoalID;constraint:OnDelete:CASCADE" json:"transactions,omitempty"`
}

type SavingsTransaction struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	SavingsGoalID uint      `gorm:"not null;index" json:"savings_goal_id"`
	UserID        uint      `gorm:"not null;index" json:"user_id"`
	Type          string    `gorm:"size:20;not null" json:"type"` // "deposit" or "withdraw"
	Amount        float64   `gorm:"type:numeric(15,2);not null" json:"amount"`
	Notes         string    `gorm:"type:text" json:"notes"`
	CreatedAt     time.Time `json:"created_at"`
}

type CreateSavingsGoalRequest struct {
	Title        string  `json:"title" binding:"required"`
	TargetAmount float64 `json:"target_amount" binding:"required,gt=0"`
	TargetDate   string  `json:"target_date"`
	Notes        string  `json:"notes"`
}

type UpdateSavingsGoalRequest struct {
	Title        string  `json:"title"`
	TargetAmount float64 `json:"target_amount" binding:"omitempty,gt=0"`
	TargetDate   string  `json:"target_date"`
	Notes        string  `json:"notes"`
}

type SavingsTransactionRequest struct {
	Type   string  `json:"type" binding:"required,oneof=deposit withdraw"`
	Amount float64 `json:"amount" binding:"required,gt=0"`
	Notes  string  `json:"notes"`
}

type SavingsGoalResponse struct {
	SavingsGoal
	ProgressPercentage float64 `json:"progress_percentage"`
	RemainingAmount    float64 `json:"remaining_amount"`
	IsReached          bool    `json:"is_reached"`
}
