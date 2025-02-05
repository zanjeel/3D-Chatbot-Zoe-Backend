#!/bin/bash
set -e

# Install FFmpeg (Download precompiled binary)
echo "Installing FFmpeg..."
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz | tar -xJ
mv ffmpeg-*-static/ffmpeg /usr/local/bin/
mv ffmpeg-*-static/ffprobe /usr/local/bin/
chmod +x /usr/local/bin/ffmpeg /usr/local/bin/ffprobe

# Install Rhubarb
echo "Installing Rhubarb..."
curl -L https://github.com/DavidMorenoR/rhubarb/releases/download/v1.11.0/rhubarb-linux-x64.tar.gz | tar -xz -C /usr/local/bin
chmod +x /usr/local/bin/rhubarb

echo "FFmpeg and Rhubarb installed successfully!"
