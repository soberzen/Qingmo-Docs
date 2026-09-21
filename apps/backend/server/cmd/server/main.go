package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"doc-server/internal/config"
	"doc-server/internal/server"
)

func gracefulShutdown(httpServer *http.Server, done chan bool) {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)

	defer stop()

	<-ctx.Done()

	log.Println("shutting down gracefully, press Ctrl+C again to force")
	stop()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		log.Println("error shutting down server server:", err)
	}

	log.Println("Server exiting...")

	done <- true
}

func main() {
	if err := config.LoadEnv(".", os.Getenv("APP_ENV")); err != nil {
		log.Fatalf("load environment failed: %v", err)
	}

	server := server.NewServer()
	done := make(chan bool, 1)

	go gracefulShutdown(server, done)

	err := server.ListenAndServe()

	if err != nil && err != http.ErrServerClosed {
		panic(fmt.Sprintf("http server error: %s", err))
	}

	<-done
	log.Println("Graceful shutdown complete.")
}
