param(
  [string]$ProjectRef = "qhowrtbzescengnbfwvz",
  [string]$RegionPooler = "aws-1-us-east-1.pooler.supabase.com"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = Join-Path $repoRoot "apps\api\.env"

if (!(Test-Path -LiteralPath $envPath)) {
  throw "No encontre apps/api/.env. Crea el archivo primero o copia apps/api/.env.example."
}

$securePassword = Read-Host "Pega aqui la password de la base de datos Supabase" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if ([string]::IsNullOrWhiteSpace($plainPassword)) {
  throw "La password no puede estar vacia."
}

$encodedPassword = [uri]::EscapeDataString($plainPassword)
$databaseUrl = "postgresql://postgres.${ProjectRef}:${encodedPassword}@${RegionPooler}:6543/postgres?pgbouncer=true"
$directUrl = "postgresql://postgres.${ProjectRef}:${encodedPassword}@${RegionPooler}:5432/postgres"

$lines = Get-Content -LiteralPath $envPath
$hasDatabaseUrl = $false
$hasDirectUrl = $false

$updated = foreach ($line in $lines) {
  if ($line -match '^DATABASE_URL=') {
    $hasDatabaseUrl = $true
    "DATABASE_URL=`"$databaseUrl`""
  } elseif ($line -match '^DIRECT_URL=') {
    $hasDirectUrl = $true
    "DIRECT_URL=`"$directUrl`""
  } else {
    $line
  }
}

if (!$hasDatabaseUrl) {
  $updated = @("DATABASE_URL=`"$databaseUrl`"") + $updated
}

if (!$hasDirectUrl) {
  $updated = @($updated[0], "DIRECT_URL=`"$directUrl`"") + $updated[1..($updated.Count - 1)]
}

Set-Content -LiteralPath $envPath -Value $updated -Encoding UTF8

Write-Host "Listo. apps/api/.env fue actualizado con la password codificada para Prisma." -ForegroundColor Green
Write-Host "Ahora ejecuta: npm run db:migrate" -ForegroundColor Yellow
