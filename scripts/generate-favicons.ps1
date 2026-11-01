Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\dencapvision\.gemini\antigravity\brain\fa20fd65-a463-4804-b068-0fb829599a1f\.user_uploaded\media_1793577264880_7b507247.jpg"
$publicDir = "e:\00.1_DenD3v_AI\69_DenD3v_14) KRUDEN-Speaking-Studio\public"

if (!(Test-Path $publicDir)) {
    New-Item -ItemType Directory -Path $publicDir -Force | Out-Null
}

# Copy original image to public as denmasterfa.jpg and og-image.jpg
Copy-Item -Path $srcPath -Destination "$publicDir\denmasterfa.jpg" -Force
Copy-Item -Path $srcPath -Destination "$publicDir\og-image.jpg" -Force

$srcImg = [System.Drawing.Image]::FromFile($srcPath)
Write-Host "Source Image: $($srcImg.Width) x $($srcImg.Height)"

# We want to crop Kru Den's face nicely for a square favicon (focus on face & microphone)
# Original image is roughly 900x990 or similar portrait. Let's inspect square crop.
$minDim = [Math]::Min($srcImg.Width, $srcImg.Height)
# Face is slightly above center and horizontally centered
$cropX = [Math]::Max(0, [int](($srcImg.Width - $minDim) / 2))
$cropY = [Math]::Max(0, [int](($srcImg.Height - $minDim) * 0.15)) # slightly higher to catch face

# Create cropped square
$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $minDim, $minDim)
$squareBmp = New-Object System.Drawing.Bitmap($minDim, $minDim)
$g = [System.Drawing.Graphics]::FromImage($squareBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($srcImg, (New-Object System.Drawing.Rectangle(0, 0, $minDim, $minDim)), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

# Function to save resized icon
function Save-Resized($bmp, $size, $destPath) {
    $resized = New-Object System.Drawing.Bitmap($size, $size)
    $gr = [System.Drawing.Graphics]::FromImage($resized)
    $gr.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gr.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gr.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $gr.DrawImage($bmp, 0, 0, $size, $size)
    $gr.Dispose()
    $resized.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose()
    Write-Host "Saved: $destPath ($size x $size)"
}

Save-Resized $squareBmp 32 "$publicDir\favicon-32x32.png"
Save-Resized $squareBmp 64 "$publicDir\favicon-64x64.png"
Save-Resized $squareBmp 180 "$publicDir\apple-touch-icon.png"
Save-Resized $squareBmp 192 "$publicDir\android-chrome-192x192.png"
Save-Resized $squareBmp 512 "$publicDir\android-chrome-512x512.png"
Save-Resized $squareBmp 32 "$publicDir\favicon.png"

# Also save favicon.ico
$icoStream = [System.IO.File]::OpenWrite("$publicDir\favicon.ico")
$iconBmp = New-Object System.Drawing.Bitmap($squareBmp, 32, 32)
$hIcon = $iconBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$icon.Save($icoStream)
$icoStream.Close()
$icon.Dispose()
$iconBmp.Dispose()
Write-Host "Saved: $publicDir\favicon.ico"

$squareBmp.Dispose()
$srcImg.Dispose()
Write-Host "Favicons generated successfully!"
