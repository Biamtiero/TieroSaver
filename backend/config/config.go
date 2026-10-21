package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port          string
	DBType        string // "postgres" or "sqlite"
	DBFile        string // sqlite database file path
	DBHost        string
	DBPort        string
	DBUser        string
	DBPassword    string
	DBName        string
	DBSSLMode     string
	JWTSecret     string
	AllowFallback bool
}

func LoadConfig() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("Note: .env file not found or already loaded from environment")
	}

	port := getEnv("PORT", "8080")
	dbType := getEnv("DB_TYPE", "postgres")
	dbFile := getEnv("DB_FILE", "daily_tracker.db")
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "postgres")
	dbName := getEnv("DB_NAME", "daily_spent_tracker")
	dbSSLMode := getEnv("DB_SSLMODE", "disable")
	jwtSecret := getEnv("JWT_SECRET", "daily_spent_tracker_secret_key_123456789")
	allowFallback := getEnv("ALLOW_SQLITE_FALLBACK", "true") == "true"

	return &Config{
		Port:          port,
		DBType:        dbType,
		DBFile:        dbFile,
		DBHost:        dbHost,
		DBPort:        dbPort,
		DBUser:        dbUser,
		DBPassword:    dbPassword,
		DBName:        dbName,
		DBSSLMode:     dbSSLMode,
		JWTSecret:     jwtSecret,
		AllowFallback: allowFallback,
	}
}

func getEnv(key, defaultVal string) string {
	if val, exists := os.LookupEnv(key); exists && val != "" {
		return val
	}
	return defaultVal
}
