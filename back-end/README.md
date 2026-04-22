# NeuroScan Back-end

Base FastAPI pour le projet NeuroScan.

## Module 1

- Structure `app/api`, `app/core`, `app/database`, `app/models`, `app/schemas`, `app/services`
- Configuration via `.env`
- Connexion MongoDB Atlas avec Motor
- CORS autorise le front local `http://localhost:5173`

## Module 2 en cours

- `POST /api/auth/register` cree un compte medecin, hash le mot de passe avec bcrypt et retourne un JWT

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
