#!/bin/bash
set -e  # Exit on error

# Define installation directory in /tmp (non-persistent)
INSTALL_DIR="/tmp/.local/bin"
mkdir -p $INSTALL_DIR

### Install FFmpeg ###
echo "Installing FFmpeg..."
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz | tar -xJ
mv ffmpeg-*-static/ffmpeg $INSTALL_DIR/
mv ffmpeg-*-static/ffprobe $INSTALL_DIR/
chmod +x $INSTALL_DIR/ffmpeg $INSTALL_DIR/ffprobe

# Verify FFmpeg installation
if [ -f "$INSTALL_DIR/ffmpeg" ]; then
  echo "FFmpeg installed successfully."
else
  echo "Error: FFmpeg installation failed."
  exit 1
fi

### Install Rhubarb ###
echo "Installing Rhubarb v1.13.0..."

RHUBARB_URL="https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/Rhubarb-Lip-Sync-1.13.0-Linux.zip"
RHUBARB_ZIP="Rhubarb-Lip-Sync-1.13.0-Linux.zip"

# Download Rhubarb
curl -L $RHUBARB_URL -o $RHUBARB_ZIP

# Unzip and install Rhubarb
if [ -f $RHUBARB_ZIP ]; then
  unzip $RHUBARB_ZIP -d $INSTALL_DIR
  rm $RHUBARB_ZIP
else
  echo "Error: Failed to download Rhubarb ZIP file."
  exit 1
fi

# Move Rhubarb binary to INSTALL_DIR for easier access
mv $INSTALL_DIR/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb $INSTALL_DIR/

# Ensure Rhubarb is executable
chmod +x $INSTALL_DIR/rhubarb

# Verify Rhubarb installation
if [ -f "$INSTALL_DIR/rhubarb" ]; then
  echo "Rhubarb installed successfully."
else
  echo "Error: Rhubarb installation failed."
  exit 1
fi

# Confirm installation paths
echo "init.sh: Using FFmpeg at: $INSTALL_DIR/ffmpeg"
echo "init.sh: Using Rhubarb at: $INSTALL_DIR/rhubarb"

# Update PATH (if needed)
export PATH="$INSTALL_DIR:$PATH"

echo "FFmpeg and Rhubarb installed successfully!"
