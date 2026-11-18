# Saves a PNG of the Lens Studio window for the development timeline.
# Usage: powershell -ExecutionPolicy Bypass -File capture-lens-studio.ps1 -Name "01_blocky-cafe_counter-view"
param([Parameter(Mandatory = $true)][string]$Name)

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class WinCap {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
"@
[void][WinCap]::SetProcessDPIAware()   # real pixel sizes on scaled displays

$proc = Get-Process -Name "Lens Studio" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $proc) { throw "Lens Studio window not found" }
$h = $proc.MainWindowHandle
$wasMinimized = [WinCap]::IsIconic($h)
if ($wasMinimized) {
  [void][WinCap]::ShowWindowAsync($h, 4)   # 4 = SW_SHOWNOACTIVATE: restore without stealing focus
  Start-Sleep -Milliseconds 1500           # let the panels repaint
}

$r = New-Object WinCap+RECT
[void][WinCap]::GetWindowRect($h, [ref]$r)
$w = $r.R - $r.L; $hgt = $r.B - $r.T
$bmp = New-Object System.Drawing.Bitmap $w, $hgt
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
[void][WinCap]::PrintWindow($h, $hdc, 2)   # 2 = PW_RENDERFULLCONTENT (captures GPU-rendered panels)
$g.ReleaseHdc($hdc); $g.Dispose()
if ($wasMinimized) { [void][WinCap]::ShowWindowAsync($h, 7) }   # 7 = SW_SHOWMINNOACTIVE: minimize again

$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$out = Join-Path $PSScriptRoot "$stamp`_$Name.png"
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output $out
