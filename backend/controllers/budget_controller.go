package controllers

import (
	"math"
	"net/http"
	"time"

	"daily-spent-tracker-backend/database"
	"daily-spent-tracker-backend/middleware"
	"daily-spent-tracker-backend/models"

	"github.com/gin-gonic/gin"
)

type BudgetController struct{}

func NewBudgetController() *BudgetController {
	return &BudgetController{}
}

func (bc *BudgetController) GetBudgetOverview(c *gin.Context) {
	userID, err := middleware.GetAuthUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Akses tidak diizinkan"})
		return
	}

	var budget models.BudgetLimit
	err = database.DB.Where("user_id = ?", userID).First(&budget).Error
	if err != nil {
		budget = models.BudgetLimit{
			UserID:       userID,
			DailyLimit:   0,
			WeeklyLimit:  0,
			MonthlyLimit: 0,
		}
		database.DB.Create(&budget)
	}

	now := time.Now()
	todayStr := now.Format("2006-01-02")

	// Calculate Today's Spent
	var todaySpent float64
	database.DB.Model(&models.Expense{}).
		Where("user_id = ? AND expense_date = ?", userID, todayStr).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&todaySpent)

	// Calculate Week's Spent
	weekday := int(now.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	startOfWeek := now.AddDate(0, 0, -(weekday - 1)).Format("2006-01-02")
	endOfWeek := now.AddDate(0, 0, 7-weekday).Format("2006-01-02")

	var weekSpent float64
	database.DB.Model(&models.Expense{}).
		Where("user_id = ? AND expense_date >= ? AND expense_date <= ?", userID, startOfWeek, endOfWeek).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&weekSpent)

	// Calculate Month's Spent
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Format("2006-01-02")
	endOfMonth := time.Date(now.Year(), now.Month()+1, 0, 0, 0, 0, 0, now.Location()).Format("2006-01-02")

	var monthSpent float64
	database.DB.Model(&models.Expense{}).
		Where("user_id = ? AND expense_date >= ? AND expense_date <= ?", userID, startOfMonth, endOfMonth).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&monthSpent)

	calcStatus := func(period string, limit, spent float64) models.LimitStatusItem {
		if limit <= 0 {
			return models.LimitStatusItem{
				Period:     period,
				Limit:      0,
				Spent:      spent,
				Remaining:  0,
				Percentage: 0,
				Status:     "not_set",
			}
		}

		remaining := limit - spent
		pct := math.Round((spent/limit)*1000) / 10 // rounded to 1 decimal place

		status := "safe"
		if spent >= limit {
			status = "exceeded"
		} else if pct >= 80 {
			status = "warning"
		}

		return models.LimitStatusItem{
			Period:     period,
			Limit:      limit,
			Spent:      spent,
			Remaining:  remaining,
			Percentage: pct,
			Status:     status,
		}
	}

	response := models.BudgetLimitOverviewResponse{
		DailyLimit:   budget.DailyLimit,
		WeeklyLimit:  budget.WeeklyLimit,
		MonthlyLimit: budget.MonthlyLimit,
		Daily:        calcStatus("daily", budget.DailyLimit, todaySpent),
		Weekly:       calcStatus("weekly", budget.WeeklyLimit, weekSpent),
		Monthly:      calcStatus("monthly", budget.MonthlyLimit, monthSpent),
	}

	c.JSON(http.StatusOK, response)
}

func (bc *BudgetController) SetBudgetLimits(c *gin.Context) {
	userID, err := middleware.GetAuthUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Akses tidak diizinkan"})
		return
	}

	var req models.SetBudgetLimitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Input batas pengeluaran tidak valid: " + err.Error()})
		return
	}

	var budget models.BudgetLimit
	err = database.DB.Where("user_id = ?", userID).First(&budget).Error
	if err != nil {
		budget = models.BudgetLimit{
			UserID:       userID,
			DailyLimit:   req.DailyLimit,
			WeeklyLimit:  req.WeeklyLimit,
			MonthlyLimit: req.MonthlyLimit,
		}
		if err := database.DB.Create(&budget).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan batas pengeluaran"})
			return
		}
	} else {
		budget.DailyLimit = req.DailyLimit
		budget.WeeklyLimit = req.WeeklyLimit
		budget.MonthlyLimit = req.MonthlyLimit
		if err := database.DB.Save(&budget).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui batas pengeluaran"})
			return
		}
	}

	// Redirect to overview computation
	bc.GetBudgetOverview(c)
}
