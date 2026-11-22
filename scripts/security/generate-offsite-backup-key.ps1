param(
  [Parameter(Mandatory=$true)][ValidateSet('test','live')][string]$Environment,
  [string]$KeyRoot=(Join-Path ([Environment]::GetFolderPath('UserProfile')) 'JobForged-Backups\Keys')
)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security.Cryptography.ProtectedData
$root=[IO.Path]::GetFullPath($KeyRoot)
[IO.Directory]::CreateDirectory($root)|Out-Null
if((Get-Item -LiteralPath $root).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Key directory cannot be a redirected link'}
$privatePath=Join-Path $root ($Environment+'-private.dpapi')
$publicPath=Join-Path $root ($Environment+'-public.pem')
if((Test-Path -LiteralPath $privatePath) -or (Test-Path -LiteralPath $publicPath)){throw 'Refusing to overwrite an existing recovery key'}
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
$acl=Get-Acl -LiteralPath $root
$acl.SetAccessRuleProtection($true,$false)
foreach($rule in @($acl.Access)){$acl.RemoveAccessRuleAll($rule)}
$inherit=[Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit'
foreach($identity in @($sid,[Security.Principal.SecurityIdentifier]::new('S-1-5-18'))){
  $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($identity,[Security.AccessControl.FileSystemRights]::FullControl,$inherit,[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Allow))
}
[IO.FileSystemAclExtensions]::SetAccessControl([IO.DirectoryInfo]::new($root),$acl)
$rsa=[Security.Cryptography.RSA]::Create(3072)
$privateBytes=$null
$protected=$null
$publicBytes=$null
try {
  $privateBytes=$rsa.ExportPkcs8PrivateKey()
  $entropy=[Text.Encoding]::UTF8.GetBytes('JobForged/offsite/'+$Environment+'/v1')
  $protected=[Security.Cryptography.ProtectedData]::Protect($privateBytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  $publicText=$rsa.ExportSubjectPublicKeyInfoPem()
  $publicBytes=[Text.Encoding]::UTF8.GetBytes($publicText)
  $privateStream=[IO.File]::Open($privatePath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try{$privateStream.Write($protected,0,$protected.Length);$privateStream.Flush($true)}finally{$privateStream.Dispose()}
  $publicStream=[IO.File]::Open($publicPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try{$publicStream.Write($publicBytes,0,$publicBytes.Length);$publicStream.Flush($true)}finally{$publicStream.Dispose()}
  $publicHash=[Security.Cryptography.SHA256]::HashData($publicBytes)
  [pscustomobject]@{Environment=$Environment;PrivateKey=$privatePath;PublicKey=$publicPath;PublicKeyFingerprint=[Convert]::ToHexString($publicHash).ToLower()}|ConvertTo-Json -Compress
} catch {
  Remove-Item -LiteralPath $privatePath,$publicPath -Force -ErrorAction SilentlyContinue
  throw
} finally {
  if($privateBytes){[Security.Cryptography.CryptographicOperations]::ZeroMemory($privateBytes)}
  if($protected){[Security.Cryptography.CryptographicOperations]::ZeroMemory($protected)}
  if($publicBytes){[Security.Cryptography.CryptographicOperations]::ZeroMemory($publicBytes)}
  $rsa.Dispose()
}
