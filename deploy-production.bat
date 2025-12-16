REM filepath: c:\laragon\www\siret\deploy-production.bat
@echo off
echo ========================================
echo SIRET - Deploy a Produccion
echo ========================================

echo.
echo [1/5] Compilando frontend React con Vite...
cd react
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Fallo la compilacion de React
    pause
    exit /b 1
)
cd ..

echo.
echo [2/5] Copiando build de React a public de Laravel...
xcopy /E /I /Y react\dist public\react-dist

echo.
echo [3/5] Optimizando Laravel para produccion...
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo.
echo [4/5] Creando paquete para deploy...
if exist deploy_temp rmdir /S /Q deploy_temp
mkdir deploy_temp
xcopy /E /I /Y app deploy_temp\app
xcopy /E /I /Y config deploy_temp\config
xcopy /E /I /Y database deploy_temp\database
xcopy /E /I /Y public deploy_temp\public
xcopy /E /I /Y resources deploy_temp\resources
xcopy /E /I /Y routes deploy_temp\routes
xcopy /E /I /Y storage deploy_temp\storage

REM Copiar .env como archivo individual (sin /I para evitar pregunta)
echo F | xcopy /Y .env.production deploy_temp\.env

REM Copiar archivos individuales
copy /Y artisan deploy_temp\artisan
copy /Y composer.json deploy_temp\composer.json
copy /Y composer.lock deploy_temp\composer.lock

echo.
echo [5/5] Comprimiendo...
tar -czf siret-production.tar.gz -C deploy_temp .

echo.
echo Limpiando archivos temporales...
rmdir /S /Q deploy_temp

echo.
echo ========================================
echo EXITO: siret-production.tar.gz creado
echo ========================================
echo.
echo Ahora copia este archivo a los servidores VM1, VM2, VM3
pause
