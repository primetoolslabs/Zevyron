@echo off
setlocal
cd /d "%~dp0"
echo =============================================
echo       ZEVYRON - CONFIGURAR GITHUB
echo =============================================
echo.
set /p GHOWNER=Digite seu usuario ou organizacao do GitHub: 
if "%GHOWNER%"=="" (
  echo Usuario nao informado.
  pause
  exit /b 1
)
set /p GHREPO=Nome do repositorio [Zevyron]: 
if "%GHREPO%"=="" set GHREPO=Zevyron
call pnpm github:configure "%GHOWNER%" "%GHREPO%"
echo.
pause
