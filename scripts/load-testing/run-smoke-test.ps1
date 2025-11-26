# PowerShell script to run smoke test with environment variables
# Usage: ./run-smoke-test.ps1

param(
    [switch]$Help
)

if ($Help) {
    Write-Host "🔬 Smoke Test Runner" -ForegroundColor Green
    Write-Host ""
    Write-Host "This script runs the K6 smoke test with environment variables from .env file."
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  ./run-smoke-test.ps1              # Run smoke test"
    Write-Host "  ./run-smoke-test.ps1 -Help        # Show this help"
    Write-Host ""
    Write-Host "Environment variables will be loaded from .env file automatically."
    Write-Host "See .env.example for required variables."
    exit 0
}

# Check if .env file exists
if (!(Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found" -ForegroundColor Red
    Write-Host "💡 Please copy .env.example to .env and configure your credentials" -ForegroundColor Yellow
    Write-Host "📖 See SECURITY.md for detailed setup instructions" -ForegroundColor Yellow
    exit 1
}

# Load environment variables from .env file
Write-Host "🔧 Loading environment variables from .env..." -ForegroundColor Blue

try {
    $envContent = Get-Content ".env" | Where-Object { $_ -match "^[^#].*=" }
    
    foreach ($line in $envContent) {
        if ($line -match "^([^=]+)=(.*)$") {
            $name = $Matches[1].Trim()
            $value = $Matches[2].Trim()
            
            # Remove quotes if present
            $value = $value -replace '^"(.*)"$', '$1'
            $value = $value -replace "^'(.*)'$", '$1'
            
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
            Write-Host "  ✓ $name" -ForegroundColor DarkGreen
        }
    }
    
    Write-Host "🚀 Running smoke test..." -ForegroundColor Green
    Write-Host ""
    
    # Run K6 smoke test
    k6 run simple-smoke-test.js --config smoke-test.json
    
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "✅ Smoke test completed successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Smoke test failed with exit code: $exitCode" -ForegroundColor Red
    }
    
    exit $exitCode
    
} catch {
    Write-Host "❌ Error loading environment variables: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}