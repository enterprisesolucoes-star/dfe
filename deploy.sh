#!/bin/bash
MSG="${1:-deploy}"
cd /var/www/dfe
npm run build 2>&1 | tail -5
git add -A
git commit -m "$MSG"
git push origin main
echo "DEPLOY OK"
