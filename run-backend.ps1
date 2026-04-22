$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $scriptDir "back-end"
$pythonExe = Join-Path (Split-Path $scriptDir -Parent) ".venv\Scripts\python.exe"

if (-not (Test-Path $backendDir)) {
    Write-Error "Le dossier back-end est introuvable: $backendDir"
    exit 1
}

Set-Location $backendDir

if (Test-Path $pythonExe) {
    & $pythonExe -m uvicorn app.main:app --reload
    exit $LASTEXITCODE
}

uvicorn app.main:app --reload