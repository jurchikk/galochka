# Рисует иконки и картинку для соцсетей (og.png). Запуск: powershell -File tools/make-images.ps1
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'assets\img'
New-Item -ItemType Directory -Force $out | Out-Null

$green = [System.Drawing.Color]::FromArgb(18, 128, 90)
$ink = [System.Drawing.Color]::FromArgb(20, 22, 26)
$muted = [System.Drawing.Color]::FromArgb(90, 97, 109)
$bg = [System.Drawing.Color]::FromArgb(243, 244, 246)
$line = [System.Drawing.Color]::FromArgb(226, 229, 234)

function New-RoundRect([single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function Draw-Check($g, [single]$x, [single]$y, [single]$size, $color) {
  $pen = New-Object System.Drawing.Pen($color, [single]($size * 0.11))
  $pen.StartCap = 'Round'; $pen.EndCap = 'Round'; $pen.LineJoin = 'Round'
  $pts = @(
    (New-Object System.Drawing.PointF([single]($x + $size * 0.27), [single]($y + $size * 0.52))),
    (New-Object System.Drawing.PointF([single]($x + $size * 0.43), [single]($y + $size * 0.68))),
    (New-Object System.Drawing.PointF([single]($x + $size * 0.73), [single]($y + $size * 0.33)))
  )
  $g.DrawLines($pen, $pts)
  $pen.Dispose()
}

function New-Canvas([int]$w, [int]$h) {
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  return @{ bmp = $bmp; g = $g }
}

function Save-Icon([int]$size, [string]$name, [bool]$rounded) {
  $c = New-Canvas $size $size
  $brush = New-Object System.Drawing.SolidBrush($green)
  if ($rounded) {
    $c.g.Clear([System.Drawing.Color]::Transparent)
    $path = New-RoundRect 0 0 $size $size ($size * 0.25)
    $c.g.FillPath($brush, $path)
  } else {
    $c.g.Clear($green)
  }
  Draw-Check $c.g 0 0 $size ([System.Drawing.Color]::White)
  $c.bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $c.g.Dispose(); $c.bmp.Dispose()
}

Save-Icon 192 'icon-192.png' $true
Save-Icon 512 'icon-512.png' $true
Save-Icon 180 'apple-touch-icon.png' $false

# Картинка для соцсетей 1200x630
$c = New-Canvas 1200 630
$g = $c.g
$g.Clear($bg)

$mark = New-RoundRect 80 80 84 84 24
$g.FillPath((New-Object System.Drawing.SolidBrush($green)), $mark)
Draw-Check $g 80 80 84 ([System.Drawing.Color]::White)

$fontBrand = New-Object System.Drawing.Font('Segoe UI', 34, [System.Drawing.FontStyle]::Bold)
$fontTitle = New-Object System.Drawing.Font('Segoe UI', 66, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font('Segoe UI', 30, [System.Drawing.FontStyle]::Regular)
$fontTask = New-Object System.Drawing.Font('Segoe UI', 24, [System.Drawing.FontStyle]::Regular)
$inkBrush = New-Object System.Drawing.SolidBrush($ink)
$mutedBrush = New-Object System.Drawing.SolidBrush($muted)

$g.DrawString('Галочка', $fontBrand, $inkBrush, 184, 92)
$g.DrawString('Список задач', $fontTitle, $inkBrush, 70, 230)
$g.DrawString('онлайн', $fontTitle, $inkBrush, 70, 328)
$g.DrawString('Бесплатно и без регистрации', $fontSub, $mutedBrush, 78, 470)

# Карточка со списком справа
$card = New-RoundRect 700 110 420 410 30
$g.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)), $card)
$g.DrawPath((New-Object System.Drawing.Pen($line, 2)), $card)

$rows = @(
  @{ text = 'Купить продукты'; done = $true },
  @{ text = 'Позвонить в банк'; done = $true },
  @{ text = 'Отправить отчёт'; done = $false },
  @{ text = 'Записаться к врачу'; done = $false }
)
$y = 160
foreach ($row in $rows) {
  if ($row.done) {
    $g.FillEllipse((New-Object System.Drawing.SolidBrush($green)), 740, $y, 40, 40)
    Draw-Check $g 740 $y 40 ([System.Drawing.Color]::White)
    $g.DrawString($row.text, $fontTask, $mutedBrush, 800, ($y + 1))
  } else {
    $g.DrawEllipse((New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(195, 200, 208), 3)), 741, ($y + 1), 38, 38)
    $g.DrawString($row.text, $fontTask, $inkBrush, 800, ($y + 1))
  }
  if ($row -ne $rows[-1]) {
    $g.DrawLine((New-Object System.Drawing.Pen($line, 2)), 740, ($y + 62), 1080, ($y + 62))
  }
  $y += 86
}

$c.bmp.Save((Join-Path $out 'og.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $c.bmp.Dispose()

Get-ChildItem $out | Select-Object Name, Length
