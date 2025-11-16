# Run IaaS Tests - PowerShell Script
# Automated testing script for IaaS (NestJS) performance testing

param(
    [string]$TestType = "all",
    [string]$OutputDir = "results",
    [switch]$SkipAppCheck = $false,
    [switch]$Verbose = $false
)

# Configuration
$IaaSUrl = "http://localhost:3000"
$TestDir = "iaas"
$ComparisonDir = "comparison"

# Colors for output
function Write-ColorOutput([ConsoleColor]$ForegroundColor, [string]$Message) {
    $originalColor = $Host.UI.RawUI.ForegroundColor
    $Host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $Host.UI.RawUI.ForegroundColor = $originalColor
}

function Write-Success([string]$Message) { Write-ColorOutput Green "✅ $Message" }
function Write-Info([string]$Message) { Write-ColorOutput Cyan "ℹ️  $Message" }
function Write-Warning([string]$Message) { Write-ColorOutput Yellow "⚠️  $Message" }
function Write-Error([string]$Message) { Write-ColorOutput Red "❌ $Message" }

# Check if IaaS application is running
function Test-IaaSApp {
    if ($SkipAppCheck) {
        Write-Warning "Skipping application health check"
        return $true
    }
    
    try {
        Write-Info "Checking if NestJS application is running..."
        $response = Invoke-RestMethod -Uri "$IaaSUrl/api/v1/health" -Method Get -TimeoutSec 5
        Write-Success "NestJS application is running"
        return $true
    }
    catch {
        Write-Error "NestJS application is not responding at $IaaSUrl"
        Write-Info "Please start the application with: cd src/monolith-app; npm run start:dev"
        return $false
    }
}

# Create output directory
function New-OutputDirectory {
    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
        Write-Info "Created output directory: $OutputDir"
    }
}

# Run a specific test
function Invoke-K6Test {
    param(
        [string]$TestFile,
        [string]$TestName,
        [string]$Description
    )
    
    Write-Info "Running $TestName..."
    Write-Info "Description: $Description"
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $outputFile = "$OutputDir/$TestName-$timestamp.json"
    
    $k6Args = @(
        "run"
        $TestFile
        "--out"
        "json=$outputFile"
    )
    
    if ($Verbose) {
        $k6Args += @("--verbose")
    }
    
    try {
        Write-Info "Starting test execution..."
        & k6 $k6Args
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Test completed successfully"
            Write-Info "Results saved to: $outputFile"
        } else {
            Write-Error "Test failed with exit code: $LASTEXITCODE"
        }
    }
    catch {
        Write-Error "Failed to run test: $($_.Exception.Message)"
    }
    
    Write-Output ""
}

# Main execution
Write-Info "🚀 Starting IaaS Performance Testing"
Write-Info "Test Type: $TestType"

# Check prerequisites
if (-not (Test-IaaSApp)) {
    exit 1
}

# Create output directory
New-OutputDirectory

# Run tests based on type
switch ($TestType.ToLower()) {
    "auth" {
        Write-Info "🔐 Running Authentication Tests"
        Invoke-K6Test "$TestDir/iaas-auth-flow.js" "auth-flow" "Authentication flow verification"
    }
    
    "load" {
        Write-Info "📊 Running Load Tests"
        Invoke-K6Test "$TestDir/iaas-load-test.js" "load-test" "Performance test with token caching"
    }
    
    "suite" {
        Write-Info "🧪 Running Complete Test Suite"
        Invoke-K6Test "$TestDir/iaas-test-suite.js" "test-suite" "Comprehensive multi-scenario testing"
    }
    
    "comparison" {
        Write-Info "⚖️ Running FaaS vs IaaS Comparison"
        Write-Warning "This test requires both FaaS and IaaS environments to be running"
        Invoke-K6Test "$ComparisonDir/faas-vs-iaas.js" "comparison" "Direct performance comparison between FaaS and IaaS"
    }
    
    "all" {
        Write-Info "🎯 Running All IaaS Tests"
        
        Write-Info "🔐 Phase 1: Authentication Tests"
        Invoke-K6Test "$TestDir/iaas-auth-flow.js" "auth-flow" "Authentication flow verification"
        
        Write-Info "📊 Phase 2: Load Tests"
        Invoke-K6Test "$TestDir/iaas-load-test.js" "load-test" "Performance test with token caching"
        
        Write-Info "🧪 Phase 3: Complete Test Suite"
        Invoke-K6Test "$TestDir/iaas-test-suite.js" "test-suite" "Comprehensive multi-scenario testing"
        
        Write-Success "All IaaS tests completed"
    }
    
    default {
        Write-Error "Unknown test type: $TestType"
        Write-Info "Available test types: auth, load, suite, comparison, all"
        exit 1
    }
}

# Summary
Write-Info "📋 Test Execution Summary"
Write-Info "Test Type: $TestType"
Write-Info "Output Directory: $OutputDir"
Write-Info "Application URL: $IaaSUrl"

if (Test-Path $OutputDir) {
    $resultFiles = Get-ChildItem $OutputDir -Filter "*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 5
    if ($resultFiles.Count -gt 0) {
        Write-Info "Recent result files:"
        $resultFiles | ForEach-Object { Write-Info "  - $($_.Name)" }
    }
}

Write-Success "IaaS testing completed successfully! 🎉"