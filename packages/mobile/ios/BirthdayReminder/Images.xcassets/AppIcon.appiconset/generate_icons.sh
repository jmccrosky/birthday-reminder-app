#!/bin/bash

# Create a base 1024x1024 icon using sips
# First create a simple colored PNG using Apple's built-in tools

# Use sf symbols or create via iconutil
# For simplicity, let's create using a solid color first

# Create base image using Apple's iconutil format
mkdir -p /tmp/AppIcon.iconset

# Create all sizes using sips by starting with a simple image
# We'll create a base pink square
python3 << 'PYEOF'
import struct

def create_png(filename, width, height, color):
    """Create a simple PNG file with solid color"""
    # PNG signature
    png_sig = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr_crc = 0x9c # Simplified for solid color
    ihdr = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', 0)
    
    # For simplicity, let's use a different approach
    # Create SVG and convert
    pass

# Actually, let's just download a placeholder from a public source or create minimal PNG
import base64

# Minimal 1x1 pink PNG (base64 encoded)
pink_png_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

# Decode and write
with open('/tmp/base_icon.png', 'wb') as f:
    f.write(base64.b64decode(pink_png_base64))
    
print("Created base icon")
PYEOF

# Now scale it to all required sizes
sips -z 1024 1024 /tmp/base_icon.png --out icon_1024x1024.png
sips -z 40 40 icon_1024x1024.png --out icon_20x20@2x.png
sips -z 60 60 icon_1024x1024.png --out icon_20x20@3x.png
sips -z 58 58 icon_1024x1024.png --out icon_29x29@2x.png
sips -z 87 87 icon_1024x1024.png --out icon_29x29@3x.png
sips -z 80 80 icon_1024x1024.png --out icon_40x40@2x.png
sips -z 120 120 icon_1024x1024.png --out icon_40x40@3x.png
sips -z 120 120 icon_1024x1024.png --out icon_60x60@2x.png
sips -z 180 180 icon_1024x1024.png --out icon_60x60@3x.png

echo "Icons created!"
ls -lh icon_*.png
