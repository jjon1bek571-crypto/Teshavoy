@echo off
title Railway Deploy - MIYA.EXE Bot
echo ============================================
echo   MIYA.EXE Bot - Railway ga yuklash
echo ============================================
echo.
echo 1-qadam: Railway ga login qilinmoqda...
echo (Brauzer ochiladi - GitHub yoki Google bilan kiring)
echo.
railway login
echo.
echo 2-qadam: Loyiha yaratilmoqda...
railway init
echo.
echo 3-qadam: Bot yuklanmoqda...
railway up
echo.
echo ============================================
echo   TAYYOR! Bot 24/7 ishlaydi!
echo ============================================
pause
