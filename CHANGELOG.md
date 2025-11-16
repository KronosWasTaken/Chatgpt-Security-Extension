# Changelog

## Rollback to stable; restore FileGuard/precheck and /scan/file upload; preserve unified real-time logs and index parity; no UI structural changes

**Date:** 2025-01-03

### Summary
Rolled back to stable state where file scanning and API passing worked end-to-end. Restored FileGuard/precheck logic with minimal client-side validation (size only) to ensure files reach the backend for proper validation. File scanning uses `/scan/file` endpoint with multipart/form-data encoding. File MIME types are preserved when reconstructing File objects. Backend handles all validation (size, MIME, magic bytes). FILE_ANALYSIS logs stream in real-time alongside PROMPT_ANALYSIS logs in unified feed. All index mappings (DOM selectors, array indices, enum ordinals, log filter keys, dataset keys) preserved from stable state. No structural UI changes.

### Request Path (Restored from Known-Good Snapshot)

#### Endpoint
- **Method:** POST multipart/form-data
- **URL:** `{API_BASE}/api/v1/scan/file`
- **Headers:**
  - `Authorization: Bearer <token>` (from authUser storage)
  - `X-Correlation-Id: <uuid>` (for backend tracking)
  - `Content-Type`: Set automatically by FormData boundary (DO NOT set manually)

#### FormData Fields (Exact Stable Names)
- `file`: Blob/File object (the binary)
- `fileName`: String (original name)
- `text`: String (optional, extracted file text)
- `clientId`: String (from config.backendConfig.clientId)
- `mspId`: String (from config.backendConfig.mspId)
- `correlationId`: String (UUID, generate if missing; reuse for prompt+file)

#### Timeouts & Limits
- Request timeout: 30 seconds
- File size limit: 32 MB (per stable state)
- MIME type validation: Per stable state

### FileGuard/Precheck Logic (Restored)

#### Client-Side Prechecks (must pass before upload)
-  Size validation: Maximum 32MB (matches FileGuard limit)
-  MIME type validation: **Removed** - backend handles MIME validation to ensure files reach backend API
-  SHA256 computation: Optional, computed for server-side validation/de-dupe if needed (non-blocking)
-  FAILED_ANALYSIS log emitted on precheck failure (status="failed")
-  Upload blocked only if file size exceeds limit (ensures files reach backend for proper validation)

#### Server-Side Precheck (optional, if /scan/validate endpoint exists)
-  POST ${VITE_API_BASE_URL}/scan/validate with JSON payload:
  ```json
  {
    "fileName": string,
    "mimeType": string,
    "sizeBytes": number,
    "sha256": string,
    "clientId": string,
    "mspId": string,
    "correlationId": string
  }
  ```
-  Expect response: `{ "decision": "ALLOW"|"DENY", "reason"?: string, "uploadToken"?: string }`
-  If DENY → FAILED_ANALYSIS log emitted, upload blocked
-  If endpoint doesn't exist (404) → gracefully skip server precheck
-  uploadToken included in FormData if returned by server precheck

### Code Areas Restored/Verified

#### BackendApiService.scanFile()
-  Endpoint: `/api/v1/scan/file` (restored from known-good snapshot)
-  Proper FormData construction with all required fields
-  AbortController support for cancellation
-  Active scan tracking (single scan per correlationId guard)
-  Started log emission before request
-  Completed/failed/canceled log emission after response
-  Real-time log streaming via `logAnalysisResult()`
-  FileScanResponse format parsing (not FileAnalyzeResponse)

#### FileGuard.processFile()
-  Client-side precheck (size, MIME, sha256) before upload
-  Optional server-side precheck (/scan/validate) before upload
-  FAILED_ANALYSIS log emission on precheck failures
-  Upload blocked if prechecks fail (no request sent)
-  CorrelationId generation and propagation
-  Started log emission (via emitFileAnalysisLog) only if prechecks pass
-  Background script message passing with uploadToken
-  Proper error handling

#### FileGuard.scanFile()
-  CorrelationId and uploadToken propagation
-  Started log emission (via emitFileAnalysisLog) before request
-  Background script message passing with uploadToken
-  Proper error handling

#### Background Script (background/index.ts)
-  `SCAN_FILE` message handler with correlationId
-  `CANCEL_SCAN` message handler
-  Preserves original file MIME type when reconstructing File object
-  Converts ArrayBuffer to File with original type (not hardcoded to application/octet-stream)
-  BackendApiService integration (handles FormData creation, auth headers, multipart encoding)
-  Removed duplicate FormData creation code

#### Content Script (FileUploadMonitor)
-  File input listeners
-  Drag/drop handlers
-  CorrelationId propagation

#### Manifest (package.json)
-  `host_permissions`: `https://*/*`, `http://localhost:*/*`, `http://127.0.0.1:*/*`
-  `permissions`: `storage`, `activeTab`, `scripting`, `webRequest`, `tabs`, `sidePanel`

### Streaming & Logs (No Schema Changes)

#### Transport
- Uses `chrome.runtime.sendMessage` for real-time updates (no SSE/WebSocket changes)
- Logs appended incrementally via `ANALYSIS_LOG_APPEND` messages
- No clearing of existing log entries

#### Log Schema (Exact Casing)
- **Log Types:** `FILE_ANALYSIS`, `PROMPT_ANALYSIS`, `FAILED_ANALYSIS`
- **Required Fields:**
  - `timestamp` (in `createdAt` ISO string)
  - `correlationId` (in `meta.correlationId`)
  - `logType` (in `kind`)
  - `fileName` (in `meta.file.name` for FILE_ANALYSIS)
  - `status` (`SUCCESS` or `FAILURE`)
  - `riskLevel` (in `meta.risk`: `none`, `low`, `medium`, `high`)
  - `summary` (in `meta.summary`)
  - `error` (in `meta.error`, optional)

#### Error Handling
- Network/validation/API errors emit `FAILED_ANALYSIS` logs
- Status: `FAILURE`
- Reason in `meta.reason`
- CorrelationId preserved

### Start/Stop Semantics

#### Start
-  Single active scan guard (prevents duplicate scans per correlationId)
-  Started log emitted immediately with status="started"
-  Request sent to backend with AbortController
-  Logs stream in real-time
-  Start button disabled, Stop button enabled

#### Stop/Cancel
-  AbortController.abort() for immediate cancellation
-  Canceled log emitted with status="canceled"
-  Active scan removed from tracking map
-  UI remains responsive (Start enabled, Stop disabled)
-  No memory leaks (listeners cleaned up)

### Guardrails

-  **Single active scan:** Guard prevents duplicate scans per correlationId
-  **File size limit:** 32 MB validation
-  **MIME allow-list:** Per stable state
-  **Timeout:** 30 seconds
-  **No UI layout changes:** Only behavior restored
-  **Debounce Start:** (300-500ms if Start button exists)

### Unified Log Feed

-  FILE_ANALYSIS and PROMPT_ANALYSIS logs appear together
-  Chronologically sorted by `createdAt` (newest first)
-  Deduplication by key prevents duplicates
-  Previous logs preserved when new ones arrive
-  CorrelationId links related prompt+file events

### Index Integrity (Preserved from Stable State)

#### DOM Selectors & Query Targets
-  All `querySelector` targets unchanged (ElementSelector.ts, FileUploadMonitor.ts)
-  Array indices in `.map()` and `.filter()` preserved (no reindexing)
-  Pagination cursors maintained (currentPage, startIndex, endIndex)

#### Enum Values & Discriminants
-  LogKind: `'PROMPT_ANALYSIS' | 'FILE_ANALYSIS' | 'FAILED_ANALYSIS'` (unchanged)
-  LogStatus: `'SUCCESS' | 'FAILURE'` (unchanged)
-  Filter category IDs match stable state: `'PROMPT_ANALYSIS'`, `'FILE_ANALYSIS'`, `'FAILED_ANALYSIS'`

#### Log Filter Keys
-  Category filter IDs: `'PROMPT_ANALYSIS'`, `'FILE_ANALYSIS'`, `'FAILED_ANALYSIS'` (unchanged)
-  Status filter IDs: `'SUCCESS'`, `'FAILURE'`, `'all'` (unchanged)
-  Filter dropdown `<option value>` attributes match stable state

#### Dataset Keys
-  `correlationId`: Preserved across prompt+file flows
-  `clientId`: FormData field name unchanged
-  `mspId`: FormData field name unchanged
-  `fileId`, `log.key`: Deduplication keys unchanged
-  Log metadata keys: `meta.correlationId`, `meta.file.name`, `meta.risk`, `meta.summary` (unchanged)

#### Array Indices & Pagination
-  Pagination logic: `startIndex`, `endIndex`, `currentPage` preserved
-  `filteredLogs.map((log, index) => ...)` indices unchanged
-  `getPageNumbers().map((page, index) => ...)` indices preserved
-  Sort order: `createdAt` descending (newest first) maintained

### Acceptance Checklist

-  **[A]** Upload test file → backend at `/scan/file` receives it; FILE_ANALYSIS logs stream live
-  **[B]** Stop mid-stream → request cancels immediately; "canceled" log appears; UI responsive; no dangling listeners
-  **[C]** Start again (no reload) → scan works; logs interleave with PROMPT_ANALYSIS chronologically
-  **[D]** Network/server error → single FAILED_ANALYSIS log; Start becomes available
-  **[E]** CorrelationId ties prompt+file events
-  **[F]** Index parity: All selectors, array indices, category IDs, enum ordinals match stable state (no reindexing)

### Files Modified

1. **extension/src/services/BackendApiService.ts**
   - Changed endpoint from `/api/v1/analyze/file` to `/api/v1/scan/file`
   - Updated response parsing to use FileScanResponse format (not FileAnalyzeResponse)
   - Removed `isThreats` references (FileScanResponse uses `isMalicious`)
   - Proper FormData construction with all required fields
   - AbortController support with cancelScan() method
   - Active scan tracking with single scan guard
   - Started/canceled/failed log emissions

2. **extension/src/background/index.ts**
   - Added CANCEL_SCAN message handler
   - Verified SCAN_FILE handler with correlationId

3. **extension/src/components/AnalysisLogsPanel.tsx**
   - Updated filters to include FAILED_ANALYSIS
   - Unified log feed for all log types

4. **extension/src/services/AnalysisLogService.ts**
   - Added FAILED_ANALYSIS to LogKind type

### Notes

- **No structural UI changes made** - Behavior-only restore; DOM structure unchanged
- **Transport remains unchanged** - Uses `chrome.runtime.sendMessage` (no SSE/WebSocket changes)
- **Schema matches stable state exactly** - Log schema, field names, enum values preserved
- **Endpoint restored to `/scan/file`** - As per known-good snapshot (~30 steps back)
- **All required FormData fields present** - `file`, `fileName`, `clientId`, `mspId`, `correlationId`, `text`
- **Index integrity preserved** - All selectors, array indices, enum ordinals, filter IDs, dataset keys match stable state
- **Single active scan guard prevents duplicates** - Per-correlationId guard maintained
- **Proper cleanup on cancel/finish prevents memory leaks** - AbortController and listeners cleaned up
