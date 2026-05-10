import fetch from 'node-fetch';

const BASE = () => (process.env.EVOLUTION_API_URL || '').replace(/\/$/, '');
const KEY  = () => process.env.EVOLUTION_API_KEY || '';
const hdr  = () => ({ 'apikey': KEY(), 'Content-Type': 'application/json' });

export function instanceName(empresaId: number) {
  return `erp_empresa_${empresaId}`;
}

export async function ensureInstance(empresaId: number): Promise<boolean> {
  const name = instanceName(empresaId);
  try {
    const r = await fetch(`${BASE()}/instance/create`, {
      method: 'POST', headers: hdr(),
      body: JSON.stringify({ instanceName: name, integration: 'WHATSAPP-BAILEYS' })
    });
    return r.ok;
  } catch { return false; }
}

export async function getQrCode(empresaId: number): Promise<{ qrcode?: string; status?: string }> {
  const name = instanceName(empresaId);
  await ensureInstance(empresaId);
  try {
    const r = await fetch(`${BASE()}/instance/connect/${name}`, { headers: hdr() });
    const d = await r.json() as any;
    return { qrcode: d.base64 || d.qrcode?.base64, status: d.status };
  } catch { return {}; }
}

export async function getStatus(empresaId: number): Promise<{ state: string; phone?: string }> {
  const name = instanceName(empresaId);
  try {
    const r = await fetch(`${BASE()}/instance/connectionState/${name}`, { headers: hdr() });
    if (!r.ok) return { state: 'close' };
    const d = await r.json() as any;
    return { state: d.instance?.state || d.state || 'close', phone: d.instance?.owner };
  } catch { return { state: 'error' }; }
}

export async function sendText(empresaId: number, phone: string, text: string): Promise<boolean> {
  const name = instanceName(empresaId);
  const num = phone.replace(/\D/g, '');
  const to  = num.startsWith('55') ? num : `55${num}`;
  try {
    const r = await fetch(`${BASE()}/message/sendText/${name}`, {
      method: 'POST', headers: hdr(),
      body: JSON.stringify({ number: to, text })
    });
    return r.ok;
  } catch { return false; }
}

export async function sendDocument(
  empresaId: number, phone: string,
  base64: string, filename: string, caption: string
): Promise<boolean> {
  const name = instanceName(empresaId);
  const num  = phone.replace(/\D/g, '');
  const to   = num.startsWith('55') ? num : `55${num}`;
  try {
    const r = await fetch(`${BASE()}/message/sendMedia/${name}`, {
      method: 'POST', headers: hdr(),
      body: JSON.stringify({
        number: to, mediatype: 'document',
        mimetype: 'application/pdf',
        caption, media: base64, fileName: filename
      })
    });
    return r.ok;
  } catch { return false; }
}

export async function sendImage(
  empresaId: number, phone: string,
  base64: string, caption: string
): Promise<boolean> {
  const name = instanceName(empresaId);
  const num  = phone.replace(/\D/g, '');
  const to   = num.startsWith('55') ? num : `55${num}`;
  const data64 = base64.replace(/^data:image\/[a-z]+;base64,/, '');
  try {
    const r = await fetch(`${BASE()}/message/sendMedia/${name}`, {
      method: 'POST', headers: hdr(),
      body: JSON.stringify({
        number: to, mediatype: 'image',
        mimetype: 'image/png',
        caption, media: data64, fileName: 'pix_qrcode.png'
      })
    });
    return r.ok;
  } catch { return false; }
}
