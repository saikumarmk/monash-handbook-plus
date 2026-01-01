#!/usr/bin/env python3
"""Generate PWA icons from logo.png"""

from PIL import Image
import os

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    public_dir = os.path.join(script_dir, '..', 'public')
    input_path = os.path.join(public_dir, 'logo.png')
    
    if not os.path.exists(input_path):
        print(f"Error: logo.png not found at {input_path}")
        return
    
    print("Generating PWA icons from logo.png...")
    
    # Open the source image
    img = Image.open(input_path)
    
    # Convert to RGBA if necessary
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Background color (navy-950: #0a0f1a)
    bg_color = (10, 15, 26, 255)
    
    sizes = [
        (192, 'icon-192.png'),
        (512, 'icon-512.png'),
        (180, 'apple-touch-icon.png'),
        (32, 'favicon.png'),
    ]
    
    for size, filename in sizes:
        # Create a square background
        new_img = Image.new('RGBA', (size, size), bg_color)
        
        # Calculate the size to fit the image while maintaining aspect ratio
        img_ratio = img.width / img.height
        if img_ratio > 1:
            # Wider than tall
            new_width = size
            new_height = int(size / img_ratio)
        else:
            # Taller than wide
            new_height = size
            new_width = int(size * img_ratio)
        
        # Resize the image
        resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Calculate position to center
        x = (size - new_width) // 2
        y = (size - new_height) // 2
        
        # Paste the resized image onto the background
        new_img.paste(resized, (x, y), resized)
        
        # Save
        output_path = os.path.join(public_dir, filename)
        new_img.save(output_path, 'PNG')
        print(f"✓ Generated {filename}")
    
    print("Done!")

if __name__ == '__main__':
    main()


