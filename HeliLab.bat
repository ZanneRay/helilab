@echo off
title HeliLab
cd /d "%~dp0"
where py >nul 2>nul && ( py -3 start.py & goto end )
where python >nul 2>nul && ( python start.py & goto end )
echo Python 3 is needed for the local launcher. Install it from python.org.
echo You can also open HeliLab.html directly to use the 2D training activities.
:end
pause
