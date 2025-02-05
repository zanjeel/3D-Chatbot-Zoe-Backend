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

# Install Rhubarb manually without sudo
echo "Installing Rhubarb..."

# Download Rhubarb to a temporary directory
curl -L https://github.com/DavidMorenoR/rhubarb/releases/download/v1.11.0/rhubarb-linux-x64.tar.gz -o rhubarb.tar.gz

# Extract Rhubarb and move to INSTALL_DIR
tar -xzf rhubarb.tar.gz -C $INSTALL_DIR
rm rhubarb.tar.gz

# Update PATH
echo "Updating PATH..."
export PATH="$INSTALL_DIR:$PATH"

echo "FFmpeg and Rhubarb installed successfully!"
