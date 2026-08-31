import mobi, os, re

p = 'C:/Users/DELL/AppData/Local/Temp/sapph_mobi/test.mobi'
tempdir, filepath = mobi.extract(p)
print("extracted to:", tempdir)
# find the html
for root, dirs, files in os.walk(tempdir):
    for f in files:
        if f.endswith('.html') or f.endswith('.htm'):
            full = os.path.join(root, f)
            print("HTML file:", full, "size:", os.path.getsize(full))
            html = open(full, encoding='utf-8', errors='replace').read()
            clean = re.sub(r'<[^>]+>', ' ', html)
            clean = re.sub(r'\s+', ' ', clean)
            print("=== TEXT ===")
            print(clean[:2000])
            break
    else:
        continue
    break
