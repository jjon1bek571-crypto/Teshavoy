@echo off
echo MIYA.EXE Backend ishga tushirilmoqda...
pip install -r requirements.txt
echo.
echo Server manzili: http://localhost:8000
echo To'xtatish uchun: Ctrl+C
echo.
python -m uvicorn main:app --reload --port 8000
pause
