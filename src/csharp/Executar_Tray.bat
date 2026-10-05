@echo off
title InputSleuth OS - System Tray Guard (.NET 8)
chcp 65001 > nul
cd /d "%~dp0"

echo ================================================================================
echo   InputSleuth OS - Inicializador do Daemon de Bandeja (System Tray)
echo ================================================================================
echo.
echo Iniciando aplicativo em segundo plano com icone no Tray (ao lado do relogio)...
echo.

dotnet --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Iniciando via .NET SDK (dotnet run -- --tray)...
    start "" dotnet run -c Release -- --tray
    echo.
    echo [SUCESSO] InputSleuth Guard iniciado no System Tray!
    echo Procure pelo icone de Escudo Verde ao lado do relogio do Windows.
    timeout /t 3 > nul
    exit /b 0
)

echo [AVISO] 'dotnet' nao encontrado no PATH. Compilando nativamente com csc.exe...
set CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe
if not exist "%CSC%" set CSC=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe

if exist "%CSC%" (
    "%CSC%" /nologo /target:winexe /out:"InputSleuth.exe" *.cs
    if exist "InputSleuth.exe" (
        start "" "InputSleuth.exe" --tray
        echo [SUCESSO] Compilado e iniciado no System Tray com sucesso!
        timeout /t 3 > nul
        exit /b 0
    )
)

echo [ERRO] Nao foi possivel compilar. Instale o .NET SDK em: https://dotnet.microsoft.com/download
pause
