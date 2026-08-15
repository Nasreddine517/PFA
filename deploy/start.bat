@echo off
title NeuroScan
chcp 65001 >NUL

set "BASE_DIR=%~dp0"
set "BASE_DIR=%BASE_DIR:~0,-1%"

echo.
echo  ███╗   ██╗███████╗██╗   ██╗██████╗  ██████╗ ███████╗ ██████╗ █████╗ ███╗   ██╗
echo  ████╗  ██║██╔════╝██║   ██║██╔══██╗██╔═══██╗██╔════╝██╔════╝██╔══██╗████╗  ██║
echo  ██╔██╗ ██║█████╗  ██║   ██║██████╔╝██║   ██║███████╗██║     ███████║██╔██╗ ██║
echo  ██║╚██╗██║██╔══╝  ██║   ██║██╔══██╗██║   ██║╚════██║██║     ██╔══██║██║╚██╗██║
echo  ██║ ╚████║███████╗╚██████╔╝██║  ██║╚██████╔╝███████║╚██████╗██║  ██║██║ ╚████║
echo  ╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝
echo.
echo  Systeme d'aide au diagnostic par IRM cerebrale
echo  -----------------------------------------------

:: ── MongoDB ───────────────────────────────────────────────────────────────────
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /Q "mongod.exe"
if errorlevel 1 (
    echo  [1/3] Demarrage de la base de donnees...
    if not exist "%BASE_DIR%\mongodb\data\db" mkdir "%BASE_DIR%\mongodb\data\db"
    start /B "" "%BASE_DIR%\mongodb\mongod.exe" --config "%BASE_DIR%\mongodb\mongod.cfg" --logpath "%BASE_DIR%\logs\mongodb.log"
    timeout /t 4 /nobreak >NUL
) else (
    echo  [1/3] Base de donnees deja active.
)

:: ── Backend FastAPI ───────────────────────────────────────────────────────────
echo  [2/3] Demarrage du serveur NeuroScan...

set APP_BASE_DIR=%BASE_DIR%
set MONGO_URI=mongodb://127.0.0.1:27017/neuroscan
set SECRET_KEY=neuroscan-chu-secret-key-2026
set MODEL_WEIGHTS_PATH=model/best.pt
set EFFICIENTNET_WEIGHTS_PATH=model/best_model_final.keras
set MODEL_PROVIDER=yolo

cd /d "%BASE_DIR%\backend"
start /B "" "%BASE_DIR%\python\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level warning

:: ── Attente dynamique : poll /health jusqu'a pret (max 33 secondes) ─────────
echo  [3/3] Chargement en cours...
powershell -NoProfile -Command "$t=0; while($t -lt 33){try{$r=Invoke-WebRequest -Uri 'http://localhost:8000/health' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop;if($r.StatusCode -eq 200){Write-Host '  Pret !';break}}catch{};Start-Sleep 1;$t++}"

start "" "http://localhost:8000"
echo.
echo  NeuroScan est pret ! Fermez cette fenetre pour arreter l'application.
echo.
pause
call "%BASE_DIR%\stop.bat"
