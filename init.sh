#!/bin/bash
set -e

# Define local installation directory inside the project
INSTALL_DIR="./.local/bin"
mkdir -p $INSTALL_DIR

# Install FFmpeg
echo "Installing FFmpeg..."
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz | tar -xJ
mv ffmpeg-*-static/ffmpeg $INSTALL_DIR/
mv ffmpeg-*-static/ffprobe $INSTALL_DIR/
chmod +x $INSTALL_DIR/ffmpeg $INSTALL_DIR/ffprobe

# Install Rhubarb
echo "Installing Rhubarb..."
curl -L https://github.com/DavidMorenoR/rhubarb/releases/download/v1.11.0/rhubarb-linux-x64.tar.gz | tar -xz -C $INSTALL_DIR
chmod +x $INSTALL_DIR/rhubarb

# Update PATH
echo "Updating PATH..."
export PATH="$INSTALL_DIR:$PATH"

echo "FFmpeg and Rhubarb installed successfully!"
