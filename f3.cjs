const fs=require('fs');
let c=fs.readFileSync('src/components/NfceDashboard.tsx','utf8');
c = c.replace(/NÃƒ.mero/g, 'Número'); 
c = c.replace(/Ã..â.ž/g, '📄');
fs.writeFileSync('src/components/NfceDashboard.tsx', c, 'utf8');
