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
	JobTypeProvision         = "provision"
	JobTypeTerminate         = "terminate"
	JobTypeSuspend           = "suspend"
	JobTypeReactivate        = "reactivate"
	JobTypeModifyGroups      = "modify_groups"
	JobTypeModifyLicense     = "modify_license"
	JobTypeModifyRole        = "modify_role"
	JobTypePasswordReset     = "password_reset"
	JobTypeTransferOwnership = "transfer_ownership"
)

// ValidJobTypes is the set of all recognized job types.
var ValidJobTypes = map[string]bool{
	JobTypeProvision:         true,
	JobTypeTerminate:         true,
	JobTypeSuspend:           true,
	JobTypeReactivate:        true,
	JobTypeModifyGroups:      true,
	JobTypeModifyLicense:     true,
	JobTypeModifyRole:        true,
	JobTypePasswordReset:     true,
	JobTypeTransferOwnership: true,
}

// Approval status constants
const (
	ApprovalPending      = "pending_approval"
	ApprovalApproved     = "approved"
	ApprovalRejected     = "rejected"
	ApprovalAutoApproved = "auto_approved"
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

// ScheduledJob is the generic job record for all lifecycle operations.
type ScheduledJob struct {
	ID              uuid.UUID      `json:"id"`
	JobType         string         `json:"job_type"`
	Payload         JSONB          `json:"payload"`
	ScheduleTime    time.Time      `json:"schedule_time"`
	Status          string         `json:"status"`
	Tags            pq.StringArray `json:"tags"`
	TargetUserEmail *string        `json:"target_user_email,omitempty"`
	RequestedBy     *string        `json:"requested_by,omitempty"`
	ApprovedBy      *string        `json:"approved_by,omitempty"`
	ApprovalStatus  string         `json:"approval_status"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	ExecutedAt      *time.Time     `json:"executed_at,omitempty"`
	ErrorMessage    *string        `json:"error_message,omitempty"`
	RetryCount      int            `json:"retry_count"`
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

// ManagedUser is the local mirror of a Google Workspace user, populated by directory sync.
type ManagedUser struct {
	ID               uuid.UUID  `json:"id"`
	Email            string     `json:"email"`
	FullName         string     `json:"full_name"`
	GivenName        *string    `json:"given_name,omitempty"`
	FamilyName       *string    `json:"family_name,omitempty"`
	Department       *string    `json:"department,omitempty"`
	JobTitle         *string    `json:"job_title,omitempty"`
	ManagerEmail     *string    `json:"manager_email,omitempty"`
	OrgUnitPath      *string    `json:"org_unit_path,omitempty"`
	IsAdmin          bool       `json:"is_admin"`
	IsDelegatedAdmin bool       `json:"is_delegated_admin"`
	IsSuspended      bool       `json:"is_suspended"`
	GoogleID         *string    `json:"google_id,omitempty"`
	Status           string     `json:"status"`
	Metadata         JSONB      `json:"metadata"`
	LastSyncedAt     *time.Time `json:"last_synced_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// DirectorySyncRun tracks a single execution of the directory sync.
type DirectorySyncRun struct {
	ID           uuid.UUID  `json:"id"`
	Status       string     `json:"status"` // running, completed, failed
	UsersSynced  int        `json:"users_synced"`
	UsersAdded   int        `json:"users_added"`
	UsersUpdated int        `json:"users_updated"`
	UsersRemoved int        `json:"users_removed"`
	Errors       JSONB      `json:"errors"`
	StartedAt    time.Time  `json:"started_at"`
	CompletedAt  *time.Time `json:"completed_at,omitempty"`
}

// ChangeRequest represents any lifecycle change that requires admin approval.
type ChangeRequest struct {
	ID              uuid.UUID  `json:"id"`
	RequestType     string     `json:"request_type"`
	TargetUserEmail string     `json:"target_user_email"`
	TargetUserName  *string    `json:"target_user_name,omitempty"`
	Payload         JSONB      `json:"payload"`
	ScheduleTime    *time.Time `json:"schedule_time,omitempty"`
	Status          string     `json:"status"`
	RequestedBy     string     `json:"requested_by"`
	RequestedAt     time.Time  `json:"requested_at"`
	ApprovedBy      *string    `json:"approved_by,omitempty"`
	ApprovedAt      *time.Time `json:"approved_at,omitempty"`
	ExecutedAt      *time.Time `json:"executed_at,omitempty"`
	ErrorMessage    *string    `json:"error_message,omitempty"`
	RetryCount      int        `json:"retry_count"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// ChangeRequest status constants
const (
	CRStatusPendingApproval = "pending_approval"
	CRStatusApproved        = "approved"
	CRStatusRejected        = "rejected"
	CRStatusScheduled       = "scheduled"
	CRStatusExecuting       = "executing"
	CRStatusCompleted       = "completed"
	CRStatusFailed          = "failed"
	CRStatusCancelled       = "cancelled"
)

// ChangeRequest type constants
const (
	CRTypeProvision     = "provision"
	CRTypeTerminate     = "terminate"
	CRTypeGroupChange   = "group_change"
	CRTypeLicenseChange = "license_change"
	CRTypePasswordReset = "password_reset"
	CRTypeRoleChange    = "role_change"
	CRTypeSuspend       = "suspend"
	CRTypeReactivate    = "reactivate"
)
