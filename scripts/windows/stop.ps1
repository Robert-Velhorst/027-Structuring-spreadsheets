[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$runtimeFile = Join-Path (Join-Path $env:LOCALAPPDATA 'SheetShaper\runtime') 'current.json'
if (-not (Test-Path -LiteralPath $runtimeFile)) { Write-Host 'Sheet Shaper is not recorded as running.'; exit 0 }
$runtime = Get-Content -LiteralPath $runtimeFile -Raw | ConvertFrom-Json
$targets = @(@{ Id=[int]$runtime.pid; Executable=[string]$runtime.executable; StartedAt=[datetime]$runtime.startedAt })
if ($runtime.launcherPid) { $targets += @{ Id=[int]$runtime.launcherPid; Executable=[string]$runtime.launcherExecutable; StartedAt=[datetime]$runtime.launcherStartedAt } }
if ($runtime.ngrokPid) { $targets += @{ Id=[int]$runtime.ngrokPid; Executable=[string]$runtime.ngrokExecutable; StartedAt=[datetime]$runtime.ngrokStartedAt } }
foreach ($target in $targets) {
    if ($target.Id -le 0) { continue }
    $process = Get-Process -Id $target.Id -ErrorAction SilentlyContinue
    if (-not $process) { continue }
    $sameExecutable = $process.Path -and ([IO.Path]::GetFullPath($process.Path) -eq [IO.Path]::GetFullPath($target.Executable))
    $sameStart = [Math]::Abs(($process.StartTime.ToUniversalTime() - $target.StartedAt.ToUniversalTime()).TotalSeconds) -lt 2
    if (-not $sameExecutable -or -not $sameStart) { throw "Refusing to stop PID $($target.Id): its identity no longer matches the recorded Sheet Shaper process." }
    Stop-Process -Id $process.Id
}
Remove-Item -LiteralPath $runtimeFile -Force
Write-Host 'Sheet Shaper has stopped. Spreadsheet data and backups were preserved.'
