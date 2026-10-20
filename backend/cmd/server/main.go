package main

import (
	"log"

	"daily-spent-tracker-backend/config"
	"daily-spent-tracker-backend/database"
	"daily-spent-tracker-backend/routes"
)

func main() {
	cfg := config.LoadConfig()

	log.Println("🚀 Starting TieroSaver Backend Server...")
	database.InitDB(cfg)

	r := routes.SetupRouter(cfg)

	log.Printf("🔥 Server running and listening on port :%s\n", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
