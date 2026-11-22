param(
  [Parameter(Mandatory=$true)][ValidateSet('test','live')][string]$Environment,
  [Parameter(Mandatory=$true)][string]$Source,
  [Parameter(Mandatory=$true)][AllowEmptyString()][string]$Destination,
  [switch]$Verify,
  [string]$KeyRoot=(Join-Path ([Environment]::GetFolderPath('UserProfile')) 'JobForged-Backups\Keys')
)
$ErrorActionPreference='Stop'
if([string]::IsNullOrWhiteSpace($Destination) -and !$Verify){throw 'Destination is required unless verifying only'}
Add-Type -AssemblyName System.Security.Cryptography.ProtectedData
$magic=[Text.Encoding]::ASCII.GetBytes('JFBENC01')
$privatePath=Join-Path ([IO.Path]::GetFullPath($KeyRoot)) ($Environment+'-private.dpapi')
if(!(Test-Path -LiteralPath $privatePath -PathType Leaf)){throw 'The local DPAPI recovery key is missing'}
$sourceStream=[IO.File]::OpenRead($Source)
$outputStream=$null
$privateBytes=$null
$protected=$null
$aesKey=$null
$rsa=$null
$createdDestination=$false
try {
  $reader=[IO.BinaryReader]::new($sourceStream)
  if([Convert]::ToHexString($reader.ReadBytes(8)) -ne [Convert]::ToHexString($magic)){throw 'Invalid backup envelope'}
  $wrappedLength=$reader.ReadInt32()
  if($wrappedLength -lt 256 -or $wrappedLength -gt 16384){throw 'Invalid wrapped key length'}
  $wrapped=$reader.ReadBytes($wrappedLength)
  if($wrapped.Length -ne $wrappedLength){throw 'Truncated wrapped key'}
  $protected=[IO.File]::ReadAllBytes($privatePath)
  $entropy=[Text.Encoding]::UTF8.GetBytes('JobForged/offsite/'+$Environment+'/v1')
  $privateBytes=[Security.Cryptography.ProtectedData]::Unprotect($protected,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  $rsa=[Security.Cryptography.RSA]::Create()
  $bytesRead=0
  $rsa.ImportPkcs8PrivateKey($privateBytes,[ref]$bytesRead)
  if($bytesRead -ne $privateBytes.Length){throw 'Invalid private key data'}
  $aesKey=$rsa.Decrypt($wrapped,[Security.Cryptography.RSAEncryptionPadding]::OaepSHA256)
  if($aesKey.Length -ne 32){throw 'Invalid AES key size'}
  $aes=[Security.Cryptography.AesGcm]::new($aesKey,16)
  if(!$Verify){
    $outputStream=[IO.File]::Open($Destination,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
    $createdDestination=$true
    $fileAcl=Get-Acl -LiteralPath $Destination
    $fileAcl.SetAccessRuleProtection($true,$false)
    foreach($rule in @($fileAcl.Access)){$fileAcl.RemoveAccessRuleAll($rule)}
    foreach($identity in @([Security.Principal.WindowsIdentity]::GetCurrent().User,[Security.Principal.SecurityIdentifier]::new('S-1-5-18'))){
      $fileAcl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($identity,[Security.AccessControl.FileSystemRights]::FullControl,[Security.AccessControl.AccessControlType]::Allow))
    }
    [IO.FileSystemAclExtensions]::SetAccessControl([IO.FileInfo]::new($Destination),$fileAcl)
  }
  $hash=[Security.Cryptography.IncrementalHash]::CreateHash([Security.Cryptography.HashAlgorithmName]::SHA256)
  [long]$index=0;[long]$total=0
  while($true){
    $length=$reader.ReadInt32()
    if($length -lt 0 -or $length -gt 1048576){throw 'Invalid encrypted chunk length'}
    $nonce=$reader.ReadBytes(12);$tag=$reader.ReadBytes(16);$cipher=$reader.ReadBytes($length)
    if($nonce.Length -ne 12 -or $tag.Length -ne 16 -or $cipher.Length -ne $length){throw 'Truncated encrypted chunk'}
    $plain=[byte[]]::new($length)
    $aad=[Text.Encoding]::ASCII.GetBytes("JFBENC01/$index/$total/$length")
    $aes.Decrypt($nonce,$cipher,$tag,$plain,$aad)
    if($length -eq 0){
      if($sourceStream.Position -ne $sourceStream.Length){throw 'Unexpected data after final authentication chunk'}
      break
    }
    $hash.AppendData($plain)
    if($outputStream){$outputStream.Write($plain,0,$length)}
    [Security.Cryptography.CryptographicOperations]::ZeroMemory($plain)
    $index++;$total+=$length
  }
  if($outputStream){$outputStream.Flush($true)}
  [pscustomobject]@{Verified=$true;Environment=$Environment;Bytes=$total;SHA256=[Convert]::ToHexString($hash.GetHashAndReset()).ToLower()}|ConvertTo-Json -Compress
} catch {
  if($createdDestination -and $Destination -and (Test-Path -LiteralPath $Destination)){Remove-Item -LiteralPath $Destination -Force -ErrorAction SilentlyContinue}
  throw
} finally {
  if($aesKey){[Security.Cryptography.CryptographicOperations]::ZeroMemory($aesKey)}
  if($privateBytes){[Security.Cryptography.CryptographicOperations]::ZeroMemory($privateBytes)}
  if($protected){[Security.Cryptography.CryptographicOperations]::ZeroMemory($protected)}
  if($outputStream){$outputStream.Dispose()}
  if($aes){$aes.Dispose()}
  if($rsa){$rsa.Dispose()}
  $sourceStream.Dispose()
}
