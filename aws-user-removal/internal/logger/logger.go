package logger

import (
	"os"
	"time"

	"github.com/fatih/color"
)

type Logger struct {
	infoColor    *color.Color
	successColor *color.Color
	warningColor *color.Color
	errorColor   *color.Color
}

func New() *Logger {
	return &Logger{
		infoColor:    color.New(color.FgBlue),
		successColor: color.New(color.FgGreen),
		warningColor: color.New(color.FgYellow),
		errorColor:   color.New(color.FgRed),
	}
}

func (l *Logger) timestamp() string {
	return time.Now().Format("2006-01-02 15:04:05")
}

func (l *Logger) Info(msg string) {
	l.infoColor.Printf("[INFO] %s - %s\n", l.timestamp(), msg)
}

func (l *Logger) Success(msg string) {
	l.successColor.Printf("[SUCCESS] %s - %s\n", l.timestamp(), msg)
}

func (l *Logger) Warning(msg string) {
	l.warningColor.Printf("[WARNING] %s - %s\n", l.timestamp(), msg)
}

func (l *Logger) Error(msg string) {
	l.errorColor.Fprintf(os.Stderr, "[ERROR] %s - %s\n", l.timestamp(), msg)
}
