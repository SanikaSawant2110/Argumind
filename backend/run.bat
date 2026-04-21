@echo off
title Argumind Backend
.\venv\Scripts\activate
echo.
echo ========================================
echo    🚀 Argumind Backend Starting...
echo ========================================
echo.
uvicorn main:app --reload --host 0.0.0.0 --port 8000
pausee