@echo off
title InputSleuth OS - System Tray Guard (.NET 8)
chcp 65001 > nul
cd /d "%~dp0"

echo ================================================================================
echo   InputSleuth OS - Inicializador do Daemon de Bandeja (System Tray)
echo ================================================================================
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
    if "%1"=="/no-elevation" goto skip_elevation
    echo [ELEVACAO UAC AUTOMATICA] Solicitando privilegios de Administrador...
    echo Para interceptar 100%% dos jogos em tela cheia e aplicativos do usuario ativo,
    echo este processo roda em Alta Integridade na sessao interativa de %USERNAME%.
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\" /no-elevation' -Verb RunAs"
    exit /b 0
)

:skip_elevation
echo [STATUS: ADMINISTRADOR ATIVO]
echo   - Sessao do Usuario: %USERNAME%
echo   - Integridade: Alta (UIPI Bypass: 100%% Cobertura)
echo   - Intercepta: Jogos Administrativos / Tela Cheia + Aplicativos de Usuario Comum
echo.
echo Iniciando daemon em segundo plano com icone dinamico no Tray (ao lado do relogio)...
echo Nota: O icone ficara VERDE durante a protecao e mudara para VERMELHO se detectar anomalia.
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
