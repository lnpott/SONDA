@echo off
chcp 65001 > nul
title InputSleuth C# - Diagnosticador e Bloqueador
cd /d "%~dp0"

echo ================================================================================
echo   InputSleuth OS - Diagnosticador de Entrada e Desktops em C#
echo ================================================================================
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
    if "%1"=="/no-elevation" goto skip_elevation
    echo [ELEVACAO UAC AUTOMATICA] Solicitando privilegios de Administrador...
    echo Para cobrir 100%% dos jogos e aplicativos do usuario ativo, este processo roda em Alta Integridade.
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\" /no-elevation' -Verb RunAs"
    exit /b 0
)

:skip_elevation
echo [STATUS: ADMINISTRADOR ATIVO - INSTANCIA UNICA UNIFICADA]
echo   - Sessao do Usuario: %USERNAME%
echo   - Integridade: Alta (UIPI Bypass: 100%% Cobertura)
echo   - Tray Monitor: SEMPRE ATIVO em execucao continua ao lado do relogio.
echo   - Controle Total no Tray: Desligado, Apenas Monitor, Bloqueador Ativo e Relatorios.
echo.

where dotnet >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] .NET SDK detectado! Compilando e iniciando com dotnet run...
    echo O Tray Guard iniciara automaticamente ao lado do relogio do Windows.
    echo.
    dotnet run -c Release
    goto end
)

echo [AVISO] .NET SDK (dotnet) nao encontrado no PATH do Windows.
echo Tentando compilar usando o compilador C# nativo do Windows (csc.exe)...
echo.

set "CSC="
if exist "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" set "CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not defined CSC (
    if exist "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe" set "CSC=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)

if defined CSC (
    echo Compilando arquivos C#...
    "%CSC%" /nologo /out:InputSleuth.exe *.cs
    if exist InputSleuth.exe (
        echo [SUCESSO] Compilado com sucesso! Iniciando InputSleuth.exe...
        echo.
        InputSleuth.exe
        goto end
    ) else (
        echo [ERRO] Falha ao compilar com csc.exe.
    )
) else (
    echo [ERRO] Compilador C# nativo nao localizado.
)

echo.
echo Para executar com o .NET 8 moderno, instale o .NET SDK gratuito em:
echo https://dotnet.microsoft.com/download
echo.

:end
echo.
echo --------------------------------------------------------------------------------
echo Pressione qualquer tecla para fechar esta janela...
pause > nul
