#!/bin/bash
set -e  # Exit on error

# Define local installation directory inside the project
INSTALL_DIR="./.local/bin"
mkdir -p $INSTALL_DIR

# FFmpeg installation
echo "Installing FFmpeg..."
FFMPEG_URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
FFMPEG_TAR="$INSTALL_DIR/ffmpeg-release.tar.xz"

# Download and extract FFmpeg
curl -L $FFMPEG_URL -o $FFMPEG_TAR
tar -xJf $FFMPEG_TAR -C $INSTALL_DIR --strip-components=1
rm $FFMPEG_TAR

# Ensure FFmpeg is executable
chmod +x $INSTALL_DIR/ffmpeg $INSTALL_DIR/ffprobe

# Rhubarb installation
echo "Installing Rhubarb..."
RHUBARB_URL="https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/Rhubarb-Lip-Sync-1.13.0-Linux.zip"
RHUBARB_ZIP="$INSTALL_DIR/Rhubarb-Lip-Sync.zip"

# Download and extract Rhubarb
curl -L $RHUBARB_URL -o $RHUBARB_ZIP
unzip $RHUBARB_ZIP -d $INSTALL_DIR
rm $RHUBARB_ZIP

# Ensure Rhubarb is executable
chmod +x $INSTALL_DIR/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb

# Confirm installation locations
echo "init.sh: Using FFmpeg at: $INSTALL_DIR/ffmpeg"
echo "init.sh: Using Rhubarb at: $INSTALL_DIR/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb"

echo "FFmpeg and Rhubarb installed successfully!"
