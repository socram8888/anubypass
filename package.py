import zipfile
from pathlib import Path

sr = Path(__file__).parent

files_to_add = [
	sr / 'background.js',
	sr / 'manifest.json',
	sr / 'logo' / 'thumb_16.png',
	sr / 'logo' / 'thumb_128.png',
]

zip_file_path = sr / 'anubypass.zip'

# Remove existing zip file if it exists
if zip_file_path.exists():
	zip_file_path.unlink()

with zipfile.ZipFile(zip_file_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=1) as zipf:
	for abs_path in files_to_add:
		rel_path = abs_path.relative_to(sr)
		print(f" - {rel_path}")
		zipf.write(abs_path, arcname=rel_path)

print("Packaging complete.")
