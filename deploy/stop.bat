@echo off
title Arret NeuroScan
echo  [NeuroScan] Arret en cours...
taskkill /F /IM mongod.exe >NUL 2>&1
taskkill /F /IM python.exe >NUL 2>&1
echo  [NeuroScan] Arrete.
timeout /t 2 /nobreak >NUL
