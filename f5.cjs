const fs=require('fs');
let c=fs.readFileSync('src/components/NfceDashboard.tsx','utf8');
c = c.replace(/AMBIENTE DE \{emitente.ambienteNfe === .1. \? .PRODUÇÃO. : .HOMOLOGAÇÃO.\}/, "AMBIENTE DE {emitente.ambienteNfe === '1' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}");
fs.writeFileSync('src/components/NfceDashboard.tsx', c, 'utf8');
