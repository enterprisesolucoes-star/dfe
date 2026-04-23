const fs=require('fs');
let c=fs.readFileSync('src/components/NfceDashboard.tsx','utf8');
c = c.replace(/NÃƒmero/g, 'Número');
c = c.replace(/NÃƒmero/g, 'Número'); // Double check variations
c = c.replace(/Ã°Å¸â€ž/g, '📄');
fs.writeFileSync('src/components/NfceDashboard.tsx', c, 'utf8');
