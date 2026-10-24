$ErrorActionPreference='Stop'
$root=Join-Path ([IO.Path]::GetTempPath()) ('jbfd-crypto-test-'+[guid]::NewGuid().ToString('N'))
$null=New-Item -ItemType Directory -Path $root
$files=@('source.bin','archive.jfenc','restored.bin','tampered.jfenc','truncated.jfenc','trailing.jfenc')
try{
 $source=Join-Path $root 'source.bin';$archive=Join-Path $root 'archive.jfenc';$restored=Join-Path $root 'restored.bin'
 [IO.File]::WriteAllBytes($source,[Security.Cryptography.RandomNumberGenerator]::GetBytes(2500000))
 $script=Join-Path $PSScriptRoot '../scripts/security/workstation-backup.ps1'
 & $script -Source $source -Destination $archive | Out-Null
 & $script -Source $archive -Destination $restored -Decrypt | Out-Null
 if((Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath $restored).Hash){throw 'Roundtrip mismatch'}
 $bytes=[IO.File]::ReadAllBytes($archive)
 $changed=[byte[]]$bytes.Clone();$changed[$changed.Length-1]=$changed[$changed.Length-1] -bxor 1
 [IO.File]::WriteAllBytes((Join-Path $root 'tampered.jfenc'),$changed)
 [IO.File]::WriteAllBytes((Join-Path $root 'truncated.jfenc'),[byte[]]$bytes[0..($bytes.Length-2)])
 [IO.File]::WriteAllBytes((Join-Path $root 'trailing.jfenc'),[byte[]]($bytes+[byte]0))
 foreach($name in @('tampered.jfenc','truncated.jfenc','trailing.jfenc')){
  $rejected=$false
  try{& $script -Source (Join-Path $root $name) -Destination '' -Decrypt -Verify | Out-Null}catch{$rejected=$true}
  if(!$rejected){throw "Invalid envelope accepted: $name"}
 }
 [pscustomobject]@{Roundtrip=$true;TamperingRejected=$true;TruncationRejected=$true;TrailingDataRejected=$true}|ConvertTo-Json -Compress
}finally{
 foreach($name in $files){$path=Join-Path $root $name;if(Test-Path -LiteralPath $path){Remove-Item -LiteralPath $path}}
 Remove-Item -LiteralPath $root
}
