# Ícone do Subaru DL no estilo das extensões Subaru (azul com borda dourada e símbolo amarelo).
#   powershell -ExecutionPolicy Bypass -File .\scripts\gerar-icone.ps1
# Grava build\icon.ico (instalador e .exe) e resources\icone.png / icone-bandeja.png (janela e bandeja).
Add-Type -AssemblyName System.Drawing

function Get-Cor([string]$hex) { [Drawing.ColorTranslator]::FromHtml($hex) }

function New-Arredondado([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  $p
}

function New-Icone([int]$tamanho) {
  $s = $tamanho / 128.0
  $bmp = New-Object Drawing.Bitmap $tamanho, $tamanho
  $g = [Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.PixelOffsetMode = 'HighQuality'
  $g.Clear([Drawing.Color]::Transparent)
  $g.ScaleTransform($s, $s)

  $fundo = New-Arredondado 6 6 116 116 28
  $grad = New-Object Drawing.Drawing2D.LinearGradientBrush ([Drawing.PointF]::new(6, 6)), ([Drawing.PointF]::new(122, 122)), (Get-Cor '#3a78f2'), (Get-Cor '#0b2f8a')
  $g.FillPath($grad, $fundo)

  # Seta de download + bandeja
  $amarelo = New-Object Drawing.SolidBrush (Get-Cor '#ffd200')
  $seta = New-Object Drawing.Drawing2D.GraphicsPath
  $seta.AddPolygon([Drawing.PointF[]]@(
    [Drawing.PointF]::new(54, 24), [Drawing.PointF]::new(74, 24), [Drawing.PointF]::new(74, 58),
    [Drawing.PointF]::new(92, 58), [Drawing.PointF]::new(64, 88), [Drawing.PointF]::new(36, 58),
    [Drawing.PointF]::new(54, 58)))
  $g.FillPath($amarelo, $seta)
  $bandeja = New-Arredondado 28 94 72 12 6
  $g.FillPath($amarelo, $bandeja)

  $borda = New-Object Drawing.Pen (Get-Cor '#d9b44a'), ([Math]::Max(6, 1.4 / $s))
  $g.DrawPath($borda, $fundo)
  $g.Dispose()
  $bmp
}

function Get-Png([Drawing.Bitmap]$bmp) {
  $ms = New-Object IO.MemoryStream
  $bmp.Save($ms, [Drawing.Imaging.ImageFormat]::Png)
  # A vírgula impede o PowerShell de desmontar o byte[] em bytes soltos
  , $ms.ToArray()
}

$raiz = Split-Path $PSScriptRoot -Parent
New-Item -ItemType Directory -Force (Join-Path $raiz 'build') | Out-Null
New-Item -ItemType Directory -Force (Join-Path $raiz 'resources') | Out-Null

# .ico com várias resoluções (entradas em PNG, aceitas desde o Windows Vista)
$tamanhos = 16, 24, 32, 48, 64, 128, 256
$pngs = New-Object Collections.Generic.List[byte[]]
foreach ($t in $tamanhos) { $pngs.Add((Get-Png (New-Icone $t))) }
$ico = New-Object IO.MemoryStream
$w = New-Object IO.BinaryWriter $ico
$w.Write([UInt16]0); $w.Write([UInt16]1); $w.Write([UInt16]$tamanhos.Count)
$offset = 6 + 16 * $tamanhos.Count
for ($i = 0; $i -lt $tamanhos.Count; $i++) {
  $t = $tamanhos[$i]
  $b = if ($t -ge 256) { 0 } else { $t }
  $w.Write([byte]$b); $w.Write([byte]$b); $w.Write([byte]0); $w.Write([byte]0)
  $w.Write([UInt16]1); $w.Write([UInt16]32)
  $w.Write([UInt32]$pngs[$i].Length); $w.Write([UInt32]$offset)
  $offset += $pngs[$i].Length
}
foreach ($p in $pngs) { $w.Write($p) }
[IO.File]::WriteAllBytes((Join-Path $raiz 'build\icon.ico'), $ico.ToArray())

[IO.File]::WriteAllBytes((Join-Path $raiz 'resources\icone.png'), (Get-Png (New-Icone 256)))
[IO.File]::WriteAllBytes((Join-Path $raiz 'resources\icone-bandeja.png'), (Get-Png (New-Icone 32)))
'Icone gerado.'
