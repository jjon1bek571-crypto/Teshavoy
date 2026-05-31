@echo off
title MIYA.EXE Bot
cd /d "c:\Users\user\Desktop\Новая папка (2)\Новая папка\miya-exe\bot"
echo MIYA.EXE Bot ishlamoqda...
echo Yopish uchun: bu oynani yoping

:restart
python main.py
echo Bot to'xtadi. 5 soniyada qayta ishga tushadi...
timeout /t 5 /nobreak >nul
goto restart
