# Authenticator Chrome Extension Build Script
# Save as UTF-8 without BOM

# Set error handling
$ErrorActionPreference = "Stop"

Write-Host "===== Authenticator Chrome Extension Build Script =====" -ForegroundColor Cyan

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
    exit
}
Write-Host "✓ JavaScript files compiled successfully" -ForegroundColor Green

# Compile SCSS files
Write-Host ">> Compiling SCSS files..." -ForegroundColor Yellow
npx sass sass:css
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ SCSS compilation failed" -ForegroundColor Red
    exit
}
Write-Host "✓ SCSS files compiled successfully" -ForegroundColor Green

# Copy files to chrome directory
Write-Host ">> Copying files to Chrome extension directory..." -ForegroundColor Yellow

# Copy files
try {
    Copy-Item -Path "dist\*" -Destination "chrome\dist" -Recurse -Force
    Write-Host "✓ JavaScript files copied" -ForegroundColor Green
    
    Copy-Item -Path "css\*" -Destination "chrome\css" -Recurse -Force
    Write-Host "✓ CSS files copied" -ForegroundColor Green
    
    Copy-Item -Path "view\*" -Destination "chrome\view" -Recurse -Force
    Write-Host "✓ HTML files copied" -ForegroundColor Green
    
    Copy-Item -Path "_locales\*" -Destination "chrome\_locales" -Recurse -Force
    Write-Host "✓ Localization files copied" -ForegroundColor Green
    
    Copy-Item -Path "images\*" -Destination "chrome\images" -Recurse -Force
    Write-Host "✓ Image files copied" -ForegroundColor Green
    
    # Copy special files
    Copy-Item -Path "manifests\manifest-chrome.json" -Destination "chrome\manifest.json" -Force
    Write-Host "✓ Manifest file copied" -ForegroundColor Green
    
    Copy-Item -Path "manifests\manifest-pwa.json" -Destination "chrome\manifest-pwa.json" -Force
    Write-Host "✓ PWA Manifest file copied" -ForegroundColor Green
    
    Copy-Item -Path "manifests\schema-chrome.json" -Destination "chrome\schema.json" -Force
    Write-Host "✓ Schema file copied" -ForegroundColor Green
    
    Copy-Item -Path "LICENSE" -Destination "chrome\LICENSE" -Force
    Write-Host "✓ LICENSE file copied" -ForegroundColor Green
    
    Copy-Item -Path "sass\DroidSansMono.woff2" -Destination "chrome\css" -Force
    Write-Host "✓ Font file copied" -ForegroundColor Green
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