const fs = require('fs');

const replacements = {
  'ÃƒÂ ': 'à',
  'ÃƒÂ´': 'ô',
  'Ã‚': 'º',
  'Ãƒmero': 'Número',
  'PRODUÃƒâ€¡ÃƒÆ’O': 'PRODUÇÃO',
  'HOMOLOGAÃƒâ€¡ÃƒÆ’O': 'HOMOLOGAÇÃO',
  'ÃƒÅ¡ltimo': 'Último',
  'ÃƒÅ¡ltima': 'Última',
  'Ã°Å¸â€ž': '📄',
  'â‚¬â€ ': '—'
};

const file = 'src/components/NfceDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');
for (const [bad, good] of Object.entries(replacements)) {
  content = content.split(bad).join(good);
}
fs.writeFileSync(file, content, 'utf8');

const file2 = 'src/components/ComprasModule.tsx';
let content2 = fs.readFileSync(file2, 'utf8');
for (const [bad, good] of Object.entries(replacements)) {
  content2 = content2.split(bad).join(good);
}
fs.writeFileSync(file2, content2, 'utf8');

console.log('Fixed additional chars');
