@echo off
REM ===========================================================================
REM  HeliLab launcher  -  double-click to open the app with full 3-D.
REM  Keep this file inside the BET_Tool folder (next to HeliLab.html).
REM  It starts a tiny local web server (needed for the 3-D engine) and opens
REM  HeliLab in your default browser. Close the small server window to quit.
REM ===========================================================================
title HeliLab
cd /d "%~dp0"
set "PORT=8723"
set "URL=http://localhost:%PORT%/HeliLab.html"

if not exist "HeliLab.html" (
  echo ERROR: HeliLab.html was not found next to this launcher.
  echo Keep HeliLab.bat inside the BET_Tool folder.
  echo.
  pause
  exit /b 1
)

REM --- find a static-file server: Python first, then Node ---
where py >nul 2>nul && ( set "SERVE=py -m http.server %PORT%" & goto run )
where python >nul 2>nul && ( set "SERVE=python -m http.server %PORT%" & goto run )
where npx >nul 2>nul && ( set "SERVE=npx --yes serve -l %PORT% ." & goto run )

echo Could not find Python or Node.js to start the local server.
echo.
echo Install Python from  https://www.python.org/downloads/
echo (on the first install screen, tick "Add python.exe to PATH"),
echo then double-click HeliLab.bat again.
echo.
pause
exit /b 1

:run
echo Starting HeliLab at %URL%
echo.
echo   * A minimized "HeliLab server" window will open.
echo   * Keep it open while you use the app  -  CLOSE it to quit.
echo.
start "HeliLab server (close to quit)" /min cmd /c "%SERVE%"
REM give the server a second to come up, then open the browser
timeout /t 2 /nobreak >nul
start "" "%URL%"
timeout /t 4 /nobreak >nul
exit /b 0
