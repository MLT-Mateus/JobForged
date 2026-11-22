# Runs only in the signed-in Windows user's existing SSH/DPAPI context.
# Cheap queue check; a full backup runs only for an explicit pending deletion.
$ErrorActionPreference='Stop'
$pending=& ssh -n -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15 root@187.77.229.27 'docker exec supabase-db psql -XqAt -U supabase_admin -d postgres -c "select count(*) from app_private.company_deletion_jobs where state <> ''completed'' and backup_name is null;"'
if($LASTEXITCODE -ne 0){throw 'Test deletion queue unavailable'}
if(($pending -join '').Trim() -notmatch '^[0-9]+$'){throw 'Invalid queue response'}
if([int]($pending -join '') -eq 0){exit 0}
& "$PSScriptRoot/collect-test-backup.ps1" -Environment test
if($LASTEXITCODE -ne 0){throw 'Verified deletion backup failed'}
