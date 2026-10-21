package models

import (
	"time"
)

type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Name         string    `gorm:"size:100;not null" json:"name"`
	Email        string    `gorm:"size:100;uniqueIndex;not null" json:"email"`
	PasswordHash string    `gorm:"size:255;not null" json:"-"`
	AvatarURL    string    `gorm:"type:text" json:"avatar_url,omitempty"`
	Phone        string    `gorm:"size:25" json:"phone,omitempty"`
	Currency     string    `gorm:"size:10;default:'IDR'" json:"currency,omitempty"`
	Bio          string    `gorm:"size:255" json:"bio,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	Expenses      []Expense     `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	BudgetLimit   *BudgetLimit  `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	SavingsGoals  []SavingsGoal `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

type RegisterRequest struct {
	Name     string `json:"name" binding:"required,min=2"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type UpdateProfileRequest struct {
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
	Phone     string `json:"phone"`
	Currency  string `json:"currency"`
	Bio       string `json:"bio"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

type AuthResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

type UserResponse struct {
	ID        uint      `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	AvatarURL string    `json:"avatar_url,omitempty"`
	Phone     string    `json:"phone,omitempty"`
	Currency  string    `json:"currency,omitempty"`
	Bio       string    `json:"bio,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:        u.ID,
		Name:      u.Name,
		Email:     u.Email,
		AvatarURL: u.AvatarURL,
		Phone:     u.Phone,
		Currency:  u.Currency,
		Bio:       u.Bio,
		CreatedAt: u.CreatedAt,
	}
}
