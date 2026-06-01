#!/bin/bash
# Monthly OFF update — run via cron: 0 3 1 * * /opt/veganland/server/scripts/update-off.sh
set -e
cd /opt/veganland
rm -f /opt/veganland/data/off-products.csv.gz
python3 server/scripts/import-off.py
echo "OFF update complete at $(date)"
