# Prompt Guard Implementation

## Overview
The Prompt Guard automatically detects prompts in editable fields, analyzes them via POST `/analyze/prompt`, and prevents send/submit behavior when blocked.

## Analyzer Contract

### Endpoint
- **URL**: `POST /api/v1/analyze/prompt`
- **Authentication**: None (allows extension access)

### Request
```json
{
  "prompt": "string"
}
```

### Response
```json
{
  "isThreats": boolean,
  "threats": string[],
  "riskLevel": "low"|"medium"|"high"|"critical",
  "summary": string,
  "quickPattern": string|null,
  "dangerousPattern": string|null,
  "shouldBlock": boolean,
  "blockReason": string,
  "piiDetection": {
    "hasPII": boolean,
    "types": string[],
    "count": number,
    "riskLevel": "low"|"medium"|"high"|"critical"
  }
}
```

## Implementation Details

### Backend (`backend/app/api/v1/endpoints/analyze.py`)
1. **Request Model**: Uses `prompt` field (matches contract)
2. **Response Model**: Includes all required fields from contract
3. **Risk Levels**: Supports "low", "medium", "high", "critical"
4. **Auth**: Skipped for `/api/v1/analyze/prompt` in middleware

### Extension Service (`extension/src/services/BackendApiService.ts`)
1. **Request Payload**: Sends `prompt` field
2. **Response Handling**: Maps all fields correctly
3. **Interface**: `PromptAnalysisResponse` matches contract exactly

### Extension Guard (`extension/src/guards/PromptGuard.ts`)
1. **Call Method**: `analyzePromptInjection(text)`
2. **Decision Logic**: Blocks if `shouldBlock: true` OR `isThreats: true`
3. **Logging**: Structured logging with correlation IDs
4. **User Feedback**: Shows notifications when blocked

## Key Features

### Detection
- Intercepts editable fields (textarea, input[type="text"], contenteditable)
- Calls backend analyzer for every prompt
- Detects:
  - Prompt injection patterns
  - PII data
  - Dangerous patterns
  - Quick patterns

### Blocking Behavior
When `shouldBlock: true`:
1. Clears input field
2. Shows error notification
3. Returns `isSafe: false`
4. Logs threat to extension storage

### Risk Assessment
- **Safe/Low**: Pattern detected but low risk
- **Medium**: Suspicious patterns or PII
- **High**: Multiple indicators or dangerous patterns
- **Critical**: Severe threat detected

## Logging Events
- `prompt_guard_check_start`: Analysis begins
- `prompt_guard_check_passed`: Allowed (with risk level)
- `prompt_guard_check_failed`: Blocked (with reason)
- `prompt_guard_check_error`: Error occurred

All events include:
- `latencyMs`: Time to analyze
- `riskLevel`: Risk assessment
- `reason`: Why blocked (if applicable)

