# Admin Endpoints Load Test Execution Script
# Tests only administrative operations using API Key authentication

param(
    [string]$Duration = "light",  # light, medium, stress
    [string]$OutputDir = "results",
    [switch]$Verbose,
    [switch]$SkipValidation
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Load environment variables from .env.local
if (Test-Path ".env.local") {
    Write-Host "🔧 Loading environment variables from .env.local..." -ForegroundColor Blue
    
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]*?)\s*=\s*(.*?)\s*$") {
            $name = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
            if ($Verbose) {
                Write-Host "  ✓ Set $name" -ForegroundColor Gray
            }
        }
    }
    
    $envCount = (Get-Content ".env.local" | Where-Object { $_ -match "^\s*[^#].*=" }).Count
    Write-Host "  ✅ Loaded $envCount environment variables" -ForegroundColor Green
} else {
    Write-Warning "⚠️ .env.local file not found. Using system environment variables."
}

# Validate required environment variables for admin testing
Write-Host "🔍 Validating admin environment configuration..." -ForegroundColor Yellow

$requiredVars = @(
    @{Name="FAAS_BASE_URL"; Alt="API_BASE_URL"; Description="Base API URL"},
    @{Name="FAAS_ADMIN_API_KEY"; Alt="ADMIN_API_KEY"; Description="Admin API Key"}
)

$missingVars = @()
foreach ($var in $requiredVars) {
    $value = [Environment]::GetEnvironmentVariable($var.Name) -or [Environment]::GetEnvironmentVariable($var.Alt)
    if (-not $value) {
        $missingVars += "$($var.Name) or $($var.Alt)"
        Write-Host "  ❌ Missing: $($var.Description) ($($var.Name)/$($var.Alt))" -ForegroundColor Red
    } else {
        Write-Host "  ✅ Found: $($var.Description)" -ForegroundColor Green
    }
}

if ($missingVars.Count -gt 0 -and -not $SkipValidation) {
    Write-Host ""
    Write-Host "❌ Missing required environment variables:" -ForegroundColor Red
    $missingVars | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "💡 Please configure your .env.local file with the required variables." -ForegroundColor Yellow
    Write-Host "   See .env.example for reference." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Or use -SkipValidation to proceed anyway (not recommended)." -ForegroundColor Gray
    exit 1
}

# Create output directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    Write-Host "📁 Created output directory: $OutputDir" -ForegroundColor Green
}

# Set test configuration based on duration
$testConfig = @{}
switch ($Duration.ToLower()) {
    "light" {
        $testConfig = @{
            Name = "Light Admin Load"
            ConfigFile = "admin-load-test.json"
            Description = "Light load test for admin endpoints (2-3 VUs, ~2 minutes)"
        }
    }
    "medium" {
        # Override for medium load
        $testConfig = @{
            Name = "Medium Admin Load"
            ConfigFile = $null
            Override = "--stage 1m:5 --stage 2m:8 --stage 1m:10 --stage 30s:0"
            Description = "Medium load test for admin endpoints (5-10 VUs, ~4.5 minutes)"
        }
    }
    "stress" {
        # Override for stress testing
        $testConfig = @{
            Name = "Stress Admin Load"
            ConfigFile = $null
            Override = "--stage 30s:5 --stage 1m:10 --stage 2m:15 --stage 30s:20 --stage 1m:0"
            Description = "Stress test for admin endpoints (up to 20 VUs, ~5 minutes)"
        }
    }
    default {
        Write-Error "❌ Invalid duration: $Duration. Use: light, medium, stress"
        exit 1
    }
}

# Generate timestamp and output filename
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$outputFile = Join-Path $OutputDir "admin-loadtest-$timestamp.md"

# Display test information
Write-Host ""
Write-Host "🔑 Starting Admin Endpoints Load Test" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Test Type: $($testConfig.Name)" -ForegroundColor White
Write-Host "Description: $($testConfig.Description)" -ForegroundColor Gray
Write-Host "Base URL: $([Environment]::GetEnvironmentVariable('FAAS_BASE_URL') -or [Environment]::GetEnvironmentVariable('API_BASE_URL'))" -ForegroundColor White
Write-Host "Authentication: Admin API Key (x-api-key)" -ForegroundColor White
Write-Host "Output File: $outputFile" -ForegroundColor White
Write-Host ""

# Create output file with header
@"
# Admin Endpoints Load Test Results - $timestamp

## Test Configuration
- **Test Type:** $($testConfig.Name)
- **Start Time:** $(Get-Date)
- **Description:** $($testConfig.Description)
- **Base URL:** $([Environment]::GetEnvironmentVariable('FAAS_BASE_URL') -or [Environment]::GetEnvironmentVariable('API_BASE_URL'))
- **Authentication:** Admin API Key (x-api-key header)
- **Environment:** $([Environment]::GetEnvironmentVariable('NODE_ENV') -or 'development')

## Test Output

``````
"@ | Out-File $outputFile -Encoding UTF8

# Build k6 command
$k6Command = @("k6", "run")

if ($testConfig.ConfigFile) {
    $k6Command += @("--config", $testConfig.ConfigFile)
} else {
    # Add stage overrides
    $stages = $testConfig.Override -split '\s+'
    $k6Command += $stages
}

# Add admin test script
$k6Command += "admin-load-test.js"

Write-Host "🚀 Executing: $($k6Command -join ' ')" -ForegroundColor Yellow
Write-Host ""

# Execute the test and capture output
try {
    $testStartTime = Get-Date
    
    # Run k6 test
    $testOutput = & $k6Command[0] $k6Command[1..($k6Command.Length-1)] 2>&1
    $exitCode = $LASTEXITCODE
    
    $testEndTime = Get-Date
    $testDuration = $testEndTime - $testStartTime
    
    # Append test output to file
    $testOutput | Out-File $outputFile -Append -Encoding UTF8
    "``````" | Out-File $outputFile -Append -Encoding UTF8
    "" | Out-File $outputFile -Append -Encoding UTF8
    
    # Add test summary to file
    @"
## Test Summary

- **Duration:** $($testDuration.ToString('mm\:ss'))
- **End Time:** $testEndTime
- **Exit Code:** $exitCode
- **Status:** $(if ($exitCode -eq 0) { "✅ SUCCESS" } else { "❌ FAILED" })

"@ | Out-File $outputFile -Append -Encoding UTF8
    
    # Display results
    Write-Host "📊 Test Results:" -ForegroundColor Cyan
    Write-Host "Duration: $($testDuration.ToString('mm\:ss'))" -ForegroundColor White
    Write-Host "Exit Code: $exitCode" -ForegroundColor $(if ($exitCode -eq 0) { "Green" } else { "Red" })
    Write-Host "Results saved to: $outputFile" -ForegroundColor Blue
    
    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "✅ Admin endpoints load test completed successfully!" -ForegroundColor Green
        
        # Check for specific admin issues in output
        $outputText = $testOutput -join "`n"
        
        if ($outputText -match "403|Forbidden|API key") {
            Write-Host ""
            Write-Host "⚠️ API Key Authentication Issues Detected:" -ForegroundColor Yellow
            Write-Host "   - Check ADMIN_API_KEY configuration" -ForegroundColor Yellow
            Write-Host "   - Verify API Gateway API key settings" -ForegroundColor Yellow
        }
        
        if ($outputText -match "429|Too Many Requests") {
            Write-Host ""
            Write-Host "ℹ️ Rate Limiting Information:" -ForegroundColor Blue
            Write-Host "   - AWS API Gateway throttling is active" -ForegroundColor Blue
            Write-Host "   - This is normal for admin endpoints" -ForegroundColor Blue
            Write-Host "   - Consider reducing test intensity if needed" -ForegroundColor Blue
        }
        
        # Extract success rate if available
        if ($outputText -match "http_req_failed.*?(\d+\.?\d*)%") {
            $failureRate = [double]$matches[1]
            $successRate = 100 - $failureRate
            
            Write-Host ""
            Write-Host "📈 Admin Success Rate: $($successRate.ToString('F1'))%" -ForegroundColor $(if ($successRate -ge 95) { "Green" } elseif ($successRate -ge 90) { "Yellow" } else { "Red" })
            
            if ($successRate -lt 95) {
                Write-Host "💡 Consider reviewing admin endpoint configuration" -ForegroundColor Yellow
            }
        }
        
    } else {
        Write-Host ""
        Write-Host "❌ Admin endpoints load test failed!" -ForegroundColor Red
        Write-Host "Check the output file for detailed error information." -ForegroundColor Yellow
    }
    
} catch {
    $errorMsg = $_.Exception.Message
    Write-Host "❌ Error executing admin load test: $errorMsg" -ForegroundColor Red
    
    # Log error to output file
    @"

## Test Execution Error

**Error:** $errorMsg
**Time:** $(Get-Date)

"@ | Out-File $outputFile -Append -Encoding UTF8
    
    exit 1
}

Write-Host ""
Write-Host "📝 Detailed results available in: $outputFile" -ForegroundColor Cyan
Write-Host ""

# Suggest next steps
Write-Host "🔄 Next Steps:" -ForegroundColor Magenta
Write-Host "   1. Review admin test results in $outputFile" -ForegroundColor White
Write-Host "   2. If successful, consider testing with 'medium' or 'stress' intensity" -ForegroundColor White
Write-Host "   3. Adjust API Gateway throttling if rate limiting is excessive" -ForegroundColor White
Write-Host "   4. Proceed to full test suite if admin endpoints are stable" -ForegroundColor White