# No new service or credential. Uses the existing protected backup directory.
$ErrorActionPreference='Stop'
$tools=Join-Path $env:USERPROFILE 'JobForged-Backups/Tools'
if(!(Test-Path -LiteralPath $tools -PathType Container)){throw 'Existing protected backup tools required'}
Copy-Item -LiteralPath "$PSScriptRoot/company-deletion-backup.ps1" -Destination (Join-Path $tools 'company-deletion-backup.ps1')
$engine=(Get-Process -Id $PID).Path
$action=New-ScheduledTaskAction -Execute $engine -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -File "'+(Join-Path $tools 'company-deletion-backup.ps1')+'"') -WorkingDirectory $tools
$principal=New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$trigger=New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
$settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 20) -MultipleInstances IgnoreNew -Hidden
Register-ScheduledTask -TaskName 'JobForged-Test-Deletion-Backup' -Action $action -Principal $principal -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Output 'Test deletion backup polling installed; no accounts or companies removed.'
