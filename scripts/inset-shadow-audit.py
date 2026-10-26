from PIL import Image

def hexs(c): return '#%02X%02X%02X' % c

for name in ('Day', 'Night', 'Blackout'):
    im = Image.open(f'C:/Users/DELL/Sapphire/theme_{name}.png').convert('RGB')
    px = im.load()
    bg = px[540, 983]  # modal surface = reference background
    print(f'===== {name} =====  modal bg {hexs(bg)}')
    # vertical scan through the middle of the UNSELECTED "Night" segmented button
    # look for the inset border: darker edge (top/left) + lighter edge (bottom/right)
    print('  --- vertical scan x=510 (Night btn, text-free column) ---')
    for y in range(1015, 1130, 4):
        c = px[510, y]
        d = sum(c) - sum(bg)
        mark = ''
        if d > 25:  mark = ' <-- LIGHTER than bg (light shadow/rim)'
        elif d < -25: mark = ' <-- DARKER than bg  (dark shadow/rim)'
        print(f'    y={y}  {hexs(c)}  delta={d:+4d}{mark}')
    # horizontal scan across right edge of that button (right = light rim expected)
    print('  --- horizontal scan y=1040 (top band, above glyphs) x=430..640 ---')
    for x in range(430, 640, 10):
        c = px[x, 1040]
        d = sum(c) - sum(bg)
        mark = ''
        if d > 25: mark = ' <-- LIGHTER'
        elif d < -25: mark = ' <-- DARKER'
        print(f'    x={x}  {hexs(c)}  delta={d:+4d}{mark}')
    print()
