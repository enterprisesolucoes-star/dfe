const fs=require('fs');
let c=fs.readFileSync('src/components/NfceDashboard.tsx','utf8');
// Fix line 2839
c = c.replace(/msg \+= .*\n.*linkPdf.*/, 'msg += \\n📄 *Visualize seu Orçamento em PDF clicando abaixo:*\\n\;');
// Fix line 3412
c = c.replace(/Notas emitidas contra o CNPJ \{emitente.cnpj\} .*/, 'Notas emitidas contra o CNPJ {emitente.cnpj} — ');
fs.writeFileSync('src/components/NfceDashboard.tsx', c, 'utf8');
