@echo off
chcp 65001 >nul
cd /d "D:\Desktop\Bureau\NCVRD Detect"

echo.
echo ============================================================
echo   NCVRD DETECT - PUBLICATION GITHUB
echo ============================================================
echo.

REM Nettoyage des verrous Git si presents
if exist ".git\HEAD.lock"  del /f /q ".git\HEAD.lock"
if exist ".git\index.lock" del /f /q ".git\index.lock"

REM Demande du message de commit (optionnel)
set "MSG="
set /p "MSG=Message de commit (ENTREE = 'Mise a jour NCVRD Detect') : "
if "%MSG%"=="" set "MSG=Mise a jour NCVRD Detect"

echo.
echo Ajout des fichiers...
git add -f index.html sw.js manifest.json LOGO.png "Bannière.png" assets/ PUBLIER.bat

git diff --cached --quiet
if %ERRORLEVEL% EQU 0 (
  echo.
  echo ============================================================
  echo   Aucun changement detecte - le site est deja a jour.
  echo ============================================================
) else (
  echo.
  echo Commit : %MSG%
  git commit -m "%MSG%"

  echo.
  echo Envoi vers GitHub...
  git push

  if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo   SITE MIS A JOUR !
    echo   https://neoconceptvrd.github.io/ncvrd-detect/
    echo.
    echo   Astuce : Ctrl+Shift+R sur l'appli pour forcer le reload.
    echo ============================================================
  ) else (
    echo.
    echo ============================================================
    echo   ECHEC DU PUSH - verifie ta connexion ou tes droits.
    echo ============================================================
  )
)

echo.
pause
