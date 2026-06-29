#!/usr/bin/env python3
"""Erzeugt simple geometrische App-Icons (dunkler Grund + Akzent-Raute).
Reine Standardbibliothek (zlib/struct), kein Pillow noetig."""
import struct, zlib, os

BG = (0x0A, 0x0A, 0x0B, 255)
ACCENT = (0x5E, 0x8F, 0xFF, 255)


def write_png(path, w, h, frac):
    cx = cy = w / 2.0
    R = w * frac
    raw = bytearray()
    for y in range(h):
        raw.append(0)  # Filtertyp 0
        for x in range(w):
            # Raute (rotiertes Quadrat): |dx| + |dy| <= R
            if abs(x + 0.5 - cx) + abs(y + 0.5 - cy) <= R:
                raw += bytes(ACCENT)
            else:
                raw += bytes(BG)
    comp = zlib.compress(bytes(raw), 9)

    def chunk(typ, data):
        return (struct.pack(">I", len(data)) + typ + data +
                struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff))

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    with open(path, "wb") as f:
        f.write(sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", comp) + chunk(b"IEND", b""))
    print("geschrieben:", path)


here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, "..", "icons")
os.makedirs(out, exist_ok=True)
write_png(os.path.join(out, "icon-192.png"), 192, 192, 0.34)
write_png(os.path.join(out, "icon-512.png"), 512, 512, 0.34)
write_png(os.path.join(out, "icon-512-maskable.png"), 512, 512, 0.27)
