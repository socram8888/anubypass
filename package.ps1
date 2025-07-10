
$files = @(
	'logo',
	'background.js',
	'manifest.json',
	'rules.json',
	'reload.js'
)
$files = $files | ForEach-Object { Join-Path -Path $PSScriptRoot -ChildPath $_ } | Get-ChildItem -Recurse

Write-Host "Packaging $($files.Length) files:"

$zipFilePath = Join-Path -Path $PSScriptRoot -ChildPath 'anubypass.zip'
Remove-Item -Force $zipFilePath

$zipArchive = [System.IO.Compression.ZipFile]::Open($zipFilePath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in $files) {
        $relativePath = [System.IO.Path]::GetRelativePath($PSScriptRoot, $file)
		Write-Host " - $relativePath"
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zipArchive, $file, $relativePath, [System.IO.Compression.CompressionLevel]::Fastest) | Out-Null
    }
} finally {
    # Ensure the archive is closed properly
    $zipArchive.Dispose()
}
