@echo off
TITLE aTools Setup Builder
COLOR 0A

echo ==========================================
echo       aTools One-Click Installer Builder
echo ==========================================
echo.

WHERE node >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed.
    pause
    exit /b
)

WHERE cargo >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Rust/Cargo is not installed.
    pause
    exit /b
)

REM Check for pnpm
set PKG_CMD=npm
WHERE pnpm >nul 2>nul
IF %ERRORLEVEL% EQ 0 (
    set PKG_CMD=pnpm
    echo [INFO] Detected pnpm. Using pnpm.
)

REM Only install if node_modules is missing
IF NOT EXIST "node_modules" (
    echo [1/2] Installing Dependencies...
    if "%PKG_CMD%"=="pnpm" (
        call pnpm install
    ) else (
        call npm install
    )
    IF %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Dependency installation failed.
        pause
        exit /b
    )
) ELSE (
    echo [1/2] Dependencies found. Skipping install...
)

echo.
echo [2/2] Generating Installer Package...
echo.

if "%PKG_CMD%"=="pnpm" (
    call pnpm tauri build
) else (
    call npm run tauri build
)

IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed.
    pause
    exit /b
)

echo.
echo ==========================================
echo       Build Success!
echo ==========================================
echo Installer located in: src-tauri\target\release\bundle\
echo.
pause
