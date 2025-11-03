# Prompt Analysis Integration

## Overview
This document describes the integration of backend prompt analysis into the Chrome extension, providing a seamless fallback mechanism between backend and local analysis.

## Changes Made

### 1. Backend API Service (`extension/src/services/BackendApiService.ts`)

#### Added Interfaces
- `PromptAnalysisRequest`: Request payload for prompt analysis
  - `text`: The prompt text to analyze
  - `clientId`: Optional client identifier
  - `mspId`: Optional MSP identifier

- `PromptAnalysisResponse`: Response from backend analysis
  - `isThreats`: Boolean indicating if threats were detected
  - `threats`: Array of threat descriptions
  - `riskLevel`: Risk level (safe, low, medium, high)
  - `summary`: Brief explanation of the analysis
  - `quickPattern`: Optional quick pattern match
  - `dangerousPattern`: Optional dangerous pattern match

#### New Method: `analyzePromptInjection(text: string)`
- Calls the backend endpoint `/api/v1/analyze/prompt`
- Includes authentication headers
- Returns `PromptAnalysisResponse` or `null` if backend is disabled/fails
- Logs all analysis attempts for debugging

### 2. Background Script (`extension/src/background/index.ts`)

#### Updated `TEST_PROMPT_INJECTION` Handler
The handler now implements a smart fallback mechanism:

1. **Primary: Backend Analysis**
   - Attempts backend analysis first if `config.backendConfig.enabled` is true
   - Uses `BackendApiService.getInstance().analyzePromptInjection()`
   - Logs success with method indicator: `(backend)`

2. **Fallback: Local Gemini Analysis**
   - If backend is disabled or fails, falls back to local Gemini API
   - Uses existing `FastThreatDetector.analyzeContent()`
   - Logs success with method indicator: `(local-gemini)`
   - Requires Gemini API key to be configured

3. **Error Handling**
   - Clear error messages for missing configuration
   - Graceful degradation from backend to local
   - All errors logged with detailed context

#### Response Enhancement
The response now includes:
- `scanType`: Indicates which method was used (`'backend'` or `'local-gemini'`)
- `quickPattern`: Backend's quick pattern detection result
- `dangerousPattern`: Backend's dangerous pattern detection result

## Backend Endpoint

### Endpoint: `POST /api/v1/analyze/prompt`

**Request:**
```json
{
  "text": "The prompt to analyze",
  "clientId": "optional-client-id",
  "mspId": "optional-msp-id"
}
```

**Response:**
```json
{
  "isThreats": true,
  "threats": ["Instruction override attempt", "Role manipulation"],
  "riskLevel": "high",
  "summary": "Detected multiple prompt injection patterns",
  "quickPattern": "ignore previous instructions",
  "dangerousPattern": "system prompt revelation"
}
```

### Backend Implementation
- Service: `backend/app/services/prompt_analysis_service.py`
- Uses Google Gemini API for LLM-based analysis
- Includes local pattern matching for quick detection
- Endpoint: `backend/app/api/v1/endpoints/analyze.py`

## Configuration

### Extension Settings
1. **Backend Configuration**
   - `apiUrl`: Backend API URL (default: `http://localhost:8000`)
   - `enabled`: Toggle backend integration
   - `clientId`: Client identifier
   - `mspId`: MSP identifier

2. **Fallback Configuration**
   - `geminiApiKey`: Gemini API key for local analysis
   - Used only when backend is disabled or fails

## Benefits

1. **Centralized Analysis**: Backend provides consistent analysis across all clients
2. **Reduced API Costs**: Single Gemini API key in backend instead of per-extension
3. **Better Monitoring**: All analyses logged in backend audit system
4. **Graceful Degradation**: Automatic fallback ensures service continuity
5. **Enhanced Detection**: Backend combines LLM analysis with pattern matching

## Testing

### Build Verification
```powershell
cd extension
npm run build
```
✅ Build completed successfully without errors

### Manual Testing Steps
1. Enable backend in extension settings
2. Test prompt injection detection with backend enabled
3. Verify logs show `(backend)` method indicator
4. Disable backend or stop backend service
5. Test again and verify fallback to `(local-gemini)`
6. Check console logs for proper fallback messaging

## Logging

All prompt analyses are logged with:
- Analysis method used (backend/local-gemini)
- Detection results (threats, risk level)
- Timestamp and categorization
- Detailed error information for debugging

Example log entries:
- `🏛️ Attempting backend prompt analysis...`
- `✅ Backend prompt analysis successful`
- `⚠️ Backend analysis failed or returned null, falling back to local Gemini`
- `🚨 INJECTION DETECTED (backend): HIGH risk - ...`
- `✅ SAFE PROMPT (local-gemini): No threats detected`

## Error Scenarios

1. **Backend Disabled**: Falls back to local Gemini
2. **Backend API Error**: Falls back to local Gemini
3. **No Gemini API Key**: Returns error message to user
4. **Both Methods Unavailable**: Clear error message with configuration instructions

## Future Enhancements

- Add caching for repeated prompts
- Implement rate limiting
- Add metrics collection
- Support batch analysis
- Add custom pattern definitions
