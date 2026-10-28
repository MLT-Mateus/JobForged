param([ValidateSet('test','live')][string]$Environment='test',[string]$BackupRoot='')
if(!$BackupRoot){$BackupRoot=Join-Path ([Environment]::GetFolderPath('UserProfile')) ('JobForged-Backups\'+(Get-Culture).TextInfo.ToTitleCase($Environment))}
$ErrorActionPreference='Stop'
$started=[datetime]::UtcNow
$record=Join-Path $BackupRoot 'last-run.json'
try {
 [IO.File]::WriteAllText($record,(@{utc=$started.ToString('o');status='running'}|ConvertTo-Json))
 & "$PSScriptRoot\collect-test-backup.ps1" -BackupRoot $BackupRoot -Environment $Environment -Scheduled
 $evidence=Get-Content -LiteralPath (Join-Path $BackupRoot 'last-success.json') -Raw|ConvertFrom-Json
 $completed=if($evidence.utc -is [datetime]){$evidence.utc.ToUniversalTime()}else{[datetimeoffset]::Parse([string]$evidence.utc,[Globalization.CultureInfo]::InvariantCulture).UtcDateTime}
 if(!$evidence.restorationVerified -or $completed -lt $started -or $evidence.archive -notmatch ('^'+$Environment+'-[0-9]{8}T[0-9]{6}Z\.jfenc$')){throw 'No fresh verified backup evidence'}
 $archive=Get-Item -LiteralPath (Join-Path $BackupRoot $evidence.archive)
 if($archive.Length -le 0){throw 'Verified encrypted archive missing'}
 [IO.File]::WriteAllText($record,(@{utc=[datetime]::UtcNow.ToString('o');status='succeeded';archive=$archive.Name;restorationVerified=$true}|ConvertTo-Json))
 exit 0
} catch {
 # Never log provider payloads, credentials or recovery contents.
 [IO.File]::WriteAllText($record,(@{utc=[datetime]::UtcNow.ToString('o');status='failed';errorType=$_.Exception.GetType().Name;detail='Backup not confirmed; previous verified archives preserved'}|ConvertTo-Json))
 exit 1
}
