# Test script for API endpoints
# Usage: .\test_api_endpoints.ps1

# Get token first (login)
Write-Host "=== Step 1: Login and get token ===" -ForegroundColor Cyan
$loginBody = @{
    email = "admin@example.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.access_token
    Write-Host "✓ Token obtained: $($token.Substring(0, 20))..." -ForegroundColor Green
} catch {
    Write-Host "✗ Login failed: $_" -ForegroundColor Red
    exit 1
}

# Test analyze/prompt endpoint
Write-Host "`n=== Step 2: Test POST /api/v1/analyze/prompt ===" -ForegroundColor Cyan
$promptBody = @{
    text = "This is a test prompt for analysis"
    clientId = "acme-health"
    mspId = "msp-001"
} | ConvertTo-Json

try {
    $promptResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/analyze/prompt" `
        -Method POST `
        -Body $promptBody `
        -ContentType "application/json" `
        -Headers @{Authorization = "Bearer $token"}
    
    Write-Host "✓ Prompt analysis successful" -ForegroundColor Green
    Write-Host "Response: $($promptResponse | ConvertTo-Json -Depth 3)" -ForegroundColor Yellow
} catch {
    Write-Host "✗ Prompt analysis failed: $_" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
}

# Test scan/file endpoint
Write-Host "`n=== Step 3: Test POST /api/v1/scan/file ===" -ForegroundColor Cyan

# Create a test file
$testFile = "test_file.txt"
"Test file content for scanning" | Out-File -FilePath $testFile

try {
    $boundary = [System.Guid]::NewGuid().ToString()
    $fileBytes = [System.IO.File]::ReadAllBytes($testFile)
    $fileName = (Get-Item $testFile).Name
    
    # Create multipart form data
    $bodyParts = @()
    $bodyParts += "--$boundary"
    $bodyParts += 'Content-Disposition: form-data; name="file"; filename="' + $fileName + '"'
    $bodyParts += 'Content-Type: text/plain'
    $bodyParts += ''
    [System.Convert]::ToBase64String($fileBytes) | ForEach-Object { $bodyParts += $_ }
    $bodyParts += "--$boundary--"
    
    # Use a simpler approach with Invoke-WebRequest
    $fileStream = [System.IO.File]::OpenRead($testFile)
    $fileBinary = New-Object System.IO.BinaryReader($fileStream)
    $fileBytes = $fileBinary.ReadBytes([int]$fileStream.Length)
    $fileStream.Close()
    $fileBinary.Close()
    
    $fileScanResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/scan/file" `
        -Method POST `
        -ContentType "multipart/form-data" `
        -Headers @{Authorization = "Bearer $token"} `
        -Body @{
            file = Get-Item $testFile
            text = "Test text content"
        }
    
    Write-Host "✓ File scan successful" -ForegroundColor Green
    Write-Host "Response: $($fileScanResponse | ConvertTo-Json -Depth 3)" -ForegroundColor Yellow
} catch {
    Write-Host "✗ File scan failed: $_" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
} finally {
    Remove-Item $testFile -ErrorAction SilentlyContinue
}

Write-Host "`n=== Tests Complete ===" -SeptForegroundColor Cyan
