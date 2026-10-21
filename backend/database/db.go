package database

import (
	"fmt"
	"log"

	"daily-spent-tracker-backend/config"
	"daily-spent-tracker-backend/models"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB
var ActiveDBType string

func InitDB(cfg *config.Config) *gorm.DB {
	var err error

	if cfg.DBType == "postgres" {
		dsn := fmt.Sprintf(
			"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Jakarta",
			cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort, cfg.DBSSLMode,
		)

		var pgDB *gorm.DB
		pgDB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Warn),
		})

		if err == nil {
			DB = pgDB
			log.Printf(" Successfully connected to PostgreSQL database [%s] at %s:%s\n", cfg.DBName, cfg.DBHost, cfg.DBPort)
			ActiveDBType = "PostgreSQL"
		} else {
			DB = nil
			log.Printf("⚠️ PostgreSQL connection failed: %v\n", err)
			if !cfg.AllowFallback {
				log.Fatalf("PostgreSQL connection required but failed: %v", err)
			}
			log.Println("⚡ Falling back to local SQLite database (daily_tracker.db) for uninterrupted development...")
		}
	}

	if DB == nil {
		var sqliteDB *gorm.DB
		dbFilePath := cfg.DBFile
		if dbFilePath == "" {
			dbFilePath = "daily_tracker.db"
		}
		sqliteDB, err = gorm.Open(sqlite.Open(dbFilePath), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Warn),
		})
		if err != nil {
			log.Fatalf("Failed to initialize database: %v", err)
		}
		DB = sqliteDB
		if cfg.DBType == "sqlite" {
			log.Printf("📦 Successfully connected to SQLite database (%s)\n", dbFilePath)
			ActiveDBType = "SQLite"
		} else {
			log.Printf(" Successfully initialized local database (%s)\n", dbFilePath)
			ActiveDBType = "SQLite (Local Fallback)"
		}
	}

	// Auto Migration
	log.Println("⏳ Running auto migrations...")
	err = DB.AutoMigrate(
		&models.User{},
		&models.Expense{},
		&models.BudgetLimit{},
		&models.SavingsGoal{},
		&models.SavingsTransaction{},
	)
	if err != nil {
		log.Fatalf("Failed to auto migrate database: %v", err)
	}

	log.Println(" Database auto migration completed successfully.")
	return DB
}
