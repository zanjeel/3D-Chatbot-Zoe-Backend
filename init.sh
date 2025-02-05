# Install Rhubarb v1.13.0
echo "Installing Rhubarb v1.13.0..."

RHUBARB_URL="https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/Rhubarb-Lip-Sync-1.13.0-Linux.zip"
RHUBARB_ZIP="Rhubarb-Lip-Sync-1.13.0-Linux.zip"
INSTALL_DIR="./.local/bin"
mkdir -p $INSTALL_DIR

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

# Update PATH
export PATH="$INSTALL_DIR:$PATH"
echo "Rhubarb v1.13.0 installed successfully!"
