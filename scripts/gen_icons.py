import struct, zlib, math, os

def make_png(path, size):
    w = h = size
    bg = (30, 111, 217)  # aegean-500
    white = (255, 255, 255)
    cx, cy = w * 0.5, h * 0.36
    sun_r = w * 0.16

    rows = []
    for y in range(h):
        row = bytearray()
        row.append(0)  # filter type 0
        for x in range(w):
            # rounded-square mask (superellipse-ish) for the app icon shape
            r = w * 0.22
            dx = max(0 - x, x - (w - 1), 0)
            nx = min(max(x, r), w - 1 - r)
            ny = min(max(y, r), h - 1 - r)
            dist_corner = math.hypot(x - nx, y - ny)
            inside_icon = dist_corner <= r

            if not inside_icon:
                # transparent-ish -> just use white outside (maskable safe zone)
                px = white
            else:
                # sun circle
                d_sun = math.hypot(x - cx, y - cy)
                # waves: 3 bands near bottom
                wave_val = math.sin((x / w) * math.pi * 3 + 0) * (h * 0.02)
                band1 = h * 0.62 + wave_val
                band2 = h * 0.74 + wave_val
                band3 = h * 0.86 + wave_val
                thickness = h * 0.035

                if d_sun <= sun_r:
                    px = white
                elif abs(y - band1) < thickness or abs(y - band2) < thickness or abs(y - band3) < thickness:
                    px = white
                else:
                    px = bg
            row.extend(px)
        rows.append(bytes(row))

    raw = b"".join(rows)
    compressed = zlib.compress(raw, 9)

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", compressed) + chunk(b"IEND", b"")

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(png)
    print("wrote", path)

make_png("public/icons/icon-192.png", 192)
make_png("public/icons/icon-512.png", 512)
