@echo off
REM Start GraphHopper routing service on Windows using Java
REM This is the easiest way to run GraphHopper without Docker

echo.
echo ===============================================
echo      STARTING GRAPHHOPPER ROUTING SERVICE
echo ===============================================
echo.

REM Check if Java is installed
java -version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Java is not installed or not in PATH
    echo.
    echo Please install Java from:
    echo https://www.oracle.com/java/technologies/downloads/
    echo.
    pause
    exit /b 1
)

echo Java found: 
java -version 2>&1 | findstr /v "^$"

REM Create directories if they don't exist
if not exist "graphhopper" mkdir graphhopper
cd graphhopper

echo.
echo Starting GraphHopper on http://localhost:8989
echo (First startup may take 1-2 minutes)
echo.
echo Press Ctrl+C to stop
echo.

REM Use a pre-configured minimal setup
REM Download config file if it doesn't exist
if not exist "config.yml" (
    echo Creating config file...
    (
        echo server:
        echo   type: simple
        echo   connector:
        echo     type: http
        echo     port: 8989
        echo     bind_host: 0.0.0.0
        echo graphhopper:
        echo   datareader:
        echo     file: []
        echo   graph:
        echo     location: graph-cache
    ) > config.yml
)

REM Download GraphHopper JAR if not present
if not exist "graphhopper.jar" (
    echo.
    echo Downloading GraphHopper (this will take about 1 minute)...
    echo Please wait...
    echo.
    
    powershell -NoProfile -Command ^
        "$ProgressPreference = 'SilentlyContinue'; " ^
        "try { " ^
        "  Invoke-WebRequest -Uri 'https://repo1.maven.org/maven2/com/graphhopper/graphhopper-web/7.0/graphhopper-web-7.0.jar' -OutFile 'graphhopper.jar'; " ^
        "  Write-Host 'Download complete!' -ForegroundColor Green " ^
        "} catch { " ^
        "  Write-Host 'Download failed. Try manual download:' -ForegroundColor Red; " ^
        "  Write-Host 'https://repo1.maven.org/maven2/com/graphhopper/graphhopper-web/7.0/graphhopper-web-7.0.jar' " ^
        "}"
    
    if not exist "graphhopper.jar" (
        echo.
        echo ERROR: Could not download GraphHopper
        echo.
        echo Please download manually:
        echo https://repo1.maven.org/maven2/com/graphhopper/graphhopper-web/7.0/graphhopper-web-7.0.jar
        echo.
        echo And place it in: %cd%\graphhopper.jar
        echo.
        pause
        exit /b 1
    )
)

REM Run GraphHopper
java -Xmx1024m -jar graphhopper.jar server config.yml

if errorlevel 1 (
    echo.
    echo ERROR: GraphHopper failed to start
    pause
    exit /b 1
)

pause
