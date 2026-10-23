import sys
from PIL import Image
from collections import Counter

def load(p):
    return Image.open(p).convert('RGB')

def hist(im, box=None, top=6):
    c = Counter(im.crop(box).getdata() if box else im.getdata())
    tot = sum(c.values())
    out = []
    for col, n in c.most_common(top):
        out.append(f"#{col[0]:02X}{col[1]:02X}{col[2]:02X} {100*n/tot:5.1f}%")
    return out

def row_scan(im, y, x1, x2, step=6):
    """Print RGB along a horizontal scanline - reveals neumorphic shadow gradients."""
    px = im.load()
    return [(x, px[x, y]) for x in range(x1, x2, step)]

for name in ('Day', 'Night', 'Blackout'):
    p = f'C:/Users/DELL/BookReader/theme_{name}.png'
    im = load(p)
    W, H = im.size
    print(f'===== {name} ===== {W}x{H}')
    print('  modal bg (x540,y983):', '#%02X%02X%02X' % im.getpixel((540, 983)))
    print('  screen bg (x20,y1400):', '#%02X%02X%02X' % im.getpixel((20, 1400)))
    print('  top colors:', ' | '.join(hist(im, (60, 900, 1020, 1500), 5)))
    # segmented control row: Day/Night/Blackout buttons around y=1073
    for label, xc in (('DayBtn', 224), ('NightBtn', 541), ('BlackoutBtn', 857)):
        r = row_scan(im, 1073, xc - 40, xc + 40, 10)
        print(f'  {label:11s}', ' '.join(f'{x}:{r_}' for x, r_ in r))
    print()
