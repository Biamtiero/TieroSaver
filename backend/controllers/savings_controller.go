package controllers

import (
	"math"
	"net/http"
	"strconv"
	"time"

	"daily-spent-tracker-backend/database"
	"daily-spent-tracker-backend/middleware"
	"daily-spent-tracker-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SavingsController struct{}

func NewSavingsController() *SavingsController {
	return &SavingsController{}
}

func (sc *SavingsController) GetSavingsGoals(c *gin.Context) {
	userID, err := middleware.GetAuthUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Akses tidak diizinkan"})
		return
	}

	var goals []models.SavingsGoal
	if err := database.DB.Where("user_id = ?", userID).
		Preload("Transactions", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC").Limit(10)
		}).
		Order("created_at DESC").
		Find(&goals).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil target tabungan"})
		return
	}

	var totalSavedAll float64
	var totalTargetAll float64
	results := make([]models.SavingsGoalResponse, len(goals))

	for i, g := range goals {
		var pct float64
		if g.TargetAmount > 0 {
			pct = math.Round((g.CurrentAmount/g.TargetAmount)*1000) / 10
		}
		rem := g.TargetAmount - g.CurrentAmount
		if rem < 0 {
			rem = 0
		}

		totalSavedAll += g.CurrentAmount
		totalTargetAll += g.TargetAmount

		results[i] = models.SavingsGoalResponse{
			SavingsGoal:        g,
			ProgressPercentage: pct,
			RemainingAmount:    rem,
			IsReached:          g.CurrentAmount >= g.TargetAmount,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"total_saved":       totalSavedAll,
		"total_target":      totalTargetAll,
		"goals_count":       len(goals),
		"goals":             results,
	})
}

func (sc *SavingsController) CreateSavingsGoal(c *gin.Context) {
	userID, err := middleware.GetAuthUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Akses tidak diizinkan"})
		return
	}

	var req models.CreateSavingsGoalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data target tabungan tidak valid: " + err.Error()})
		return
	}

	if req.TargetDate != "" {
		if _, err := time.Parse("2006-01-02", req.TargetDate); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format target_date harus YYYY-MM-DD"})
			return
		}
	}

	goal := models.SavingsGoal{
		UserID:        userID,
		Title:         req.Title,
		TargetAmount:  req.TargetAmount,
		CurrentAmount: 0,
		TargetDate:    req.TargetDate,
		Notes:         req.Notes,
	}

	if err := database.DB.Create(&goal).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat target tabungan: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, models.SavingsGoalResponse{
		SavingsGoal:        goal,
		ProgressPercentage: 0,
		RemainingAmount:    goal.TargetAmount,
		IsReached:          false,
	})
}

func (sc *SavingsController) UpdateSavingsGoal(c *gin.Context) {
	userID, err := middleware.GetAuthUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Akses tidak diizinkan"})
		return
	}

	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	var goal models.SavingsGoal
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&goal).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Target tabungan tidak ditemukan"})
		return
	}

	var req models.UpdateSavingsGoalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak valid: " + err.Error()})
		return
	}

	if req.Title != "" {
		goal.Title = req.Title
	}
	if req.TargetAmount > 0 {
		goal.TargetAmount = req.TargetAmount
	}
	if req.TargetDate != "" {
		goal.TargetDate = req.TargetDate
	}
	if req.Notes != "" {
		goal.Notes = req.Notes
	}

	if err := database.DB.Save(&goal).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui target tabungan"})
		return
	}

	var pct float64
	if goal.TargetAmount > 0 {
		pct = math.Round((goal.CurrentAmount/goal.TargetAmount)*1000) / 10
	}
	rem := goal.TargetAmount - goal.CurrentAmount
	if rem < 0 {
		rem = 0
	}

	c.JSON(http.StatusOK, models.SavingsGoalResponse{
		SavingsGoal:        goal,
		ProgressPercentage: pct,
		RemainingAmount:    rem,
		IsReached:          goal.CurrentAmount >= goal.TargetAmount,
	})
}

func (sc *SavingsController) DeleteSavingsGoal(c *gin.Context) {
	userID, err := middleware.GetAuthUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Akses tidak diizinkan"})
		return
	}

	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	result := database.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.SavingsGoal{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus target tabungan"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Target tabungan tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Target tabungan berhasil dihapus"})
}

func (sc *SavingsController) AddTransaction(c *gin.Context) {
	userID, err := middleware.GetAuthUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Akses tidak diizinkan"})
		return
	}

	idParam := c.Param("id")
	goalID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID target tabungan tidak valid"})
		return
	}

	var req models.SavingsTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Input transaksi tabungan tidak valid: " + err.Error()})
		return
	}

	var goal models.SavingsGoal
	if err := database.DB.Where("id = ? AND user_id = ?", goalID, userID).First(&goal).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Target tabungan tidak ditemukan"})
		return
	}

	tx := database.DB.Begin()

	if req.Type == "withdraw" {
		if goal.CurrentAmount < req.Amount {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Saldo tabungan tidak mencukupi untuk ditarik"})
			return
		}
		goal.CurrentAmount -= req.Amount
	} else if req.Type == "deposit" {
		goal.CurrentAmount += req.Amount
	}

	if err := tx.Save(&goal).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui saldo tabungan"})
		return
	}

	transaction := models.SavingsTransaction{
		SavingsGoalID: goal.ID,
		UserID:        userID,
		Type:          req.Type,
		Amount:        req.Amount,
		Notes:         req.Notes,
	}

	if err := tx.Create(&transaction).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mencatat transaksi tabungan"})
		return
	}

	tx.Commit()

	var pct float64
	if goal.TargetAmount > 0 {
		pct = math.Round((goal.CurrentAmount/goal.TargetAmount)*1000) / 10
	}
	rem := goal.TargetAmount - goal.CurrentAmount
	if rem < 0 {
		rem = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Transaksi tabungan berhasil dicatat",
		"transaction": transaction,
		"goal": models.SavingsGoalResponse{
			SavingsGoal:        goal,
			ProgressPercentage: pct,
			RemainingAmount:    rem,
			IsReached:          goal.CurrentAmount >= goal.TargetAmount,
		},
	})
}
