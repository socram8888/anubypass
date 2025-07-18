
import re
import requests
import json

# Extra hosts that do not appear in the known instances list
EXTRA_HOSTS = {
	'patchwork.kernel.org',
}

# Hosts that force always JS challenges regardless of UA (and get nuked from Google Search in
# exchange lol)
DISABLED_HOSTS = {
	'canine.tools',
}

# Fetch known instances Markdown
content = requests.get("https://raw.githubusercontent.com/TecharoHQ/anubis/refs/heads/main/docs/docs/user/known-instances.md").text

# Find all matches and get unique hosts
hosts = set(re.findall(r'https?://(?:www\.)?([a-z0-9\.]+)/', content, re.IGNORECASE))

# Add extra and remove disabled
hosts = (hosts | EXTRA_HOSTS) - DISABLED_HOSTS

# Sort by length, and perform filtering of subdomains if parent is already contained
minimal_hosts = []

def is_already_covered(new_host):
	parts = new_host.split('.')
	for i in range(len(parts) - 1):
		parent_host = '.'.join(parts[i:])
		if parent_host in minimal_hosts:
			return True
	return False

for host in hosts:
	if not is_already_covered(host):
		minimal_hosts.append(host)

# Now sort alphabetically, just because they look nice
hosts = sorted(minimal_hosts)

# Inject in manifest.json
with open('manifest.json', 'r+', newline='\n') as f:
	manifest = json.load(f)

	manifest_hosts = []
	for host in hosts:
		manifest_hosts.append(f'*://{host}/*')
		manifest_hosts.append(f'*://*.{host}/*')
	manifest['host_permissions'] = manifest_hosts

	f.seek(0)
	f.truncate(0)
	json.dump(manifest, f, indent='\t')
