package database

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// Job type constants
const (
	JobTypeProvision  = "provision"
	JobTypeTerminate  = "terminate"
)

// JSONB is a wrapper around json.RawMessage that implements
// driver.Valuer and sql.Scanner for PostgreSQL JSONB columns.
type JSONB json.RawMessage

// Value implements the driver.Valuer interface for JSONB.
func (j JSONB) Value() (driver.Value, error) {
	if len(j) == 0 {
		return nil, nil
	}
	return []byte(j), nil
}

// Scan implements the sql.Scanner interface for JSONB.
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	b, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("JSONB: expected []byte, got %T", value)
	}
	result := make(JSONB, len(b))
	copy(result, b)
	*j = result
	return nil
}

// MarshalJSON implements json.Marshaler so JSONB round-trips cleanly.
func (j JSONB) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("null"), nil
	}
	return []byte(j), nil
}

// UnmarshalJSON implements json.Unmarshaler.
func (j *JSONB) UnmarshalJSON(data []byte) error {
	if j == nil {
		return fmt.Errorf("JSONB: UnmarshalJSON on nil pointer")
	}
	*j = append((*j)[0:0], data...)
	return nil
}

// ScheduledJob is the generic job record used for both provision and terminate jobs.
type ScheduledJob struct {
	ID           uuid.UUID      `json:"id"`
	JobType      string         `json:"job_type"`
	Payload      JSONB          `json:"payload"`
	ScheduleTime time.Time      `json:"schedule_time"`
	Status       string         `json:"status"`
	Tags         pq.StringArray `json:"tags"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	ExecutedAt   *time.Time     `json:"executed_at,omitempty"`
	ErrorMessage *string        `json:"error_message,omitempty"`
	RetryCount   int            `json:"retry_count"`
}

// ScheduledProvision represents a scheduled user provisioning job
type ScheduledProvision struct {
	ID           uuid.UUID        `json:"id"`
	EmployeeData EmployeeData     `json:"employee_data"`
	Applications ApplicationsData `json:"applications"`
	ScheduleTime time.Time        `json:"schedule_time"`
	Status       string           `json:"status"`
	Tags         pq.StringArray   `json:"tags"`
	CreatedAt    time.Time        `json:"created_at"`
	UpdatedAt    time.Time        `json:"updated_at"`
	ExecutedAt   *time.Time       `json:"executed_at,omitempty"`
	ErrorMessage *string          `json:"error_message,omitempty"`
	RetryCount   int              `json:"retry_count"`
}

// EmployeeData contains employee information
type EmployeeData struct {
	FullName      string `json:"fullName"`
	WorkEmail     string `json:"workEmail"`
	PersonalEmail string `json:"personalEmail"`
	Department    string `json:"department"`
	JobTitle      string `json:"jobTitle"`
	Role          string `json:"role"`
}

// ApplicationsData contains application-specific provisioning data
type ApplicationsData struct {
	Google           bool                   `json:"google"`
	Microsoft        bool                   `json:"microsoft"`
	GoogleWorkspace  map[string]interface{} `json:"google-workspace,omitempty"`
	Microsoft365     map[string]interface{} `json:"microsoft-365,omitempty"`
}

// Value implements the driver.Valuer interface for EmployeeData
func (e EmployeeData) Value() (driver.Value, error) {
	return json.Marshal(e)
}

// Scan implements the sql.Scanner interface for EmployeeData
func (e *EmployeeData) Scan(value interface{}) error {
	b, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(b, e)
}

// Value implements the driver.Valuer interface for ApplicationsData
func (a ApplicationsData) Value() (driver.Value, error) {
	return json.Marshal(a)
}

// Scan implements the sql.Scanner interface for ApplicationsData
func (a *ApplicationsData) Scan(value interface{}) error {
	b, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(b, a)
}

// Status constants
const (
	StatusPending   = "pending"
	StatusExecuting = "executing"
	StatusCompleted = "completed"
	StatusFailed    = "failed"
	StatusCancelled = "cancelled"
)

// Common tags
const (
	TagToBeCreated = "to be created"
	TagNewHire     = "new-hire"
	TagContractor  = "contractor"
	TagIntern      = "intern"
)
