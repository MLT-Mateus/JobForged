param(
  [ValidateSet('test','live')][string]$Environment='test',
  [string]$BackupRoot='',
  [switch]$Scheduled,
  [ValidatePattern('^[a-f0-9]{40}$')][string]$Revision,
  [ValidatePattern('^/opt/jbfd/security-work/[a-zA-Z0-9._-]+\.json$')][string]$Authorization
)
if(!$BackupRoot){$BackupRoot=Join-Path ([Environment]::GetFolderPath('UserProfile')) ('JobForged-Backups\'+(Get-Culture).TextInfo.ToTitleCase($Environment))}
if($Environment -eq 'live' -and !$Scheduled -and (!$Revision -or !$Authorization)){throw 'Live backup requires prior release-specific approval'}
$ErrorActionPreference='Stop'
# Install together with workstation-backup.ps1 in a protected local directory.
# Runs in the signed-in user's context, which is required for DPAPI CurrentUser.
$lockPath=Join-Path $BackupRoot 'collector.lock'
$lock=$null
$incoming=$null
try {
  $resolvedRoot=[IO.Path]::GetFullPath($BackupRoot).TrimEnd('\')
  if(!(Test-Path -LiteralPath $resolvedRoot -PathType Container)){throw 'Protected backup directory missing'}
  $lock=[IO.File]::Open($lockPath,[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
  $sshArgs=@('-n','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=15','root@187.77.229.27')
  $backupCommand='python3 /opt/jbfd/security-work/test-recovery-drill.py --environment '+$Environment
  if($Scheduled){$backupCommand+=' --scheduled'}elseif($Environment -eq 'live'){$backupCommand+=' --revision '+$Revision+' --authorization '+$Authorization}
  $raw=& ssh @sshArgs $backupCommand
  if($LASTEXITCODE -ne 0){throw 'Target backup or isolated restoration failed'}
  $evidence=($raw -join "`n")|ConvertFrom-Json
  if(!$evidence.counts_match -or $evidence.environment -ne $Environment -or $evidence.backup -notmatch ('^/opt/jbfd/backups/security/('+$Environment+'-[0-9]{8}T[0-9]{6}Z)$')){throw 'Invalid recovery evidence'}
  $name=$Matches[1]
  $remote="$($evidence.backup)/offsite.tar"
  & ssh @sshArgs "tar -C $($evidence.backup) -cf $remote postgres.sql.gz storage.tar.gz objects.private.json recovery.json infrastructure-audit.jsonl"
  if($LASTEXITCODE -ne 0){throw 'Remote archive failed'}
  $incoming=Join-Path $resolvedRoot "$name.incoming"
  & scp -q -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15 "root@187.77.229.27:$remote" $incoming
  if($LASTEXITCODE -ne 0){throw 'Encrypted-copy transfer failed'}
  $expected=(Get-FileHash -LiteralPath $incoming -Algorithm SHA256).Hash
  $encrypted=Join-Path $resolvedRoot "$name.jfenc"
  & "$PSScriptRoot\workstation-backup.ps1" -Source $incoming -Destination $encrypted | Out-Null
  $verified=& "$PSScriptRoot\workstation-backup.ps1" -Source $encrypted -Destination '' -Decrypt -Verify
  if(($verified -join '') -notmatch $expected){throw 'Encrypted backup verification failed'}
  $encryptedHash=(Get-FileHash -LiteralPath $encrypted -Algorithm SHA256).Hash
  & ssh @sshArgs "python3 /opt/jbfd/security-work/record-offsite-copy.py $name $expected $encryptedHash"
  if($LASTEXITCODE -ne 0){throw 'Offsite receipt failed; encrypted archive preserved'}
  Remove-Item -LiteralPath $incoming
  $incoming=$null
  # Keep seven daily, four weekly and six monthly recovery points; never touch
  # unrelated extensions/names. Only rotate after a successful new verified copy.
  $archives=@(Get-ChildItem -LiteralPath $resolvedRoot -File -Filter '*.jfenc' |
    Where-Object {$_.Name -match ('^'+$Environment+'-[0-9]{8}T[0-9]{6}Z\.jfenc$')} | Sort-Object Name -Descending)
  $keep=[Collections.Generic.HashSet[string]]::new()
  $daily=@{};$weekly=@{};$monthly=@{}
  foreach($archive in $archives){
    $date=[datetime]::ParseExact($archive.BaseName.Substring(5),'yyyyMMddTHHmmssZ',[Globalization.CultureInfo]::InvariantCulture)
    $day=$date.ToString('yyyyMMdd');$month=$date.ToString('yyyyMM')
    $week="$( [Globalization.ISOWeek]::GetYear($date) )-$( [Globalization.ISOWeek]::GetWeekOfYear($date) )"
    if(!$daily.ContainsKey($day) -and $daily.Count -lt 7){$daily[$day]=$true;$null=$keep.Add($archive.FullName)}
    if(!$weekly.ContainsKey($week) -and $weekly.Count -lt 4){$weekly[$week]=$true;$null=$keep.Add($archive.FullName)}
    if(!$monthly.ContainsKey($month) -and $monthly.Count -lt 6){$monthly[$month]=$true;$null=$keep.Add($archive.FullName)}
  }
  foreach($archive in $archives){
    if(!$keep.Contains($archive.FullName)){
      if([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($archive.FullName)) -ne $resolvedRoot){throw 'Retention target outside backup directory'}
      Remove-Item -LiteralPath $archive.FullName
    }
  }
  [IO.File]::WriteAllText((Join-Path $resolvedRoot 'last-success.json'),(@{utc=[datetime]::UtcNow.ToString('o');archive="$name.jfenc";restorationVerified=$true;retained=$keep.Count}|ConvertTo-Json))
} finally {
  if($incoming -and (Test-Path -LiteralPath $incoming)){Remove-Item -LiteralPath $incoming}
  if($lock){$lock.Dispose()}
}
