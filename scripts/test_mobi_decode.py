import struct

p = 'C:/Users/DELL/AppData/Local/Temp/sapph_mobi/test.mobi'
data = open(p, 'rb').read()
num_records = struct.unpack('>H', data[76:78])[0]
offsets = [struct.unpack('>I', data[78 + r*8 : 82 + r*8])[0] for r in range(num_records)]
rec0 = offsets[0]
text_len = struct.unpack('>I', data[rec0+4:rec0+8])[0]

def decompress(rec_data):
    out = bytearray()
    i = 0
    n = len(rec_data)
    while i < n:
        c = rec_data[i]
        i += 1
        if c == 0:
            break
        if 1 <= c <= 8:
            out += rec_data[i:i+c]
            i += c
        elif c < 0x80:
            out += rec_data[i:i+c-8]
            i += c-8
        elif c >= 0xC0:
            out.append(0x20)
            out.append(c ^ 0x80)
        else:
            if i >= n:
                break
            c2 = rec_data[i]
            i += 1
            length = (c & 0x07) + 3
            distance = ((c & 0x38) << 5) | c2
            start = len(out) - distance
            for k in range(length):
                idx = start + k
                out.append(out[idx] if 0 <= idx < len(out) else 0x20)
    return bytes(out)

# decode records 1..290 (up to first image)
full = bytearray()
for r in range(1, 291):
    if r >= len(offsets):
        break
    s = offsets[r]
    e = offsets[r+1] if r+1 < len(offsets) else len(data)
    full += decompress(data[s:e])

print("decoded 1..290:", len(full), "text_len:", text_len, "ratio:", round(len(full)/text_len, 4))
