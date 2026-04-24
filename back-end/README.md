# NeuroScan Back-end

Base FastAPI pour le projet NeuroScan.

## Module 1

- Structure `app/api`, `app/core`, `app/database`, `app/models`, `app/schemas`, `app/services`
- Configuration via `.env`
- Connexion MongoDB Atlas avec Motor
- CORS autorise le front local `http://localhost:5173`

## Module 2 en cours

- `POST /api/auth/register` cree un compte medecin, hash le mot de passe avec bcrypt et retourne un JWT
- `POST /api/scans/upload` accepte une image IRM `multipart/form-data` protegee par bearer token
- `POST /api/analyses` lance l'analyse IA sur un scan deja uploadé
- `GET /api/analyses/{id}` retourne le resultat d'une analyse

## Email reset password

- Configurer `FRONTEND_URL` pour l'URL du front.
- Configurer `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`.
- Avec Gmail, utiliser un mot de passe d'application et `smtp.gmail.com:587`.

## Démarrage

1. Créer un environnement virtuel Python.
2. Installer les dépendances avec `pip install -r requirements.txt`.
3. Copier `.env.example` vers `.env` et renseigner les secrets.
4. Lancer `uvicorn app.main:app --reload` depuis le dossier `back-end`.

Depuis la racine `PFA`, vous pouvez aussi lancer simplement `./run-backend.ps1`.

## Endpoint de vérification

- `GET /api/health`

## Variables utiles pour l'analyse IRM

- `SCAN_UPLOAD_DIR` chemin local de stockage des scans, par defaut `uploads/scans`
- `MAX_UPLOAD_SIZE_MB` taille maximale d'upload, par defaut `15`
- `MODEL_PROVIDER` fournisseur du modele, par defaut `yolo`
- `MODEL_WEIGHTS_PATH` chemin du poids YOLO, par defaut `model/best.pt`
- `MODEL_CONFIDENCE_THRESHOLD` seuil de confiance YOLO, par defaut `0.25`

## Poids du modele

- Placer le poids YOLO dans `back-end/model/best.pt`
- Le pipeline YOLO branche actuellement les fichiers PNG et JPEG
- Les fichiers DICOM demandent une etape de conversion/pretraitement avant inference
