package controllers

import (
	"net/http"
	"strconv"
	"time"

	"daily-spent-tracker-backend/database"
	"daily-spent-tracker-backend/middleware"
	"daily-spent-tracker-backend/models"

	"github.com/gin-gonic/gin"
)

type ExpenseController struct{}

func NewExpenseController() *ExpenseController {
	return &ExpenseController{}
}

func (ec *ExpenseController) CreateExpense(c *gin.Context) {
	userID, err := middleware.GetAuthUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Akses tidak diizinkan"})
		return
	}

	var req models.CreateExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak valid: " + err.Error()})
		return
	}

	// Validate date format YYYY-MM-DD
	if _, err := time.Parse("2006-01-02", req.ExpenseDate); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal harus YYYY-MM-DD"})
		return
	}

	if req.Category == "" {
		req.Category = "Lainnya"
	}

	expense := models.Expense{
		UserID:      userID,
		Title:       req.Title,
		Amount:      req.Amount,
		Category:    req.Category,
		ExpenseDate: req.ExpenseDate,
		Notes:       req.Notes,
	}

	if err := database.DB.Create(&expense).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan pengeluaran: " + err.Error()})
		return
	}

	// Calculate current total for this date
	var dateTotal float64
	database.DB.Model(&models.Expense{}).
		Where("user_id = ? AND expense_date = ?", userID, req.ExpenseDate).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&dateTotal)

	c.JSON(http.StatusCreated, gin.H{
		"message":     "Pengeluaran berhasil dicatat",
		"expense":     expense,
		"date_total":  dateTotal,
	})
}

func (ec *ExpenseController) GetOverview(c *gin.Context) {
	userID, err := middleware.GetAuthUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Akses tidak diizinkan"})
		return
	}

	now := time.Now()
	todayStr := now.Format("2006-01-02")

	selectedDate := c.DefaultQuery("date", todayStr)
	if _, err := time.Parse("2006-01-02", selectedDate); err != nil {
		selectedDate = todayStr
	}

	// Calculate Today's sum
	var todaySum float64
	database.DB.Model(&models.Expense{}).
		Where("user_id = ? AND expense_date = ?", userID, todayStr).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&todaySum)

	// Calculate Selected Date sum
	var selectedDateSum float64
	if selectedDate == todayStr {
		selectedDateSum = todaySum
	} else {
		database.DB.Model(&models.Expense{}).
			Where("user_id = ? AND expense_date = ?", userID, selectedDate).
			Select("COALESCE(SUM(amount), 0)").
			Scan(&selectedDateSum)
	}

	// Calculate Week sum (Monday to Sunday)
	weekday := int(now.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	startOfWeek := now.AddDate(0, 0, -(weekday - 1)).Format("2006-01-02")
	endOfWeek := now.AddDate(0, 0, 7-weekday).Format("2006-01-02")

	var weekSum float64
	database.DB.Model(&models.Expense{}).
		Where("user_id = ? AND expense_date >= ? AND expense_date <= ?", userID, startOfWeek, endOfWeek).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&weekSum)

	// Calculate Month sum
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Format("2006-01-02")
	endOfMonth := time.Date(now.Year(), now.Month()+1, 0, 0, 0, 0, 0, now.Location()).Format("2006-01-02")

	var monthSum float64
	database.DB.Model(&models.Expense{}).
		Where("user_id = ? AND expense_date >= ? AND expense_date <= ?", userID, startOfMonth, endOfMonth).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&monthSum)

	// Expenses for the selected date (or month filter if requested)
	var expenses []models.Expense
	monthFilter := c.Query("month") // format YYYY-MM
	query := database.DB.Where("user_id = ?", userID)
	if monthFilter != "" {
		query = query.Where("expense_date LIKE ?", monthFilter+"%")
	} else {
		query = query.Where("expense_date = ?", selectedDate)
	}
	query.Order("created_at DESC").Find(&expenses)

	// Daily Breakdown for the current month
	type DailySumResult struct {
		ExpenseDate string  `json:"expense_date"`
		TotalAmount float64 `json:"total_amount"`
		Count       int64   `json:"count"`
	}
	var dailyResults []DailySumResult
	database.DB.Model(&models.Expense{}).
		Where("user_id = ? AND expense_date >= ? AND expense_date <= ?", userID, startOfMonth, endOfMonth).
		Select("expense_date, COALESCE(SUM(amount), 0) as total_amount, COUNT(*) as count").
		Group("expense_date").
		Order("expense_date DESC").
		Scan(&dailyResults)

	dailyBreakdown := make([]models.DailyGroupSummary, len(dailyResults))
	for i, dr := range dailyResults {
		var items []models.Expense
		database.DB.Where("user_id = ? AND expense_date = ?", userID, dr.ExpenseDate).
			Order("created_at DESC").
			Find(&items)

		dailyBreakdown[i] = models.DailyGroupSummary{
			Date:        dr.ExpenseDate,
			TotalAmount: dr.TotalAmount,
			Count:       dr.Count,
			Expenses:    items,
		}
	}

	// Category breakdown for current month
	type CategorySumResult struct {
		Category string  `json:"category"`
		Total    float64 `json:"total"`
	}
	var categoryResults []CategorySumResult
	database.DB.Model(&models.Expense{}).
		Where("user_id = ? AND expense_date >= ? AND expense_date <= ?", userID, startOfMonth, endOfMonth).
		Select("category, COALESCE(SUM(amount), 0) as total").
		Group("category").
		Scan(&categoryResults)

	categoryBreakdown := make(map[string]float64)
	for _, cr := range categoryResults {
		categoryBreakdown[cr.Category] = cr.Total
	}

	c.JSON(http.StatusOK, models.ExpenseOverviewResponse{
		SelectedDate:      selectedDate,
		SelectedDateSum:   selectedDateSum,
		TodaySum:          todaySum,
		WeekSum:           weekSum,
		MonthSum:          monthSum,
		Expenses:          expenses,
		DailyBreakdown:    dailyBreakdown,
		CategoryBreakdown: categoryBreakdown,
	})
}

func (ec *ExpenseController) UpdateExpense(c *gin.Context) {
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

	var expense models.Expense
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&expense).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Catatan pengeluaran tidak ditemukan"})
		return
	}

	var req models.UpdateExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data pembaruan tidak valid: " + err.Error()})
		return
	}

	if req.Title != "" {
		expense.Title = req.Title
	}
	if req.Amount > 0 {
		expense.Amount = req.Amount
	}
	if req.Category != "" {
		expense.Category = req.Category
	}
	if req.ExpenseDate != "" {
		if _, err := time.Parse("2006-01-02", req.ExpenseDate); err == nil {
			expense.ExpenseDate = req.ExpenseDate
		}
	}
	if req.Notes != "" {
		expense.Notes = req.Notes
	}

	if err := database.DB.Save(&expense).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui pengeluaran: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, expense)
}

func (ec *ExpenseController) DeleteExpense(c *gin.Context) {
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

	result := database.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Expense{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus pengeluaran"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Catatan pengeluaran tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pengeluaran berhasil dihapus"})
}
