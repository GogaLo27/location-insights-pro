param(
  [string]$src = "client/public/logo.png",
  [string]$dstPng = "client/public/fav.png",
  [string]$dstIco = "client/public/favicon.ico"
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $src)) {
  Write-Error "Source image not found: $src"
  exit 1
}

$img = [System.Drawing.Image]::FromFile((Resolve-Path $src))
$bmp = New-Object System.Drawing.Bitmap 32,32
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img,0,0,32,32)
$bmp.Save((Resolve-Path $dstPng), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
$img.Dispose()

Copy-Item -Force (Resolve-Path $dstPng) (Resolve-Path $dstIco)
Write-Host "Wrote $dstPng and copied to $dstIco"
