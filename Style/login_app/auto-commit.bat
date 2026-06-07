@echo off
REM Script para guardar y subir automáticamente todos los cambios a GitHub

cd /d "C:\PROYECTO SENA"

git add .
git commit -m "auto: guardar cambios"
git push origin main

echo ==========================================
echo Cambios guardados y subidos a GitHub ✅
echo ==========================================
pause
