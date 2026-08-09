[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$apiDir = Join-Path $repoRoot 'apps\api'
$webDir = Join-Path $repoRoot 'apps\web'
$python = Get-Command python.exe -ErrorAction Stop
$version = & $python.Source -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
if ([version]$version -lt [version]'3.11') { throw 'Python 3.11 or newer is required.' }

$venvPython = Join-Path $apiDir '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $venvPython)) { & $python.Source -m venv (Join-Path $apiDir '.venv') }
$uv = Get-Command uv.exe -ErrorAction SilentlyContinue
if ($uv) { & $uv.Source pip install --python $venvPython -e $apiDir }
else { & $venvPython -m pip install --disable-pip-version-check -e $apiDir }

$node = Get-Command node.exe -ErrorAction Stop
$nodeMajor = [int]((& $node.Source --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 20 -or ($nodeMajor % 2) -eq 1) { throw 'Use a supported even-numbered Node.js release (20, 22, or 24).' }
$npx = Get-Command npx.cmd -ErrorAction Stop
& $npx.Source --yes pnpm@10.17.1 --dir $webDir install --frozen-lockfile
& $npx.Source --yes pnpm@10.17.1 --dir $webDir run build
Write-Host 'Sheet Shaper setup is complete.'
