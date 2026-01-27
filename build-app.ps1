Write-Host "Starting aTools Setup Builder..." -ForegroundColor Cyan

# 1. Check for Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not installed."
    exit 1
}

# 2. Check for package manager (pnpm preferred, fallback to npm)
$pkgManager = "npm"
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    $pkgManager = "pnpm"
    Write-Host "Using pnpm package manager." -ForegroundColor Gray
}

# 3. Check for Rust
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Error "Rust (cargo) is not installed."
    exit 1
}

# 4. Install dependencies ONLY if missing (Avoids "Local Installation" feeling)
if (-not (Test-Path "node_modules")) {
    Write-Host "Dependencies missing. Installing..." -ForegroundColor Yellow
    if ($pkgManager -eq "pnpm") {
        pnpm install
    } else {
        npm install
    }
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
    Write-Host "Dependencies found. Skipping install." -ForegroundColor Green
}

# 5. Build the Installer Package
Write-Host "Building Installer Package (exe/msi)..." -ForegroundColor Cyan
if ($pkgManager -eq "pnpm") {
    pnpm tauri build
} else {
    npm run tauri build
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed."
    exit $LASTEXITCODE
}

Write-Host "Build Success!" -ForegroundColor Green
Write-Host "Installer is located in: src-tauri/target/release/bundle/" -ForegroundColor Green
Read-Host "Press Enter to finish..."
