# Start GraphHopper and test it
Write-Host "Starting GraphHopper routing service..." -ForegroundColor Green

# Check if Docker is running
$dockerCheck = docker ps 2>&1
if ($dockerCheck -like "*error*" -or $dockerCheck -like "*Cannot connect*") {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker is running" -ForegroundColor Green

# Start GraphHopper with docker-compose
Write-Host "Starting GraphHopper container..." -ForegroundColor Blue
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start GraphHopper" -ForegroundColor Red
    exit 1
}

Write-Host "✅ GraphHopper starting..." -ForegroundColor Green
Write-Host "⏳ Waiting for GraphHopper to be ready (first start takes ~60 seconds)..." -ForegroundColor Yellow

# Wait for GraphHopper to be ready
$maxAttempts = 120  # 2 minutes
$attempt = 0
while ($attempt -lt $maxAttempts) {
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8989/health" -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ GraphHopper is ready!" -ForegroundColor Green
            break
        }
    } catch {
        # GraphHopper not ready yet
    }
    
    if ($attempt % 10 -eq 0) {
        Write-Host "⏳ Still waiting... ($attempt seconds)" -ForegroundColor Yellow
    }
    Start-Sleep -Seconds 1
}

if ($attempt -ge $maxAttempts) {
    Write-Host "❌ GraphHopper did not start in time" -ForegroundColor Red
    Write-Host "Check logs with: docker-compose logs graphhopper" -ForegroundColor Yellow
    exit 1
}

# Test the route endpoint
Write-Host ""
Write-Host "Testing route endpoint..." -ForegroundColor Blue
cd backend
node test-graphhopper.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ SUCCESS! GraphHopper is running and ready to use." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Start backend: cd backend && node server.js" 
    Write-Host "2. Start frontend: cd frontend && npm start"
    Write-Host "3. Test by dispatching a team in the admin app"
    Write-Host ""
    Write-Host "Routes will now show optimized paths instead of straight lines!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️ Route test failed. Check GraphHopper logs:" -ForegroundColor Yellow
    Write-Host "docker compose logs graphhopper" -ForegroundColor Gray
}
