// PIX BR Code (EMV) QR Code generator
// https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesParaIniciacaodoPix.pdf

function crc16(str: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return ((crc & 0xFFFF).toString(16).toUpperCase()).padStart(4, '0');
}

function tlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

export function gerarPixBrCode(chavepix: string, valor: number, nome: string, cidade: string): string {
  const pixKey = chavepix.trim();
  const merchantName = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').substring(0, 25).trim();
  const merchantCity = cidade.normalize('NFD').replace(/[̀-ͯ]/g, '').substring(0, 15).trim();
  const valorStr = valor > 0 ? valor.toFixed(2) : '';

  const gui = tlv('00', 'BR.GOV.BCB.PIX');
  const key = tlv('01', pixKey);
  const merchantAccount = tlv('26', gui + key);

  let payload = '000201';               // Payload Format Indicator
  payload += '010211';                  // Point of Initiation: static
  payload += merchantAccount;           // Merchant Account
  payload += '52040000';               // MCC
  payload += '5303986';                // Currency BRL
  if (valorStr) payload += tlv('54', valorStr);
  payload += '5802BR';                  // Country
  payload += tlv('59', merchantName);
  payload += tlv('60', merchantCity);
  payload += tlv('62', tlv('05', '***'));  // Additional Data
  payload += '6304';                    // CRC tag

  return payload + crc16(payload);
}

export async function gerarPixQrCodeBase64(chavepix: string, valor: number, nome: string, cidade: string): Promise<string> {
  const brCode = gerarPixBrCode(chavepix, valor, nome, cidade);
  // Use qrcode library (imported as ESM)
  const QRCode = await import('qrcode');
  return await QRCode.toDataURL(brCode, { width: 256, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } });
}
