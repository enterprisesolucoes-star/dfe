#!/bin/bash
cd /var/www/dfe

# Testa se responde
pm2 start dfe-api > /dev/null 2>&1
sleep 5
RESP=$(curl -s --max-time 5 -X POST http://127.0.0.1:3001/api.php \
  -H "Content-Type: application/json" \
  -H "Origin: https://dfe.esolucoesia.com" \
  -d '{"action":"login","login":"test","senha":"test"}' 2>&1)
echo "RESPOSTA: $RESP"

if [ -z "$RESP" ]; then
  echo "SEM RESPOSTA - verificando strace..."
  strace -p $(lsof -t -i:3001) -e trace=network -c 2>&1 &
  sleep 3
  curl -s --max-time 3 -X POST http://127.0.0.1:3001/api.php \
    -H "Content-Type: application/json" \
    -H "Origin: https://dfe.esolucoesia.com" \
    -d '{"action":"login","login":"test","senha":"test"}'
  kill %1 2>/dev/null
fi
