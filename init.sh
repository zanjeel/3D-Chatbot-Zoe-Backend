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

# Use wget to download Rhubarb (from GitHub, verified URL)
wget https://github.com/DavidMorenoR/rhubarb/releases/download/v1.11.0/rhubarb-linux-x64.tar.gz -O rhubarb.tar.gz

# Check the file format before extraction
if file rhubarb.tar.gz | grep -q 'gzip compressed data'; then
  # Extract Rhubarb and move to INSTALL_DIR
  tar -xzf rhubarb.tar.gz -C $INSTALL_DIR
  rm rhubarb.tar.gz
else
  echo "Error: The Rhubarb tarball is not in the expected format."
  exit 1
fi

# Update PATH
echo "Updating PATH..."
export PATH="$INSTALL_DIR:$PATH"

echo "FFmpeg and Rhubarb installed successfully!"
