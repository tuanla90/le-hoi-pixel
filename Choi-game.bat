@echo off
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  start "" cmd /c "timeout /t 2 >nul & start http://localhost:8020/"
  node server.js
) else (
  echo Khong tim thay Node.js - chi choi duoc bang ban phim, khong ket noi dien thoai.
  echo Cai Node.js tai https://nodejs.org de choi bang dien thoai.
  start "" http://localhost:8020/
  python -m http.server 8020
)
