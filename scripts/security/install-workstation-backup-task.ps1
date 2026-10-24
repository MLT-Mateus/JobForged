param([string]$EnginePath=[Environment]::ProcessPath)
$ErrorActionPreference='Stop'
if($PSVersionTable.PSVersion.Major -lt 7){throw 'PowerShell 7 is required for authenticated encryption'}
# Use a normal profile directory, outside AppData package virtualization and
# outside OneDrive/Git, so the Windows scheduler sees the same files.
$profileRoot=[IO.Path]::GetFullPath([Environment]::GetFolderPath('UserProfile'))
$base=[IO.Path]::GetFullPath((Join-Path $profileRoot 'JobForged-Backups'))
if((Test-Path -LiteralPath $base) -and ((Get-Item -LiteralPath $base).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Backup directory cannot be a redirected link'}
[IO.Directory]::CreateDirectory($base)|Out-Null
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
$acl=Get-Acl -LiteralPath $base
$acl.SetAccessRuleProtection($true,$false)
foreach($rule in @($acl.Access)){$acl.RemoveAccessRuleAll($rule)}
$inherit=[Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit'
foreach($identity in @($sid,[Security.Principal.SecurityIdentifier]::new('S-1-5-18'))){
 $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($identity,[Security.AccessControl.FileSystemRights]::FullControl,$inherit,[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Allow))
}
[IO.FileSystemAclExtensions]::SetAccessControl([IO.DirectoryInfo]::new($base),$acl)
$tools=Join-Path $base 'Tools';$destination=Join-Path $base 'Test'
[IO.Directory]::CreateDirectory($tools)|Out-Null
[IO.Directory]::CreateDirectory($destination)|Out-Null
foreach($name in @('collect-test-backup.ps1','workstation-backup.ps1')){
 $source=Join-Path $PSScriptRoot $name;$target=Join-Path $tools $name
 if([IO.Path]::GetFullPath($source) -ne [IO.Path]::GetFullPath($target)){Copy-Item -LiteralPath $source -Destination $target}
}
$engine=[IO.Path]::GetFullPath($EnginePath)
if(!(Test-Path -LiteralPath $engine -PathType Leaf)){throw 'PowerShell runtime missing'}
$collector=Join-Path $tools 'collect-test-backup.ps1'
$action=New-ScheduledTaskAction -Execute $engine -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -File "'+$collector+'"') -WorkingDirectory $tools
$principal=New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$trigger=New-ScheduledTaskTrigger -Daily -At '03:00'
$settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 20) -MultipleInstances IgnoreNew -Hidden
Register-ScheduledTask -TaskName 'JobForged-Test-Encrypted-Backup' -Action $action -Principal $principal -Trigger $trigger -Settings $settings -Force|Out-Null
[pscustomobject]@{Task='JobForged-Test-Encrypted-Backup';Destination=$destination;Encryption='AES-256-GCM / DPAPI CurrentUser';RequiresSignedInUser=$true}|ConvertTo-Json
