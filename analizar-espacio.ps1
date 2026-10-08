# Analiza el espacio en disco. NO borra nada, solo mide.
$ErrorActionPreference = 'SilentlyContinue'
$informe = Join-Path ([Environment]::GetFolderPath('Desktop')) 'informe-espacio.txt'
Start-Transcript $informe | Out-Null
function Size($p){ [math]::Round(((Get-ChildItem $p -Recurse -Force -File | Measure-Object Length -Sum).Sum)/1GB,2) }

Write-Host "Analizando, puede tardar unos minutos..."

"===== ESPACIO EN DISCO ====="
Get-PSDrive -PSProvider FileSystem | Select-Object Name,
  @{n='UsadoGB';e={[math]::Round($_.Used/1GB,1)}},
  @{n='LibreGB';e={[math]::Round($_.Free/1GB,1)}} | Format-Table | Out-String

"===== CARPETAS DEL USUARIO (GB) ====="
Get-ChildItem $env:USERPROFILE -Directory -Force | ForEach-Object {
  [pscustomobject]@{Carpeta=$_.Name; GB=Size $_.FullName} } |
  Sort-Object GB -Descending | Select-Object -First 15 | Format-Table | Out-String

"===== TEMPORALES Y CACHES (GB) ====="
$rutas = [ordered]@{
  'Temp usuario'   = $env:TEMP
  'Temp Windows'   = "$env:windir\Temp"
  'Windows Update' = "$env:windir\SoftwareDistribution\Download"
  'Cache Chrome'   = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
  'Cache Edge'     = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache"
  'Papelera'       = 'C:\$Recycle.Bin'
}
$rutas.GetEnumerator() | ForEach-Object {
  [pscustomobject]@{Ubicacion=$_.Key; GB=Size $_.Value} } | Format-Table | Out-String

"===== DESCARGAS POR TIPO DE ARCHIVO ====="
$descargas = (New-Object -ComObject Shell.Application).NameSpace('shell:Downloads').Self.Path
if (-not $descargas) { $descargas = "$env:USERPROFILE\Downloads" }
Get-ChildItem $descargas -Recurse -File -Force |
  Group-Object Extension | ForEach-Object {
  [pscustomobject]@{Tipo=$_.Name; Archivos=$_.Count;
    GB=[math]::Round(($_.Group | Measure-Object Length -Sum).Sum/1GB,2)} } |
  Sort-Object GB -Descending | Select-Object -First 15 | Format-Table | Out-String

"===== 30 ARCHIVOS MAS GRANDES ====="
Get-ChildItem $env:USERPROFILE -Recurse -File -Force |
  Sort-Object Length -Descending | Select-Object -First 30 @{n='GB';e={[math]::Round($_.Length/1GB,2)}}, LastWriteTime, FullName |
  Format-Table -AutoSize -Wrap | Out-String -Width 300

Stop-Transcript | Out-Null
Write-Host ""
Write-Host "Listo. Informe guardado en: $informe"
Read-Host "Pulsa Enter para cerrar"
