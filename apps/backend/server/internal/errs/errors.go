package errs

import (
	"errors"
	"fmt"
	"strings"

	"github.com/go-playground/validator/v10"
)

const (
	CodeInvalidRequest   int = 10001
	CodeEmailRequired    int = 10002
	CodeEmailInvalid     int = 10003
	CodePasswordRequired int = 10004
	CodeEmailExists      int = 10005
	CodeUserNotFound     int = 10006
	CodePasswordWrong    int = 10007
	// 400 series
	CodeUnauthorized     int = 40001
	CodeTokenInvalid     int = 40002
	CodeCredentialsError int = 40003

	CodeInternal int = 50000
)

var messages = map[int]string{
	CodeInvalidRequest:   "invalid request",
	CodeEmailRequired:    "email required",
	CodeEmailInvalid:     "email invalid",
	CodePasswordRequired: "password required",
	CodeEmailExists:      "email exists",
	CodeUserNotFound:     "user not found",
	CodePasswordWrong:    "password wrong",
	CodeInternal:         "internal error",
	CodeUnauthorized:     "unauthorized",
	CodeTokenInvalid:     "invalid token",
	CodeCredentialsError: "invalid credentials",
}

var (
	ErrUnauthorized     = New(CodeUnauthorized)
	ErrTokenInvalid     = New(CodeTokenInvalid)
	ErrCredentialsError = New(CodeCredentialsError)
	ErrUserNotFound     = New(CodeUserNotFound)
	ErrPasswordWrong    = New(CodePasswordWrong)
	ErrEmailExists      = New(CodeEmailExists)
	ErrInternal         = New(CodeInternal)
	ErrInvalidRequest   = New(CodeInvalidRequest)
)

type BizError struct {
	Code    int
	Message string
}

func (e *BizError) Error() string {
	if e.Message != "" {
		return e.Message
	}
	return Message(e.Code)
}

func New(code int) *BizError {
	return Newf(code, "%s", Message(code))
}

func Newf(code int, format string, args ...any) *BizError {
	return &BizError{
		Code:    code,
		Message: fmt.Sprintf(format, args...),
	}
}

func Message(code int) string {
	if msg, ok := messages[code]; ok {
		return msg
	}
	return "unknown error"
}

var validationMessages = map[string]string{
	"email": "email is invalid",
	"min":   "must be at least %s characters",
	"max":   "must be at most %s characters",
}

func FormatValidationMessage(err error) string {
	var validationErros validator.ValidationErrors

	if !errors.As(err, &validationErros) || len(validationErros) == 0 {
		return Message(CodeInvalidRequest)
	}

	fieldError := validationErros[0]

	fieldName := fieldError.Field()
	fieldTag := fieldError.Tag()

	if fieldTag == "required" {
		return fieldName + " is required"
	}

	if msg, ok := validationMessages[fieldTag]; ok {
		if strings.Contains(msg, "%s") {
			return fmt.Sprintf(msg, fieldError.Param())
		}
		return msg

	}

	return Message(CodeInvalidRequest)
}
