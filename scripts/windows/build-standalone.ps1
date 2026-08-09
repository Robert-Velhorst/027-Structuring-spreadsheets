[CmdletBinding()]
param([switch]$Clean)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$apiDir = Join-Path $repoRoot 'apps\api'
$webDist = Join-Path $repoRoot 'apps\web\dist'
$venvPython = Join-Path $apiDir '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $venvPython) -or -not (Test-Path -LiteralPath (Join-Path $webDist 'index.html'))) { throw 'Run scripts\windows\setup.ps1 first.' }
$uv = Get-Command uv.exe -ErrorAction SilentlyContinue
if ($uv) { & $uv.Source pip install --python $venvPython -e "${apiDir}[build]" }
else { & $venvPython -m pip install --disable-pip-version-check -e "${apiDir}[build]" }
$arguments = @('-m','PyInstaller','--noconfirm','--onedir','--console','--name','SheetShaper','--paths',(Join-Path $apiDir 'src'),'--add-data',"$webDist;web",(Join-Path $apiDir 'src\sheet_shaper_api\standalone.py'))
if ($Clean) { $arguments = @('-m','PyInstaller','--noconfirm','--clean') + $arguments[3..($arguments.Count - 1)] }
& $venvPython @arguments
Write-Host "Standalone build created under $(Join-Path $repoRoot 'dist\SheetShaper')."
