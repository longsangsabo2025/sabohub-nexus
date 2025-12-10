#!/usr/bin/env pwsh
# 🚀 SABOHUB NEXUS - Quick Deploy Script
# Deploy to Vercel with one command

param(
    [switch]$Production,
    [switch]$Preview,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# Colors
$COLOR_GREEN = "`e[32m"
$COLOR_BLUE = "`e[34m"
$COLOR_YELLOW = "`e[33m"
$COLOR_RED = "`e[31m"
$COLOR_RESET = "`e[0m"

function Write-Step {
    param([string]$Message)
    Write-Host "${COLOR_BLUE}▶ $Message${COLOR_RESET}"
}

function Write-Success {
    param([string]$Message)
    Write-Host "${COLOR_GREEN}✓ $Message${COLOR_RESET}"
}

function Write-Warning {
    param([string]$Message)
    Write-Host "${COLOR_YELLOW}⚠ $Message${COLOR_RESET}"
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "${COLOR_RED}✗ $Message${COLOR_RESET}"
}

function Show-Help {
    Write-Host @"
🚀 SABOHUB NEXUS - Deployment Script

Usage:
  .\deploy.ps1 [options]

Options:
  -Production     Deploy to production (hub.saboarena.com)
  -Preview        Deploy preview (temp URL)
  -Help           Show this help message

Examples:
  .\deploy.ps1 -Preview       # Deploy preview for testing
  .\deploy.ps1 -Production    # Deploy to production

Requirements:
  - Node.js 18+ installed
  - Vercel CLI installed (npm i -g vercel)
  - Vercel account logged in (vercel login)

"@
    exit 0
}

if ($Help) {
    Show-Help
}

Write-Host @"
${COLOR_BLUE}
╔═══════════════════════════════════════════╗
║   🚀 SABOHUB NEXUS DEPLOYMENT SCRIPT     ║
║   Deploy Fast. Deploy Right.             ║
╚═══════════════════════════════════════════╝
${COLOR_RESET}
"@

# Check Node.js
Write-Step "Checking Node.js..."
try {
    $nodeVersion = node --version
    Write-Success "Node.js version: $nodeVersion"
} catch {
    Write-Error-Custom "Node.js not found. Install from https://nodejs.org"
    exit 1
}

# Check Vercel CLI
Write-Step "Checking Vercel CLI..."
try {
    $vercelVersion = vercel --version
    Write-Success "Vercel CLI version: $vercelVersion"
} catch {
    Write-Warning "Vercel CLI not found. Installing..."
    npm install -g vercel
    Write-Success "Vercel CLI installed"
}

# Pre-deployment checks
Write-Step "Running pre-deployment checks..."

# Check .env file (for reference only)
if (Test-Path ".env") {
    Write-Success ".env file found (for local dev)"
} else {
    Write-Warning ".env file not found (OK for production, variables set in Vercel)"
}

# Install dependencies
Write-Step "Installing dependencies..."
npm install
Write-Success "Dependencies installed"

# Run linting
Write-Step "Running ESLint..."
try {
    npm run lint
    Write-Success "No linting errors"
} catch {
    Write-Warning "Linting issues found. Fix before deploying."
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y") {
        exit 1
    }
}

# Build locally to verify
Write-Step "Testing production build..."
try {
    npm run build
    Write-Success "Production build successful"
} catch {
    Write-Error-Custom "Build failed. Fix errors before deploying."
    exit 1
}

# Deploy
if ($Production) {
    Write-Step "🚀 Deploying to PRODUCTION..."
    Write-Warning "This will deploy to hub.saboarena.com"
    $confirm = Read-Host "Are you sure? (yes/N)"
    
    if ($confirm -eq "yes") {
        vercel --prod
        Write-Success "Deployment complete!"
        Write-Host ""
        Write-Host "${COLOR_GREEN}🎉 SABOHUB NEXUS is LIVE!${COLOR_RESET}"
        Write-Host "${COLOR_BLUE}🌐 URL: https://hub.saboarena.com${COLOR_RESET}"
        Write-Host ""
        Write-Host "Next steps:"
        Write-Host "  1. Verify deployment at https://hub.saboarena.com"
        Write-Host "  2. Test authentication flow"
        Write-Host "  3. Check all features work"
        Write-Host "  4. Notify manager for UAT"
    } else {
        Write-Warning "Deployment cancelled"
        exit 0
    }
} elseif ($Preview) {
    Write-Step "🔍 Deploying PREVIEW..."
    vercel
    Write-Success "Preview deployment complete!"
    Write-Host ""
    Write-Host "${COLOR_YELLOW}Preview URL will be shown above ↑${COLOR_RESET}"
    Write-Host "Share this URL with team for testing"
} else {
    Write-Host ""
    Write-Host "${COLOR_YELLOW}No deployment option specified.${COLOR_RESET}"
    Write-Host ""
    Write-Host "Choose an option:"
    Write-Host "  ${COLOR_GREEN}1)${COLOR_RESET} Deploy PREVIEW (testing)"
    Write-Host "  ${COLOR_GREEN}2)${COLOR_RESET} Deploy PRODUCTION (live)"
    Write-Host "  ${COLOR_RED}3)${COLOR_RESET} Cancel"
    Write-Host ""
    $choice = Read-Host "Enter choice (1-3)"
    
    switch ($choice) {
        "1" {
            Write-Step "Deploying preview..."
            vercel
            Write-Success "Preview deployed!"
        }
        "2" {
            Write-Step "Deploying to production..."
            Write-Warning "This will deploy to hub.saboarena.com"
            $confirm = Read-Host "Confirm? (yes/N)"
            if ($confirm -eq "yes") {
                vercel --prod
                Write-Success "Production deployed!"
            } else {
                Write-Warning "Cancelled"
            }
        }
        "3" {
            Write-Warning "Deployment cancelled"
            exit 0
        }
        default {
            Write-Error-Custom "Invalid choice"
            exit 1
        }
    }
}

Write-Host ""
Write-Host "${COLOR_BLUE}╔═══════════════════════════════════════════╗${COLOR_RESET}"
Write-Host "${COLOR_BLUE}║   ✓ Deployment process complete          ║${COLOR_RESET}"
Write-Host "${COLOR_BLUE}╚═══════════════════════════════════════════╝${COLOR_RESET}"
Write-Host ""
