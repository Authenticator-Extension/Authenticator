# Authenticator Chrome Extension Build Script
# Save as UTF-8 without BOM

# Set error handling
$ErrorActionPreference = "Stop"

Write-Host "===== Authenticator Chrome Extension Build Script =====" -ForegroundColor Cyan

# Check if dependencies are installed
Write-Host ">> Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path -Path "node_modules")) {
    Write-Host "Node modules not found. Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies. Please run 'npm install' manually and try again." -ForegroundColor Red
        exit
    }
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
}

# Check if webpack-cli is installed
if (-not (Get-Command "npx webpack" -ErrorAction SilentlyContinue)) {
    Write-Host "webpack-cli not found. Installing webpack-cli..." -ForegroundColor Yellow
    npm install -D webpack-cli
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install webpack-cli. Please run 'npm install -D webpack-cli' manually and try again." -ForegroundColor Red
        exit
    }
    Write-Host "✓ webpack-cli installed successfully" -ForegroundColor Green
}

# Check if sass is installed
$sassPkgPath = "node_modules\sass"
if (-not (Test-Path -Path $sassPkgPath)) {
    Write-Host "sass not found. Installing sass..." -ForegroundColor Yellow
    npm install -D sass
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install sass. Please run 'npm install -D sass' manually and try again." -ForegroundColor Red
        exit
    }
    Write-Host "✓ sass installed successfully" -ForegroundColor Green
}

# Check chrome directory
Write-Host ">> Checking chrome directory status..." -ForegroundColor Yellow
if (Test-Path -Path "chrome") {
    $chromeFiles = Get-ChildItem -Path "chrome" -Force
    
    if ($chromeFiles.Count -gt 0) {
        Write-Host "Chrome directory is not empty, contains $($chromeFiles.Count) files/folders" -ForegroundColor Yellow
        $confirmClear = Read-Host "Clear chrome directory and continue? (Y/N)"
        
        if ($confirmClear -eq "Y" -or $confirmClear -eq "y") {
            Write-Host ">> Clearing chrome directory..." -ForegroundColor Yellow
            Remove-Item -Path "chrome\*" -Recurse -Force
            Write-Host "✓ Chrome directory cleared" -ForegroundColor Green
        }
        else {
            Write-Host "❌ Build canceled" -ForegroundColor Red
            exit
        }
    }
    else {
        Write-Host "✓ Chrome directory exists and is empty" -ForegroundColor Green
    }
}
else {
    Write-Host ">> Creating chrome directory..." -ForegroundColor Yellow
    New-Item -Path "chrome" -ItemType Directory | Out-Null
    Write-Host "✓ Chrome directory created" -ForegroundColor Green
}

# Create necessary subdirectories
Write-Host ">> Creating necessary subdirectories..." -ForegroundColor Yellow
$subDirs = @("dist", "css", "images", "view", "_locales")
foreach ($dir in $subDirs) {
    if (-not (Test-Path -Path "chrome\$dir")) {
        New-Item -Path "chrome\$dir" -ItemType Directory | Out-Null
    }
}
Write-Host "✓ Subdirectory structure created" -ForegroundColor Green

# Compile JavaScript files
Write-Host ">> Compiling JavaScript files..." -ForegroundColor Yellow
npx webpack
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ JavaScript compilation failed" -ForegroundColor Red
    Write-Host "If this is your first time running the script, try running 'npm install' and then 'npm install -D webpack-cli' manually." -ForegroundColor Yellow
    exit
}
Write-Host "✓ JavaScript files compiled successfully" -ForegroundColor Green

# Check if dist directory was created
if (-not (Test-Path -Path "dist")) {
    Write-Host ">> dist directory not found, creating it..." -ForegroundColor Yellow
    New-Item -Path "dist" -ItemType Directory | Out-Null
    Write-Host "✓ dist directory created" -ForegroundColor Green
}

# Compile SCSS files
Write-Host ">> Compiling SCSS files..." -ForegroundColor Yellow
npx sass sass:css
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ SCSS compilation failed" -ForegroundColor Red
    Write-Host "If this is your first time running the script, try running 'npm install -D sass' manually." -ForegroundColor Yellow
    exit
}
Write-Host "✓ SCSS files compiled successfully" -ForegroundColor Green

# Check if css directory was created
if (-not (Test-Path -Path "css")) {
    Write-Host ">> css directory not found, creating it..." -ForegroundColor Yellow
    New-Item -Path "css" -ItemType Directory | Out-Null
    Write-Host "✓ css directory created" -ForegroundColor Green
}

# Copy files to chrome directory
Write-Host ">> Copying files to Chrome extension directory..." -ForegroundColor Yellow

# Copy files
try {
    if (Test-Path -Path "dist\*") {
        Copy-Item -Path "dist\*" -Destination "chrome\dist" -Recurse -Force
        Write-Host "✓ JavaScript files copied" -ForegroundColor Green
    } else {
        Write-Host "⚠️ No JavaScript files found to copy" -ForegroundColor Yellow
    }
    
    if (Test-Path -Path "css\*") {
        Copy-Item -Path "css\*" -Destination "chrome\css" -Recurse -Force
        Write-Host "✓ CSS files copied" -ForegroundColor Green
    } else {
        Write-Host "⚠️ No CSS files found to copy" -ForegroundColor Yellow
    }
    
    if (Test-Path -Path "view\*") {
        Copy-Item -Path "view\*" -Destination "chrome\view" -Recurse -Force
        Write-Host "✓ HTML files copied" -ForegroundColor Green
    } else {
        Write-Host "⚠️ No HTML files found to copy" -ForegroundColor Yellow
    }
    
    if (Test-Path -Path "_locales\*") {
        Copy-Item -Path "_locales\*" -Destination "chrome\_locales" -Recurse -Force
        Write-Host "✓ Localization files copied" -ForegroundColor Green
    } else {
        Write-Host "⚠️ No localization files found to copy" -ForegroundColor Yellow
    }
    
    if (Test-Path -Path "images\*") {
        Copy-Item -Path "images\*" -Destination "chrome\images" -Recurse -Force
        Write-Host "✓ Image files copied" -ForegroundColor Green
    } else {
        Write-Host "⚠️ No image files found to copy" -ForegroundColor Yellow
    }
    
    # Copy special files
    if (Test-Path -Path "manifests\manifest-chrome.json") {
        Copy-Item -Path "manifests\manifest-chrome.json" -Destination "chrome\manifest.json" -Force
        Write-Host "✓ Manifest file copied" -ForegroundColor Green
    } else {
        Write-Host "❌ Manifest file not found: manifests\manifest-chrome.json" -ForegroundColor Red
        exit
    }
    
    if (Test-Path -Path "manifests\manifest-pwa.json") {
        Copy-Item -Path "manifests\manifest-pwa.json" -Destination "chrome\manifest-pwa.json" -Force
        Write-Host "✓ PWA Manifest file copied" -ForegroundColor Green
    } else {
        Write-Host "⚠️ PWA Manifest file not found: manifests\manifest-pwa.json" -ForegroundColor Yellow
    }
    
    if (Test-Path -Path "manifests\schema-chrome.json") {
        Copy-Item -Path "manifests\schema-chrome.json" -Destination "chrome\schema.json" -Force
        Write-Host "✓ Schema file copied" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Schema file not found: manifests\schema-chrome.json" -ForegroundColor Yellow
    }
    
    if (Test-Path -Path "LICENSE") {
        Copy-Item -Path "LICENSE" -Destination "chrome\LICENSE" -Force
        Write-Host "✓ LICENSE file copied" -ForegroundColor Green
    } else {
        Write-Host "⚠️ LICENSE file not found" -ForegroundColor Yellow
    }
    
    if (Test-Path -Path "sass\DroidSansMono.woff2") {
        Copy-Item -Path "sass\DroidSansMono.woff2" -Destination "chrome\css" -Force
        Write-Host "✓ Font file copied" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Font file not found: sass\DroidSansMono.woff2" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ File copy failed: $_" -ForegroundColor Red
    exit
}

# Build complete
$extensionPath = (Get-Item -Path ".\chrome").FullName
Write-Host "`n===== Build Complete =====" -ForegroundColor Cyan
Write-Host "Chrome extension is ready at:" -ForegroundColor Green
Write-Host $extensionPath -ForegroundColor Cyan
Write-Host "`nIn Chrome extensions page (chrome://extensions/), enable Developer mode," -ForegroundColor Green
Write-Host "then click 'Load unpacked' and select the directory above." -ForegroundColor Green 