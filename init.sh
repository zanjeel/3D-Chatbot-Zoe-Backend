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

# Install Rhubarb v1.13.0
echo "Installing Rhubarb v1.13.0..."

RHUBARB_URL="https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/Rhubarb-Lip-Sync-1.13.0-Linux.zip"
RHUBARB_ZIP="Rhubarb-Lip-Sync-1.13.0-Linux.zip"

# Download Rhubarb .zip file
curl -L $RHUBARB_URL -o $RHUBARB_ZIP

# Unzip and install Rhubarb
if [ -f $RHUBARB_ZIP ]; then
  unzip $RHUBARB_ZIP -d $INSTALL_DIR
  rm $RHUBARB_ZIP
else
  echo "Error: Failed to download Rhubarb ZIP file."
  exit 1
fi

# Ensure Rhubarb is executable
chmod +x $INSTALL_DIR/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb

# Echo paths
echo "Using FFmpeg at: $INSTALL_DIR/ffmpeg"
echo "Using Rhubarb at: $INSTALL_DIR/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb"

# Update PATH
export PATH="$INSTALL_DIR:$PATH"

echo "FFmpeg and Rhubarb installed successfully!"