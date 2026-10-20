package routes

import (
	"time"

	"daily-spent-tracker-backend/config"
	"daily-spent-tracker-backend/controllers"
	"daily-spent-tracker-backend/database"
	"daily-spent-tracker-backend/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SetupRouter(cfg *config.Config) *gin.Engine {
	r := gin.Default()

	// Setup CORS
	corsConfig := cors.Config{
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		AllowOriginFunc: func(origin string) bool {
			return true
		},
		MaxAge: 12 * time.Hour,
	}
	r.Use(cors.New(corsConfig))

	// Health check & Info
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":   "ok",
			"database": database.ActiveDBType,
			"time":     time.Now().Format(time.RFC3339),
		})
	})

	authCtrl := controllers.NewAuthController(cfg.JWTSecret)
	expenseCtrl := controllers.NewExpenseController()
	budgetCtrl := controllers.NewBudgetController()
	savingsCtrl := controllers.NewSavingsController()

	// Public routes
	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", authCtrl.Register)
			auth.POST("/login", authCtrl.Login)
		}

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		{
			// Current user
			protected.GET("/auth/me", authCtrl.Me)

			// Expenses
			expenses := protected.Group("/expenses")
			{
				expenses.GET("/overview", expenseCtrl.GetOverview)
				expenses.POST("", expenseCtrl.CreateExpense)
				expenses.PUT("/:id", expenseCtrl.UpdateExpense)
				expenses.DELETE("/:id", expenseCtrl.DeleteExpense)
			}

			// Budget Limits
			budgets := protected.Group("/budgets")
			{
				budgets.GET("/overview", budgetCtrl.GetBudgetOverview)
				budgets.POST("/limits", budgetCtrl.SetBudgetLimits)
			}

			// Savings Goals (Save Tracker)
			savings := protected.Group("/savings")
			{
				savings.GET("", savingsCtrl.GetSavingsGoals)
				savings.POST("", savingsCtrl.CreateSavingsGoal)
				savings.PUT("/:id", savingsCtrl.UpdateSavingsGoal)
				savings.DELETE("/:id", savingsCtrl.DeleteSavingsGoal)
				savings.POST("/:id/transaction", savingsCtrl.AddTransaction)
			}
		}
	}

	return r
}
