import zipfile
import json
import copy
from pathlib import Path

sr = Path(__file__).parent

manifest_file = sr / 'manifest.json'

with open(manifest_file, 'r') as f:
	manifest_json = json.load(f)

files_to_add = [
	manifest_file,
	sr / 'background.js',
	sr / 'logo' / 'thumb_16.png',
	sr / 'logo' / 'thumb_128.png',
]

for browser in ("firefox", "chrome"):
	zip_filename = f'anubypass-{browser}.zip'

	# Remove existing zip file if it exists
	zip_path = sr / zip_filename
	if zip_path.exists():
		zip_path.unlink()

	print(f"Creating {zip_filename}:")
	with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=1) as zipf:
		for abs_path in files_to_add:
			rel_path = abs_path.relative_to(sr)
			print(f" - {rel_path}")

			if abs_path == manifest_file:
				modified_manifest = copy.deepcopy(manifest_json)

				if browser == "firefox":
					# FF uses "scripts" key
					del modified_manifest['background']['service_worker']
				else:
					# Chromium uses "service_worker"
					del modified_manifest['background']['scripts']
					# Delete Firefox's stupid key too
					del modified_manifest['browser_specific_settings']

				zipf.writestr('manifest.json', json.dumps(modified_manifest, indent='\t'))
			else:
				zipf.write(abs_path, arcname=rel_path)

	print(f"{zip_filename} created.")
