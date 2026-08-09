[CmdletBinding()]
param([switch]$NoBrowser, [int]$Port = 8765)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$venvPython = Join-Path $repoRoot 'apps\api\.venv\Scripts\python.exe'
$webDist = Join-Path $repoRoot 'apps\web\dist'
if (-not (Test-Path -LiteralPath $venvPython) -or -not (Test-Path -LiteralPath (Join-Path $webDist 'index.html'))) {
    throw 'Run scripts\windows\setup.ps1 first.'
}
$dataDir = Join-Path $env:LOCALAPPDATA 'SheetShaper'
$runtimeDir = Join-Path $dataDir 'runtime'
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
$occupied = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners().Port
while ($occupied -contains $Port -and $Port -lt 8790) { $Port++ }
if ($occupied -contains $Port) { throw 'No free Sheet Shaper port was found between 8765 and 8790.' }
$localUrl = "http://127.0.0.1:$Port"
$outputLog = Join-Path $runtimeDir 'local-output.log'
$errorLog = Join-Path $runtimeDir 'local-error.log'

$env:SS_DATA_DIR = $dataDir
$env:SS_WEB_DIST = $webDist
$env:SS_HOST = '127.0.0.1'
$env:SS_PORT = [string]$Port
$env:SS_PUBLIC_MODE = 'false'
$process = Start-Process -FilePath $venvPython -ArgumentList '-m','sheet_shaper_api' -WorkingDirectory $repoRoot -WindowStyle Hidden -RedirectStandardOutput $outputLog -RedirectStandardError $errorLog -PassThru

try {
    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        if ($process.HasExited) { throw "Sheet Shaper stopped during startup. See $errorLog" }
        try { $ready = (Invoke-RestMethod -Uri "$localUrl/readyz" -TimeoutSec 2).status -eq 'ready' } catch { $ready = $false }
        if ($ready) { break }
        Start-Sleep -Milliseconds 500
    }
    if (-not $ready) { throw 'Sheet Shaper did not become ready within 30 seconds.' }
    [ordered]@{ pid=$process.Id; executable=$process.Path; startedAt=$process.StartTime.ToUniversalTime().ToString('o'); mode='local'; url=$localUrl } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runtimeDir 'current.json') -Encoding UTF8
    if (-not $NoBrowser) { Start-Process $localUrl }
    Write-Host "Sheet Shaper is ready at $localUrl"
} catch {
    if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force }
    throw
} finally {
    Remove-Item Env:SS_PUBLIC_MODE,Env:SS_HOST,Env:SS_PORT,Env:SS_WEB_DIST,Env:SS_DATA_DIR -ErrorAction SilentlyContinue
}
