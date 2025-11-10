package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Database     DatabaseConfig     `yaml:"database"`
	Scheduler    SchedulerConfig    `yaml:"scheduler"`
	Provisioning ProvisioningConfig `yaml:"provisioning"`
	Logging      LoggingConfig      `yaml:"logging"`
	Server       ServerConfig       `yaml:"server"`
}

type DatabaseConfig struct {
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	User     string `yaml:"user"`
	Password string `yaml:"password"`
	DBName   string `yaml:"dbname"`
	SSLMode  string `yaml:"sslmode"`
}

type SchedulerConfig struct {
	CheckInterval string `yaml:"check_interval"`
	Timezone      string `yaml:"timezone"`
	MaxRetries    int    `yaml:"max_retries"`
	RetryDelay    int    `yaml:"retry_delay"` // seconds
}

type ProvisioningConfig struct {
	APIURL        string `yaml:"api_url"`
	Timeout       int    `yaml:"timeout"` // seconds
	RetryAttempts int    `yaml:"retry_attempts"`
	RetryDelay    int    `yaml:"retry_delay"` // seconds
}

type LoggingConfig struct {
	Level  string `yaml:"level"`
	Format string `yaml:"format"`
	Output string `yaml:"output"`
}

type ServerConfig struct {
	Port int `yaml:"port"`
}

// Load reads the configuration from a YAML file
func Load(path string) (*Config, error) {
	// Read file
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	// Parse YAML
	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	// Override with environment variables
	overrideWithEnv(&cfg)

	// Validate configuration
	if err := validate(&cfg); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	return &cfg, nil
}

// overrideWithEnv overrides configuration with environment variables
func overrideWithEnv(cfg *Config) {
	if host := os.Getenv("DATABASE_HOST"); host != "" {
		cfg.Database.Host = host
	}
	if port := os.Getenv("DATABASE_PORT"); port != "" {
		fmt.Sscanf(port, "%d", &cfg.Database.Port)
	}
	if user := os.Getenv("DATABASE_USER"); user != "" {
		cfg.Database.User = user
	}
	if password := os.Getenv("DATABASE_PASSWORD"); password != "" {
		cfg.Database.Password = password
	}
	if dbname := os.Getenv("DATABASE_NAME"); dbname != "" {
		cfg.Database.DBName = dbname
	}
	if apiURL := os.Getenv("PROVISIONING_API_URL"); apiURL != "" {
		cfg.Provisioning.APIURL = apiURL
	}
	if interval := os.Getenv("SCHEDULER_INTERVAL"); interval != "" {
		cfg.Scheduler.CheckInterval = interval
	}
	if level := os.Getenv("LOG_LEVEL"); level != "" {
		cfg.Logging.Level = level
	}
}

// validate checks if the configuration is valid
func validate(cfg *Config) error {
	if cfg.Database.Host == "" {
		return fmt.Errorf("database host is required")
	}
	if cfg.Database.User == "" {
		return fmt.Errorf("database user is required")
	}
	if cfg.Database.DBName == "" {
		return fmt.Errorf("database name is required")
	}
	if cfg.Provisioning.APIURL == "" {
		return fmt.Errorf("provisioning API URL is required")
	}
	if cfg.Scheduler.CheckInterval == "" {
		return fmt.Errorf("scheduler check interval is required")
	}
	return nil
}
