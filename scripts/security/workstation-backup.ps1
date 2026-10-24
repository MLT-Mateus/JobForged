param(
  [Parameter(Mandatory=$true)][string]$Source,
  [Parameter(Mandatory=$true)][AllowEmptyString()][string]$Destination,
  [switch]$Verify,
  [switch]$Decrypt
)
# Authenticated, chunked AES-256-GCM envelope. Its key is sealed with Windows
# DPAPI CurrentUser. Never log key material. Keep encrypted archives outside Git.
# Recovery requires this Windows user profile/DPAPI master keys: document this
# limitation; this is not a portable/offline escrow key.
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security.Cryptography.ProtectedData
$magic=[Text.Encoding]::ASCII.GetBytes('JFBDBK01')
$inputStream=[IO.File]::OpenRead($Source)
$outputStream=$null
$key=$null
try {
  if($Decrypt){
    $reader=[IO.BinaryReader]::new($inputStream)
    if([Convert]::ToHexString($reader.ReadBytes(8)) -ne [Convert]::ToHexString($magic)){throw 'Invalid backup envelope'}
    $keySize=$reader.ReadInt32()
    if($keySize -lt 1 -or $keySize -gt 65536){throw 'Invalid protected key length'}
    $key=[Security.Cryptography.ProtectedData]::Unprotect($reader.ReadBytes($keySize),$magic,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    $aes=[Security.Cryptography.AesGcm]::new($key,16)
    if(!$Verify){$outputStream=[IO.File]::Open($Destination,[IO.FileMode]::CreateNew)}
    $hash=[Security.Cryptography.IncrementalHash]::CreateHash([Security.Cryptography.HashAlgorithmName]::SHA256)
    [long]$index=0;[long]$total=0
    while($true){
      $length=$reader.ReadInt32()
      if($length -lt 0 -or $length -gt 1048576){throw 'Invalid chunk length'}
      $nonce=$reader.ReadBytes(12);$tag=$reader.ReadBytes(16);$cipher=$reader.ReadBytes($length)
      if($nonce.Length -ne 12 -or $tag.Length -ne 16 -or $cipher.Length -ne $length){throw 'Truncated backup'}
      $plain=[byte[]]::new($length)
      $aad=[Text.Encoding]::ASCII.GetBytes("JFBDBK01/$index/$total/$length")
      $aes.Decrypt($nonce,$cipher,$tag,$plain,$aad)
      if($length -eq 0){if($inputStream.Position -ne $inputStream.Length){throw 'Unexpected trailing data'};break}
      $hash.AppendData($plain);if($outputStream){$outputStream.Write($plain,0,$length)}
      $index++;$total+=$length
    }
    [pscustomobject]@{Verified=$true;Bytes=$total;SHA256=[Convert]::ToHexString($hash.GetHashAndReset()).ToLower()}|ConvertTo-Json -Compress
  } else {
    $key=[Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
    $protected=[Security.Cryptography.ProtectedData]::Protect($key,$magic,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    $aes=[Security.Cryptography.AesGcm]::new($key,16)
    $outputStream=[IO.File]::Open($Destination,[IO.FileMode]::CreateNew)
    $writer=[IO.BinaryWriter]::new($outputStream)
    $writer.Write($magic);$writer.Write([int]$protected.Length);$writer.Write($protected)
    $buffer=[byte[]]::new(1048576);[long]$index=0;[long]$total=0
    while($true){
      $length=$inputStream.Read($buffer,0,$buffer.Length)
      $plain=[byte[]]::new($length);[Array]::Copy($buffer,$plain,$length)
      $nonce=[Security.Cryptography.RandomNumberGenerator]::GetBytes(12);$tag=[byte[]]::new(16);$cipher=[byte[]]::new($length)
      $aad=[Text.Encoding]::ASCII.GetBytes("JFBDBK01/$index/$total/$length")
      $aes.Encrypt($nonce,$plain,$cipher,$tag,$aad)
      $writer.Write([int]$length);$writer.Write($nonce);$writer.Write($tag);$writer.Write($cipher)
      if($length -eq 0){break};$index++;$total+=$length
    }
    $writer.Flush()
    [pscustomobject]@{Encrypted=$true;Bytes=$total;KeyProtection='DPAPI CurrentUser'}|ConvertTo-Json -Compress
  }
} finally {
  if($key){[Security.Cryptography.CryptographicOperations]::ZeroMemory($key)}
  if($outputStream){$outputStream.Dispose()};$inputStream.Dispose()
  if($aes){$aes.Dispose()}
}
