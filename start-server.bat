@echo off
chcp 65001 >nul
title הא-ב הקסום - שרת
echo.
echo   מפעיל את הא-ב הקסום...
echo.
start "" http://localhost:8080
node "%~dp0server.js"
pause
