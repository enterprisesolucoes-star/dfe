const fs=require('fs');
let c=fs.readFileSync('src/components/NfceDashboard.tsx','utf8');
c = c.replace(/NÃƒmero/g, 'Número');
c = c.replace(/678Ãƒâ€”228/g, '678x228');
c = c.replace(/Ã°Å¸â€ž/g, '📄');
fs.writeFileSync('src/components/NfceDashboard.tsx', c);
