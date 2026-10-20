package controllers

import (
	"net/http"

	"daily-spent-tracker-backend/database"
	"daily-spent-tracker-backend/middleware"
	"daily-spent-tracker-backend/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type AuthController struct {
	JWTSecret string
}

func NewAuthController(secret string) *AuthController {
	return &AuthController{JWTSecret: secret}
}

func (a *AuthController) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validasi gagal: " + err.Error()})
		return
	}

	var existing models.User
	if err := database.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email sudah terdaftar, silakan gunakan email lain atau login"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengenkripsi kata sandi"})
		return
	}

	user := models.User{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mendaftarkan akun: " + err.Error()})
		return
	}

	// Create initial budget limits for user
	budget := models.BudgetLimit{
		UserID:       user.ID,
		DailyLimit:   0,
		WeeklyLimit:  0,
		MonthlyLimit: 0,
	}
	database.DB.Create(&budget)

	token, err := middleware.GenerateToken(user.ID, user.Email, a.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghasilkan token autentikasi"})
		return
	}

	c.JSON(http.StatusCreated, models.AuthResponse{
		Token: token,
		User:  user.ToResponse(),
	})
}

func (a *AuthController) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email dan kata sandi wajib diisi"})
		return
	}

	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email atau kata sandi tidak cocok"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email atau kata sandi tidak cocok"})
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Email, a.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghasilkan token autentikasi"})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponse{
		Token: token,
		User:  user.ToResponse(),
	})
}

func (a *AuthController) Me(c *gin.Context) {
	userID, err := middleware.GetAuthUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Akses tidak diizinkan"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pengguna tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, user.ToResponse())
}
