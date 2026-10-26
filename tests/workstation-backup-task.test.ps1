$ErrorActionPreference='Stop'
$temporary=[IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$sandbox=Join-Path $temporary ('jbfd-backup-wrapper-'+[guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($sandbox)|Out-Null
try {
 Copy-Item -LiteralPath (Join-Path $PSScriptRoot '..\scripts\security\run-workstation-backup-task.ps1') -Destination (Join-Path $sandbox 'run-workstation-backup-task.ps1')
 foreach($scenario in @('fresh','stale','missing','error')){
  $destination=Join-Path $sandbox $scenario
  [IO.Directory]::CreateDirectory($destination)|Out-Null
  $stub=@'
param([string]$BackupRoot)
$scenario=[IO.Path]::GetFileName($BackupRoot)
if($scenario -eq 'error'){throw 'Synthetic collector failure'}
if($scenario -eq 'missing'){return}
$archive='test-20260101T000000Z.jfenc'
[IO.File]::WriteAllText((Join-Path $BackupRoot $archive),'synthetic envelope; encryption tested separately')
$date=if($scenario -eq 'stale'){[datetime]::UtcNow.AddDays(-1)}else{[datetime]::UtcNow}
[IO.File]::WriteAllText((Join-Path $BackupRoot 'last-success.json'),(@{utc=$date.ToString('o');restorationVerified=$true;archive=$archive}|ConvertTo-Json))
'@
  [IO.File]::WriteAllText((Join-Path $sandbox 'collect-test-backup.ps1'),$stub)
  & ([Environment]::ProcessPath) -NoProfile -NonInteractive -File (Join-Path $sandbox 'run-workstation-backup-task.ps1') -BackupRoot $destination
  $resultCode=$LASTEXITCODE
  $record=Get-Content -LiteralPath (Join-Path $destination 'last-run.json') -Raw|ConvertFrom-Json
  if($scenario -eq 'fresh'){
   if($resultCode -ne 0 -or $record.status -ne 'succeeded'){throw 'Fresh evidence was rejected'}
  }elseif($resultCode -ne 1 -or $record.status -ne 'failed'){throw "Failure scenario reported success: $scenario"}
 }
 [pscustomobject]@{FreshEvidence=$true;StaleRejected=$true;MissingRejected=$true;FailureRejected=$true;SyntheticControlTest=$true}|ConvertTo-Json -Compress
} finally {
 $resolved=[IO.Path]::GetFullPath($sandbox)
 if(!$resolved.StartsWith($temporary,[StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($resolved) -notmatch '^jbfd-backup-wrapper-[a-f0-9]{32}$'){throw 'Unsafe test cleanup path'}
 Remove-Item -LiteralPath $resolved -Recurse -Force
}
