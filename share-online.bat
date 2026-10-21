@echo off
chcp 65001 >nul
title TieroSaver - Online Public Sharing (Cloudflare Tunnel)
color 0B

echo ================================================================
echo   🪙 TieroSaver - Menghubungkan ke Internet (Cloudflare Tunnel)
echo   100%% GRATIS • TANPA KARTU KREDIT • TANPA DAFTAR AKUN
echo ================================================================
echo.

echo [1/3] Memeriksa Backend Go...
netstat -ano | findstr :8081 >nul 2>&1
if %errorlevel% neq 0 (
    echo   - Menjalankan server Backend di port 8081...
    if not exist "%~dp0backend\server.exe" (
        cd /d "%~dp0backend" && go build -o server.exe ./cmd/server
    )
    start "TieroSaver Backend" /min cmd /c "cd /d %~dp0backend && server.exe"
    timeout /t 2 /nobreak >nul
) else (
    echo   - Backend Go sudah aktif di port 8081.
)

echo.
echo [2/3] Memeriksa Frontend React...
netstat -ano | findstr :5173 >nul 2>&1
if %errorlevel% neq 0 (
    echo   - Menjalankan server Frontend di port 5173...
    start "TieroSaver Frontend" /min cmd /c "cd /d %~dp0frontend && npm run dev"
    timeout /t 3 /nobreak >nul
) else (
    echo   - Frontend React sudah aktif di port 5173.
)

echo.
echo [3/3] Membuka Terowongan Cloudflare ke Internet...
echo.
echo ================================================================
echo   PETUNJUK PENTING:
echo   1. Perhatikan tulisan di bawah ini.
echo   2. Cari link yang berakhiran: .trycloudflare.com
echo      (Contoh: https://xxxx-xxxx.trycloudflare.com)
echo   3. Salin/Copy link tersebut dan kirim ke teman Anda di WhatsApp/browser!
echo   4. Jangan tutup jendela hitam ini selama Anda ingin website tetap aktif.
echo ================================================================
echo.

if exist "%~dp0cloudflared.exe" (
    "%~dp0cloudflared.exe" tunnel --url http://localhost:5173
) else (
    echo [ERROR] File cloudflared.exe tidak ditemukan di folder ini!
    pause
)
