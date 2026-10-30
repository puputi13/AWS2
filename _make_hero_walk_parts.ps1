Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$srcPath = Join-Path $root 'hero_ready.png'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)

function New-Path([string[]]$coords) {
  $points = foreach ($p in $coords) { $xy=$p.Split(','); [System.Drawing.PointF]::new([single]$xy[0], [single]$xy[1]) }
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddPolygon([System.Drawing.PointF[]]$points)
  return $path
}
function New-Part([System.Drawing.Drawing2D.GraphicsPath]$path, [string]$name) {
  $bmp = [System.Drawing.Bitmap]::new($src.Width, $src.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $g.SetClip($path)
  $g.DrawImageUnscaled($src, 0, 0)
  $g.Dispose()
  $bmp.Save((Join-Path $root $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

# 剣士の画面左脚・右脚。上端は上着で隠れる位置に置き、武器とコート裾を避ける。
[string[]]$leftCoords = '278,432','348,426','371,474','353,526','334,575','368,644','354,690','296,713','220,690','204,651','244,584','262,520'
$leftPath = New-Path -coords $leftCoords
[string[]]$rightCoords = '350,430','417,419','446,465','451,526','486,584','559,666','552,710','493,738','418,722','393,660','359,587','344,505'
$rightPath = New-Path -coords $rightCoords

New-Part $leftPath 'hero_walk_leg_left.png'
New-Part $rightPath 'hero_walk_leg_right.png'

# 胴体は元画像から脚領域だけを透明化。停止時はこの画像ではなく元PNGを使う。
$body = [System.Drawing.Bitmap]::new($src.Width, $src.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($body)
$g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$g.DrawImageUnscaled($src, 0, 0)
$g.SetClip($leftPath)
$g.Clear([System.Drawing.Color]::Transparent)
$g.ResetClip()
$g.SetClip($rightPath)
$g.Clear([System.Drawing.Color]::Transparent)
$g.Dispose()
$body.Save((Join-Path $root 'hero_walk_body.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$body.Dispose()
$leftPath.Dispose(); $rightPath.Dispose(); $src.Dispose()
Write-Output 'Created hero_walk_body.png, hero_walk_leg_left.png, hero_walk_leg_right.png'
