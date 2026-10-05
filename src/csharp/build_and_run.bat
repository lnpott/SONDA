@echo off
chcp 65001 > nul
echo ========================================================
echo   InputSleuth OS - Compilador e Executor C# (.NET 8)
echo ========================================================
echo Verificando instalacao do .NET SDK...
dotnet --version > nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] .NET SDK nao encontrado diretamente no PATH.
    echo Tentando compilar via csc.exe do .NET Framework se disponivel...
    C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /out:InputSleuth.exe Program.cs GlobalInputHook.cs VirtualDesktopGuard.cs ProcessForensics.cs > nul 2>&1
    if exist InputSleuth.exe (
        echo [SUCESSO] Compilado com csc.exe! Iniciando...
        InputSleuth.exe
        exit /b 0
    ) else (
        echo [ERRO] Instale o .NET SDK gratuito em https://dotnet.microsoft.com/download
        echo Ou abra a pasta no Visual Studio / VS Code.
        pause
        exit /b 1
    )
)

echo Compilando e iniciando InputSleuth nativo em C#...
dotnet run -c Release
pause
