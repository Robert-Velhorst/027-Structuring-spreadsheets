[CmdletBinding()]
param([switch]$NoBrowser, [int]$Port = 8765, [string[]]$AllowedOrigin = @())

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$venvPython = Join-Path $repoRoot 'apps\api\.venv\Scripts\python.exe'
$webDist = Join-Path $repoRoot 'apps\web\dist'
$ngrok = Get-Command ngrok.exe -ErrorAction Stop
if (-not (Test-Path -LiteralPath $venvPython) -or -not (Test-Path -LiteralPath (Join-Path $webDist 'index.html'))) { throw 'Run scripts\windows\setup.ps1 first.' }

$dataDir = Join-Path $env:LOCALAPPDATA 'SheetShaper'
$runtimeDir = Join-Path $dataDir 'runtime'
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
$occupied = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners().Port
while ($occupied -contains $Port -and $Port -lt 8790) { $Port++ }
if ($occupied -contains $Port) { throw 'No free Sheet Shaper port was found between 8765 and 8790.' }
$localUrl = "http://127.0.0.1:$Port"
$agentPort = 4040
while ($occupied -contains $agentPort -and $agentPort -lt 4060) { $agentPort++ }
if ($occupied -contains $agentPort) { throw 'No free ngrok agent API port was found between 4040 and 4060.' }
$agentUrl = "http://127.0.0.1:$agentPort"
$defaultNgrokConfig = Join-Path $env:LOCALAPPDATA 'ngrok\ngrok.yml'
if (-not (Test-Path -LiteralPath $defaultNgrokConfig)) { throw 'Configure ngrok once with: ngrok config add-authtoken <token>' }
$overlayNgrokConfig = Join-Path $runtimeDir 'ngrok-sheet-shaper.yml'
@"
version: 3
agent:
  web_addr: 127.0.0.1:$agentPort
"@ | Set-Content -LiteralPath $overlayNgrokConfig -Encoding ASCII
$tokenPath = Join-Path $runtimeDir 'public-token.dpapi'
if (Test-Path -LiteralPath $tokenPath) {
    $secureToken = Get-Content -LiteralPath $tokenPath | ConvertTo-SecureString
    $credential = [pscredential]::new('sheet-shaper', $secureToken)
    $apiToken = $credential.GetNetworkCredential().Password
} else {
    $bytes = New-Object byte[] 48
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    $apiToken = [Convert]::ToBase64String($bytes)
    ConvertTo-SecureString $apiToken -AsPlainText -Force | ConvertFrom-SecureString | Set-Content -LiteralPath $tokenPath -Encoding ASCII
}

$apiOutputLog = Join-Path $runtimeDir 'public-api-output.log'
$apiErrorLog = Join-Path $runtimeDir 'public-api-error.log'
$ngrokOutputLog = Join-Path $runtimeDir 'ngrok-output.log'
$ngrokErrorLog = Join-Path $runtimeDir 'ngrok-error.log'
$env:SS_DATA_DIR = $dataDir
$env:SS_WEB_DIST = $webDist
$env:SS_HOST = '127.0.0.1'
$env:SS_PORT = [string]$Port
$env:SS_PUBLIC_MODE = 'true'
$env:SS_API_TOKEN = $apiToken
$origins = @($localUrl, "http://localhost:$Port")
foreach ($origin in $AllowedOrigin) {
    $parsed = $null
    if (-not [Uri]::TryCreate($origin, [UriKind]::Absolute, [ref]$parsed) -or ($parsed.Scheme -ne 'https' -and -not $parsed.IsLoopback)) { throw "Allowed origins must be HTTPS or loopback URLs: $origin" }
    $origins += $parsed.GetLeftPart([UriPartial]::Authority)
}
$env:SS_ALLOWED_ORIGINS = ($origins | Select-Object -Unique) -join ','
$apiProcess = Start-Process -FilePath $venvPython -ArgumentList '-m','sheet_shaper_api' -WorkingDirectory $repoRoot -WindowStyle Hidden -RedirectStandardOutput $apiOutputLog -RedirectStandardError $apiErrorLog -PassThru
$ngrokProcess = $null
try {
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        if ($apiProcess.HasExited) { throw "Sheet Shaper stopped during startup. See $apiErrorLog" }
        try { if ((Invoke-RestMethod -Uri "$localUrl/readyz" -TimeoutSec 2).mode -eq 'public') { break } } catch {}
        Start-Sleep -Milliseconds 500
    }
    $ngrokProcess = Start-Process -FilePath $ngrok.Source -ArgumentList 'http',"127.0.0.1:$Port",'--log=stdout',"--config=$defaultNgrokConfig,$overlayNgrokConfig" -WindowStyle Hidden -RedirectStandardOutput $ngrokOutputLog -RedirectStandardError $ngrokErrorLog -PassThru
    $publicUrl = $null
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        if ($ngrokProcess.HasExited) { throw "ngrok stopped during startup. See $ngrokErrorLog" }
        try { $publicUrl = (Invoke-RestMethod -Uri "$agentUrl/api/tunnels" -TimeoutSec 2).tunnels | Where-Object { $_.proto -eq 'https' -and $_.config.addr -eq $localUrl } | Select-Object -First 1 -ExpandProperty public_url } catch {}
        if ($publicUrl) { break }
        Start-Sleep -Milliseconds 500
    }
    if (-not $publicUrl -or -not $publicUrl.StartsWith('https://')) { throw 'ngrok did not provide a verified HTTPS tunnel.' }
    $headers = @{ Authorization = "Bearer $apiToken" }
    $capabilities = Invoke-RestMethod -Uri "$publicUrl/api/v1/capabilities" -Headers $headers -TimeoutSec 15
    if (-not $capabilities.ok -or $capabilities.data.mode -ne 'public') { throw 'The public endpoint failed its authenticated readiness check.' }
    $apiToken | Set-Clipboard
    [ordered]@{ pid=$apiProcess.Id; executable=$apiProcess.Path; startedAt=$apiProcess.StartTime.ToUniversalTime().ToString('o'); ngrokPid=$ngrokProcess.Id; ngrokExecutable=$ngrokProcess.Path; ngrokStartedAt=$ngrokProcess.StartTime.ToUniversalTime().ToString('o'); mode='public'; url=$publicUrl; tokenPath=$tokenPath } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runtimeDir 'current.json') -Encoding UTF8
    if (-not $NoBrowser) { Start-Process $publicUrl }
    Write-Host "Sheet Shaper is ready at $publicUrl"
    Write-Host 'The bearer token was copied to the Windows clipboard and is stored locally with DPAPI.'
} catch {
    if ($ngrokProcess -and -not $ngrokProcess.HasExited) { Stop-Process -Id $ngrokProcess.Id -Force }
    if (-not $apiProcess.HasExited) { Stop-Process -Id $apiProcess.Id -Force }
    throw
} finally {
    $apiToken = $null
    Remove-Item Env:SS_ALLOWED_ORIGINS,Env:SS_API_TOKEN,Env:SS_PUBLIC_MODE,Env:SS_HOST,Env:SS_PORT,Env:SS_WEB_DIST,Env:SS_DATA_DIR -ErrorAction SilentlyContinue
}
