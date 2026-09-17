# test-auth.ps1
# Run this after starting the backend with: npm run dev
# It tests registration and login against http://localhost:5000

$baseUrl = 'http://localhost:5000/api/auth'

Write-Host "Registering a test user..." -ForegroundColor Cyan
$registerBody = @{
    email = 'afriyie2@gmail.com'
    password = 'Testss123'
    name = 'Test User'
    phone = '555-1234567'
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Method Post -Uri "$baseUrl/register" -ContentType 'application/json' -Body $registerBody
    $registerResponse | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Register request failed:" -ForegroundColor Red
    $responseContent = $_.Exception.Response.Content
    if ($null -ne $responseContent -and $responseContent -ne '') {
        $responseContent | ConvertFrom-Json | Format-List *
    } else {
        Write-Host "No response body returned. Check the backend server output for the actual error." -ForegroundColor Yellow
    }
}

Write-Host "`nLogging in with the same user..." -ForegroundColor Cyan
$loginBody = @{
    email = 'afriyie2@gmail.com'
    password = 'TestPass123'
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Method Post -Uri "$baseUrl/login" -ContentType 'application/json' -Body $loginBody
    $loginResponse | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Login request failed:" -ForegroundColor Red
    $responseContent = $_.Exception.Response.Content
    if ($null -ne $responseContent -and $responseContent -ne '') {
        $responseContent | ConvertFrom-Json | Format-List *
    } else {
        Write-Host "No response body returned. Check the backend server output for the actual error." -ForegroundColor Yellow
    }
}

Write-Host "`nDone. If you want to test again, change the email or rerun the script." -ForegroundColor Yellow
