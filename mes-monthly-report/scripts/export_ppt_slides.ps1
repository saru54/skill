# PowerPoint Slides Export Tool
# Exports all slides of a PPTX presentation to JPG images for automated visual inspection.

param (
    [Parameter(Mandatory=$true)]
    [string]$pptxPath,

    [Parameter(Mandatory=$false)]
    [string]$outputDir = "$env:TEMP\ppt_preview"
)

if (!(Test-Path $pptxPath)) {
    Write-Error "PPTX file not found: $pptxPath"
    exit 1
}

if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
} else {
    Get-ChildItem -Path $outputDir -Filter "*.jpg" -Recurse | Remove-Item -Force
}

Write-Host "Opening PowerPoint presentation: $pptxPath"
try {
    $ppt = New-Object -ComObject PowerPoint.Application
    # Open presentation in read-only and without window
    $pres = $ppt.Presentations.Open($pptxPath, [Microsoft.Office.Core.MsoTriState]::msoTrue, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse)
    
    $slideCount = $pres.Slides.Count
    Write-Host "Successfully loaded $slideCount slides. Exporting to: $outputDir"
    
    # 17 = ppSaveAsJPG
    $pres.SaveAs($outputDir, 17)
    
    $pres.Close()
    $ppt.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($pres) | Out-Null
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
    
    # Standardize names: 幻灯片N.JPG -> slideN.jpg
    Get-ChildItem -Path $outputDir -Filter "*.JPG" | ForEach-Object {
        if ($_.Name -match '(\d+)') {
            $num = $matches[1]
            Rename-Item -Path $_.FullName -NewName "slide$num.jpg" -Force
        }
    }
    
    Write-Host "Slide export complete! Exported slides are located at: $outputDir"
} catch {
    Write-Error "Error during PowerPoint export: $($_.Exception.Message)"
    exit 1
}
