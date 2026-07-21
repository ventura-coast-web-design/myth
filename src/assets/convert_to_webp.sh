#!/bin/bash

# Convert all JPG images to WebP format
echo "Converting images to WebP format..."

# Convert all .jpg files
for file in *.jpg; do
    if [ -f "$file" ]; then
        echo "Converting $file to WebP..."
        convert "$file" -quality 85 "${file%.jpg}.webp"
    fi
done

# Convert all .JPG files
for file in *.JPG; do
    if [ -f "$file" ]; then
        echo "Converting $file to WebP..."
        convert "$file" -quality 85 "${file%.JPG}.webp"
    fi
done

# Convert all .png files
for file in *.png; do
    if [ -f "$file" ]; then
        echo "Converting $file to WebP..."
        convert "$file" -quality 85 "${file%.png}.webp"
    fi
done

# Convert all .PNG files
for file in *.PNG; do
    if [ -f "$file" ]; then
        echo "Converting $file to WebP..."
        convert "$file" -quality 85 "${file%.PNG}.webp"
    fi
done

# Convert all .jpeg files
for file in *.jpeg; do
    if [ -f "$file" ]; then
        echo "Converting $file to WebP..."
        convert "$file" -quality 85 "${file%.jpeg}.webp"
    fi
done

# Convert all .JPEG files
for file in *.JPEG; do
    if [ -f "$file" ]; then
        echo "Converting $file to WebP..."
        convert "$file" -quality 85 "${file%.JPEG}.webp"
    fi
done

echo "Conversion complete! All images have been converted to WebP format."
echo "Original JPG, JPG, PNG, PNG, JPEG, JPEG files are preserved. You can delete them manually if needed." 