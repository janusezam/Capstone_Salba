#!/usr/bin/env pwsh
Set-Location (Join-Path $PSScriptRoot "backend")
Write-Host "Starting backend server from: $(Get-Location)"
node server.js
