
# Known instances Markdown
$url = "https://raw.githubusercontent.com/TecharoHQ/anubis/refs/heads/main/docs/docs/user/known-instances.md"

# Download the content
$content = Invoke-WebRequest -Uri $url -UseBasicParsing | Select-Object -ExpandProperty Content

# Regular expression to match URLs (http or https)
$regex = 'https?://(?:www\.)?([a-z0-9\.]+)/'

# Find all matches
$hosts = ([regex]::Matches($content, $regex) | ForEach-Object { "`t'$($_.Groups[1].Value)'," } | Sort-Object -Unique) -join "`n"

# Load current contents
$jsContent = Get-Content "background.js" -Raw

# ?s = . matches newlines too
$pattern = '(?s)(// STARTS KNOWN HOSTS)(.*?)(// ENDS KNOWN HOSTS)'
$replacement = "`$1`n$hosts`n`t`$3"
$updatedJsContent = [regex]::Replace($jsContent, $pattern, $replacement)

# Now write new content
Set-Content -Path "background.js" -Value $updatedJsContent
