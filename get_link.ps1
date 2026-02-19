$logFile = "tunnel.log"
# Clear previous log
if (Test-Path $logFile) { Remove-Item $logFile }

Write-Host "Starting Cloudflare Tunnel..." -ForegroundColor Cyan
Write-Host "Scanning for public URL..." -ForegroundColor Yellow

# Start cloudflared in background, redirecting stderr (where logs go) to file
$process = Start-Process -FilePath ".\cloudflared.exe" -ArgumentList "tunnel --url http://localhost:5001" -RedirectStandardError $logFile -PassThru -NoNewWindow

$urlFound = $false
$timeout = 0

# Loop to check log file for URL
while (-not $urlFound -and $timeout -lt 60) {
    Start-Sleep -Seconds 1
    $timeout++
    
    if (Test-Path $logFile) {
        # Read file with sharing enabled (safely)
        $content = Get-Content $logFile -ErrorAction SilentlyContinue
        
        # Regex to find the trycloudflare URL
        $match = $content | Select-String "https://[-a-z0-9]+\.trycloudflare\.com" | Select-Object -First 1
        
        if ($match) {
            $url = $match.Matches.Value
            Clear-Host
            Write-Host "`n============================================================" -ForegroundColor Green
            Write-Host "   SUCCESS! YOUR APP IS ONLINE" -ForegroundColor Green
            Write-Host "============================================================" -ForegroundColor Green
            Write-Host "`n   PUBLIC LINK: " -NoNewline -ForegroundColor White
            Write-Host "$url" -ForegroundColor Cyan -BackgroundColor DarkBlue
            Write-Host "`n   (Share this link with anyone to access the app)" -ForegroundColor Gray
            Write-Host "`n============================================================" -ForegroundColor Green
            Write-Host "Press Ctrl+C to stop the tunnel." -ForegroundColor Yellow
            $urlFound = $true
        }
    }
}

if (-not $urlFound) {
    Write-Host "Timeout waiting for URL. Check tunnel.log for details." -ForegroundColor Red
}

# Keep the script running so the tunnel stays open
if (-not $process.HasExited) {
    $process.WaitForExit()
}
