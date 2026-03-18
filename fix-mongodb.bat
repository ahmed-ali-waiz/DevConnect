@echo off
:: Request admin elevation
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo Updating MongoDB config to limit RAM usage...

(
echo # mongod.conf
echo.
echo storage:
echo   dbPath: C:\Program Files\MongoDB\Server\8.2\data
echo   wiredTiger:
echo     engineConfig:
echo       cacheSizeGB: 0.5
echo.
echo systemLog:
echo   destination: file
echo   logAppend: true
echo   path: C:\Program Files\MongoDB\Server\8.2\log\mongod.log
echo.
echo net:
echo   port: 27017
echo   bindIp: 127.0.0.1
) > "C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg"

echo Starting MongoDB service...
net start MongoDB

if %errorlevel% equ 0 (
    echo.
    echo MongoDB started successfully!
) else (
    echo.
    echo MongoDB failed to start. Check the log at:
    echo C:\Program Files\MongoDB\Server\8.2\log\mongod.log
)

pause
