@echo off
REM start-phone.bat - one double-click to use ActionItemTranslator from your phone.
REM Starts the dev server (port 3002) if it isn't running, then opens an
REM ngrok tunnel. Copy the https://...ngrok-free.app URL it shows into your
REM phone's browser. Keep this window open while using the app.

cd /d "%~dp0"

set NGROK=%LOCALAPPDATA%\ngrok\ngrok.exe
if not exist "%NGROK%" (
    echo [!] ngrok not found at %NGROK%
    pause
    exit /b 1
)

REM start the dev server in its own window if nothing is on port 3002 yet
netstat -ano | findstr /r ":3002 .*LISTENING" >nul
if errorlevel 1 (
    echo Starting the app server...
    start "ActionItemTranslator dev server" cmd /k "npm run dev"
    echo Waiting for it to come up...
    timeout /t 10 /nobreak >nul
)

echo.
echo ============================================================
echo  Look for the line starting with "Forwarding" below.
echo  Open that https://....ngrok-free.app address on your phone.
echo  Keep BOTH windows open while using the app.
echo ============================================================
echo.
"%NGROK%" http 3002
