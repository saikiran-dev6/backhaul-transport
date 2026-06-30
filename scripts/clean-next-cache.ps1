$ErrorActionPreference = "Stop"

$workspace = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$target = Join-Path $workspace ".next"

if (Test-Path -LiteralPath $target) {
  $resolved = (Resolve-Path -LiteralPath $target).Path
  if (-not $resolved.StartsWith($workspace, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to delete outside workspace: $resolved"
  }

  Remove-Item -LiteralPath $resolved -Recurse -Force
  Write-Host "[clean-next-cache] Removed generated Next cache: $resolved"
} else {
  Write-Host "[clean-next-cache] No .next cache found"
}
