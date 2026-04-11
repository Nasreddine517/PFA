# 🧠 Description : Brain Tumor Detection App
Une application de détection de cancer du cerveau par IA. Le médecin importe une IRM, le système détecte la présence d'une tumeur, localise sa position sur l'image et envoie automatiquement le rapport médical via API.
Application web de détection de cancer du cerveau assistée par intelligence artificielle.


## ✨ Fonctionnalités

- Authentification sécurisée pour les médecins
- Import d'images IRM (DICOM, JPG, PNG)
- Détection automatique de tumeur par modèle IA
- Localisation et segmentation de la tumeur sur l'IRM
- Génération de rapport médical en PDF
- Envoi automatique du rapport via API
- Historique des analyses par patient

## 🛠️ Stack technique

- **Frontend** : ( React / Vue)
- **Backend** : ( Django / FastAPI)
- **Modèle IA** : (Yolo v11)
- **Base de données** : (MongoDb)
- **API rapport** : API externe (déjà intégrée)

## 📌 User Stories

**US-01** En tant que médecin, je veux me connecter avec mes identifiants professionnels afin de sécuriser l'accès aux données des patients.

**US-02** En tant que médecin, je veux importer une image IRM d'un patient afin de lancer l'analyse par l'IA.

**US-03** En tant que médecin, je veux associer l'IRM à un dossier patient (nom, âge, ID) afin d'assurer la traçabilité de chaque analyse.

**US-04** En tant que médecin, je veux recevoir un diagnostic automatique (cancer / pas de cancer) afin d'avoir une aide à la décision rapide.

**US-05** En tant que médecin, je veux visualiser la localisation de la tumeur sur l'IRM afin de comprendre sa position et son étendue dans le cerveau.

**US-06** En tant que médecin, je veux voir un indicateur de progression afin de savoir que l'analyse IA est en cours de traitement.

**US-07** En tant que médecin, je veux consulter un rapport médical structuré après l'analyse afin d'avoir un compte-rendu complet téléchargeable en PDF.

**US-08** En tant que médecin, je veux envoyer le rapport via l'API afin de transmettre le diagnostic au patient sans ressaisie manuelle.

**US-09** En tant que médecin, je veux ajouter un commentaire clinique avant l'envoi du rapport afin de compléter le diagnostic IA avec mon avis.

**US-10** En tant que médecin, je veux accéder à l'historique des analyses afin de retrouver facilement un dossier patient antérieur.

**US-11** En tant qu'administrateur, je veux gérer les comptes médecins afin de contrôler les accès à la plateforme.

**US-12** En tant que médecin, je veux réinitialiser mon mot de passe afin de récupérer l'accès à mon compte en cas d'oubli.

**US-13** En tant que médecin, je veux zoomer sur l'image IRM afin d'examiner les détails de la zone détectée plus précisément.

**US-14** En tant que médecin, je veux comparer deux IRM d'un même patient afin de suivre l'évolution de la tumeur dans le temps.

**US-15** En tant que médecin, je veux filtrer l'historique par statut (positif / négatif) afin de retrouver rapidement les cas détectés.

**US-16** En tant que médecin, je veux recevoir une notification si l'envoi du rapport via API échoue afin de pouvoir le renvoyer manuellement.

**US-17** En tant que médecin, je veux voir le score de confiance du modèle IA afin d'évaluer la fiabilité du diagnostic rendu.

**US-18** En tant que médecin, je veux télécharger le rapport en PDF depuis l'historique afin d'accéder aux anciens comptes-rendus à tout moment.

**US-19** En tant que médecin, je veux que l'application soit accessible sur mobile afin de consulter les résultats depuis n'importe quel appareil.

**US-20** En tant qu'administrateur, je veux consulter les logs d'activité afin de surveiller les actions effectuées sur la plateforme.

**US-21** En tant qu'administrateur, je veux voir les statistiques d'utilisation (nombre d'analyses, taux de détection) afin de suivre les performances de l'application.

**US-22** En tant que médecin, je veux que mes données et celles des patients soient chiffrées afin de garantir la confidentialité médicale.

**US-23** En tant que médecin, je veux pouvoir supprimer un dossier patient afin de respecter le droit à l'effacement des données.

**US-24** En tant que médecin, je veux recevoir un message d'erreur clair si l'image IRM importée est de mauvaise qualité afin de soumettre une image valide.

**US-25** En tant qu'administrateur, je veux pouvoir configurer l'URL et la clé de l'API d'envoi afin de mettre à jour les paramètres sans modifier le code.

**US-26** En tant que médecin, je veux que le rapport inclut la date et l'heure de l'analyse afin d'avoir un horodatage précis pour le dossier médical.

**US-27** En tant que médecin, je veux rechercher un patient par nom ou ID afin de retrouver son dossier rapidement sans parcourir tout l'historique.

**US-28** En tant que médecin, je veux me déconnecter de l'application afin de sécuriser mon compte après utilisation.

**US-29** En tant qu'administrateur, je veux désactiver temporairement un compte médecin afin de suspendre l'accès sans supprimer le dossier.

**US-30** En tant que médecin, je veux que l'interface soit en français afin de l'utiliser confortablement dans mon environnement de travail.

## 👥 Équipe:
- EL MEKKAOUI NASREDDINE
- OUACHCHANE YAZID
- HJIRA MOHAMED REDA
