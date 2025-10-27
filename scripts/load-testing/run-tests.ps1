# Script PowerShell para ejecutar tests K6
# Configuración inicial

# Configurar alias para K6
Set-Alias -Name k6 -Value "C:\Program Files\k6\k6.exe"

Write-Host "🚀 K6 Load Testing Script para PetStore FaaS" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Verificar instalación de K6
Write-Host "`n📋 Verificando instalación de K6..." -ForegroundColor Yellow
k6 version

# Función para ejecutar tests
function Run-K6Test {
    param(
        [string]$TestName,
        [string]$Command,
        [string]$Description
    )
    
    Write-Host "`n🧪 Ejecutando: $TestName" -ForegroundColor Cyan
    Write-Host "Descripción: $Description" -ForegroundColor Gray
    Write-Host "Comando: $Command" -ForegroundColor Gray
    
    $confirm = Read-Host "¿Ejecutar este test? (y/N)"
    if ($confirm -eq 'y' -or $confirm -eq 'Y') {
        Invoke-Expression $Command
        Write-Host "✅ Test $TestName completado" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Test $TestName omitido" -ForegroundColor Yellow
    }
}

# Menu de tests disponibles
Write-Host "`n📊 Tests Disponibles:" -ForegroundColor Magenta

# 1. Validation Test
Run-K6Test -TestName "Validation Test" `
           -Command "k6 run -u 1 -d 30s test-suite.js" `
           -Description "Test básico de validación (1 usuario, 30 segundos)"

# 2. Store Endpoints Test
Run-K6Test -TestName "Store Endpoints" `
           -Command "k6 run -u 2 -d 1m store-endpoints.js" `
           -Description "Test de endpoints de tienda (2 usuarios, 1 minuto)"

# 3. Admin Endpoints Test
Run-K6Test -TestName "Admin Endpoints" `
           -Command "k6 run -u 1 -d 1m admin-endpoints.js" `
           -Description "Test de endpoints administrativos (requiere API key)"

# 4. Authentication Flow Test
Run-K6Test -TestName "Authentication Flow" `
           -Command "k6 run auth-flow.js" `
           -Description "Test de flujos de autenticación"

# 5. Smoke Test
Run-K6Test -TestName "Smoke Test" `
           -Command "k6 run --config smoke-test.json test-suite.js" `
           -Description "Test de humo con configuración predefinida"

# 6. Load Test
Run-K6Test -TestName "Load Test" `
           -Command "k6 run --config load-test.json test-suite.js" `
           -Description "Test de carga normal (5-10 usuarios, 5 minutos)"

# 7. Stress Test
Run-K6Test -TestName "Stress Test" `
           -Command "k6 run --config stress-test.json test-suite.js" `
           -Description "Test de estrés (hasta 50 usuarios, 10 minutos)"

# 8. Mixed Workload
Run-K6Test -TestName "Mixed Workload" `
           -Command "k6 run mixed-workload.js" `
           -Description "Carga de trabajo mixta realista"

Write-Host "`n🎯 Tests Completados!" -ForegroundColor Green
Write-Host "Para ejecutar tests individuales, usa los comandos mostrados arriba." -ForegroundColor Gray

# Comandos de ejemplo para copiar
Write-Host "`n📋 Comandos Útiles:" -ForegroundColor Magenta
Write-Host "Set-Alias -Name k6 -Value 'C:\Program Files\k6\k6.exe'" -ForegroundColor Gray
Write-Host "k6 run -u 1 -d 30s test-suite.js" -ForegroundColor Gray
Write-Host "k6 run store-endpoints.js" -ForegroundColor Gray
Write-Host "k6 run --config load-test.json test-suite.js" -ForegroundColor Gray