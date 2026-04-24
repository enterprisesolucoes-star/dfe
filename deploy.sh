#!/bin/bash
cd /var/www/dfe

if [ -z "$1" ]; then
  echo "Informe a mensagem do commit. Ex: ./deploy.sh \"feat: carta de correcao\""
  exit 1
fi

echo "Buildando..."
npm run build

if [ $? -ne 0 ]; then
  echo "Build falhou. Deploy cancelado."
  exit 1
fi

echo "Commitando..."
git add -A
git commit -m "$1"
git push origin main

echo "Deploy concluido: $1"
