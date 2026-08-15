# Script de construction du dossier de déploiement NeuroScan
# À exécuter UNE SEULE FOIS sur la machine de dev (avec internet)
# Le dossier NeuroScan_Deploy/ produit est copié sur clé USB puis sur le PC CHU

$ROOT     = "c:\ESISA\Projet-PFA"
$PFA      = "$ROOT\PFA"
$DEST     = "$ROOT\NeuroScan_Deploy"
$VENV     = "$ROOT\.venv"

Write-Host "`n[NeuroScan] Construction du dossier de deploiement..." -ForegroundColor Cyan

# ── Nettoyage ─────────────────────────────────────────────────────────────────
if (Test-Path $DEST) {
    Write-Host "  Suppression ancienne version..."
    Remove-Item $DEST -Recurse -Force
}

# ── Structure ─────────────────────────────────────────────────────────────────
$dirs = @(
    "$DEST\backend",
    "$DEST\frontend\dist",
    "$DEST\mongodb\data\db",
    "$DEST\logs"
)
foreach ($d in $dirs) { New-Item -ItemType Directory -Path $d -Force | Out-Null }

# ── 1. Python portable (copie du venv) ────────────────────────────────────────
Write-Host "  [1/5] Copie du venv Python (peut prendre quelques minutes)..."
Copy-Item "$VENV" "$DEST\python" -Recurse

# ── 2. Code backend ───────────────────────────────────────────────────────────
Write-Host "  [2/5] Copie du code backend..."
Copy-Item "$PFA\back-end\app" "$DEST\backend\app" -Recurse
Copy-Item "$PFA\back-end\model" "$DEST\backend\model" -Recurse

# ── 3. Frontend buildé ────────────────────────────────────────────────────────
Write-Host "  [3/5] Copie du frontend React..."
Copy-Item "$PFA\front-end\dist\*" "$DEST\frontend\dist" -Recurse

# ── 4. Scripts de lancement ───────────────────────────────────────────────────
Write-Host "  [4/5] Copie des scripts..."
Copy-Item "$PFA\deploy\start.bat"   $DEST
Copy-Item "$PFA\deploy\stop.bat"    $DEST
Copy-Item "$PFA\deploy\mongod.cfg"  "$DEST\mongodb\mongod.cfg"

# ── 5. MongoDB portable (à copier manuellement) ───────────────────────────────
Write-Host "  [5/5] MongoDB portable : ETAPE MANUELLE REQUISE"
Write-Host "         Telechargez MongoDB Community ZIP (Windows x64) depuis :"
Write-Host "         https://www.mongodb.com/try/download/community"
Write-Host "         Extrayez et copiez mongod.exe dans : $DEST\mongodb\"

# ── Résumé ────────────────────────────────────────────────────────────────────
$size = (Get-ChildItem $DEST -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
Write-Host "`n[NeuroScan] Dossier cree : $DEST"
Write-Host "  Taille totale : $([math]::Round($size/1GB, 2)) GB"
Write-Host "`n  Prochaines etapes :"
Write-Host "  1. Copier mongod.exe dans $DEST\mongodb\"
Write-Host "  2. Tester start.bat sur cette machine"
Write-Host "  3. Copier tout le dossier sur le PC CHU"
Write-Host "  4. Creer un raccourci vers start.bat sur le bureau"
