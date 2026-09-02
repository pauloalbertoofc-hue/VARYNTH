param(
  [string]$RepositoryPath = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"
$logFile = Join-Path $RepositoryPath ".git\varynth-autosync.log"
$lockFile = Join-Path $RepositoryPath ".git\varynth-autosync.lock"

function Write-SyncLog([string]$Message) {
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -LiteralPath $logFile -Value "[$timestamp] $Message"
}

if (Test-Path -LiteralPath $lockFile) {
  exit 0
}

try {
  New-Item -ItemType File -Path $lockFile -ErrorAction Stop | Out-Null
  Set-Location -LiteralPath $RepositoryPath

  $branch = (git branch --show-current).Trim()
  if ($branch -ne "main") {
    Write-SyncLog "Ignorado: a branch atual é '$branch', não 'main'."
    exit 0
  }

  $remoteHeadLine = git ls-remote origin refs/heads/main
  if ($LASTEXITCODE -ne 0 -or -not $remoteHeadLine) {
    Write-SyncLog "Falha: não foi possível consultar origin/main. Nenhum arquivo local foi alterado."
    exit 1
  }

  $remoteHead = ($remoteHeadLine -split "\s+")[0]
  $localHead = (git rev-parse HEAD).Trim()
  if ($remoteHead -ne $localHead) {
    git merge-base --is-ancestor $remoteHead $localHead 2>$null
    if ($LASTEXITCODE -ne 0) {
      Write-SyncLog "Bloqueado: o GitHub contém alterações que não existem localmente. A automação não executa pull nem sobrescreve a pasta local."
      exit 2
    }
  }

  $changes = git status --porcelain
  if (-not $changes) {
    exit 0
  }

  git diff --check
  if ($LASTEXITCODE -ne 0) {
    Write-SyncLog "Bloqueado: foram encontrados problemas de espaços em branco no conteúdo local."
    exit 3
  }

  git add -A
  $stagedPatch = git diff --cached --no-ext-diff --unified=0
  $secretPattern = "AIza[0-9A-Za-z_-]{20,}|GOCSPX-[0-9A-Za-z_-]+|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|GOOGLE_CALENDAR_CLIENT_SECRET\s*=\s*[^\s#]+|VARYNTH_TOKEN_ENCRYPTION_KEY\s*=\s*[^\s#]+"
  if ($stagedPatch | Select-String -Pattern $secretPattern -Quiet) {
    git reset --quiet
    Write-SyncLog "Bloqueado: possível credencial detectada. Nada foi enviado ao GitHub."
    exit 4
  }

  git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) {
    exit 0
  }

  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
  git commit -m "chore(sync): backup local automático $stamp"
  if ($LASTEXITCODE -ne 0) {
    Write-SyncLog "Falha ao criar o commit automático."
    exit 5
  }

  git push origin HEAD:main
  if ($LASTEXITCODE -ne 0) {
    Write-SyncLog "Falha ao enviar o commit. Ele permanece salvo localmente para nova tentativa."
    exit 6
  }

  Write-SyncLog "Sincronização concluída: arquivos locais enviados para origin/main."
}
catch {
  Write-SyncLog "Erro inesperado: $($_.Exception.Message)"
  exit 10
}
finally {
  Remove-Item -LiteralPath $lockFile -Force -ErrorAction SilentlyContinue
}
