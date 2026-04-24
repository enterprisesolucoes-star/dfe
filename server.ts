import express from "express";
import path from "path";
import cors from "cors";
import { login } from "./src/routes/auth.ts";

const app = express();
const allowedOrigins = [
  'https://dfe.esolucoesia.com',
  'http://187.77.240.171:3001',
  'http://localhost:5173'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true
}));

app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; img-src 'self' data: blob: https:; connect-src 'self' https://dfe.esolucoesia.com https://servicodados.ibge.gov.br https://api.supertef.com.br https://viacep.com.br; font-src 'self' data: https:;");
  res.removeHeader('X-Powered-By');
  next();
});
app.use(express.text({ type: 'text/plain' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ─── Rate Limit Inteligente ──────────────────────────────────────────────────
// Duas proteções independentes:
//   1. Por login: 10 tentativas erradas consecutivas → bloqueia só aquele login
//      Reset automático ao logar com sucesso
//   2. Por IP:    30 tentativas em 15 min (genérico contra ataques em massa)
// Sucesso em qualquer tentativa zera o contador daquele login

const loginFailsByUser = new Map<string, { count: number, until: number }>();
const loginAttemptsByIP = new Map<string, { count: number, resetAt: number }>();
const MAX_FAILS_PER_USER = 10;
const BLOCK_USER_TIME = 10 * 60 * 1000;   // 10 min bloqueio por login
const MAX_IP = 30;                         // 30 req/IP em 15 min
const IP_WINDOW = 15 * 60 * 1000;

function checkLimits(ip: string, loginName: string): { ok: boolean, reason?: string, waitMin?: number } {
  const now = Date.now();

  // 1. Checar bloqueio por login
  const userBlock = loginFailsByUser.get(loginName);
  if (userBlock && userBlock.count >= MAX_FAILS_PER_USER && now < userBlock.until) {
    const wait = Math.ceil((userBlock.until - now) / 60000);
    return { ok: false, reason: `Login bloqueado temporariamente. Tente novamente em ${wait} min.`, waitMin: wait };
  }

  // 2. Checar rate limit por IP
  let ipData = loginAttemptsByIP.get(ip);
  if (!ipData || now > ipData.resetAt) {
    ipData = { count: 0, resetAt: now + IP_WINDOW };
  }
  ipData.count++;
  loginAttemptsByIP.set(ip, ipData);
  if (ipData.count > MAX_IP) {
    const wait = Math.ceil((ipData.resetAt - now) / 60000);
    return { ok: false, reason: `Muitas requisições. Aguarde ${wait} min.`, waitMin: wait };
  }

  return { ok: true };
}

function registerFailure(loginName: string) {
  const now = Date.now();
  const data = loginFailsByUser.get(loginName) || { count: 0, until: now + BLOCK_USER_TIME };
  data.count++;
  data.until = now + BLOCK_USER_TIME;
  loginFailsByUser.set(loginName, data);
}

function registerSuccess(loginName: string) {
  loginFailsByUser.delete(loginName);
}

// Limpeza periódica (evita vazamento de memória)
setInterval(() => {
  const now = Date.now();
  loginFailsByUser.forEach((v, k) => { if (now > v.until) loginFailsByUser.delete(k); });
  loginAttemptsByIP.forEach((v, k) => { if (now > v.resetAt) loginAttemptsByIP.delete(k); });
}, 5 * 60 * 1000);

app.all("/api.php", async (req, res) => {
  const action = (req.body && req.body.action) || req.query.action;

  if (action === "login") {
    const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim();
    const loginName = (req.body.login || req.query.login || '').toString().trim().toLowerCase();

    // Rate limit
    const limit = checkLimits(ip, loginName);
    if (!limit.ok) {
      return res.status(429).json({ success: false, error: limit.reason });
    }

    req.body.login = req.body.login || req.query.login;
    req.body.senha = req.body.senha || req.query.senha;
    const loginRes = await new Promise<any>((resolve) => {
      const fakeRes = {
        _data: null as any,
        _cookie: "",
        status(code: number) { return this; },
        json(data: any) { this._data = data; resolve(this); return this; },
        send(data: any) { this._data = data; resolve(this); return this; },
        set(h: any) { return this; },
        setHeader(k: string, v: string) { if (k === "Set-Cookie") this._cookie = v; return this; },
        getHeader(k: string) { return null; }
      } as any;
      login(req, fakeRes);
    });
    const data = loginRes._data;
    if (data && data.success) {
      registerSuccess(loginName);
      if (data.empresaId) {
        res.setHeader("Set-Cookie", `empresa_id=${data.empresaId}; Path=/; HttpOnly`);
      }
    } else if (loginName) {
      registerFailure(loginName);
    }
    return res.json(data);
  }

  try {
    // Extrai empresa_id do cookie
    let empresaId = 1;
    const cookieStr = req.headers.cookie || "";
    const match = cookieStr.match(/empresa_id=(\d+)/);
    if (match) empresaId = parseInt(match[1]);

    const fetch = (await import("node-fetch")).default;
    const allQuery = new URLSearchParams({ ...req.query as any, action, empresa_id: String(empresaId) });
    const url = `http://172.17.0.1:8080/api.php?${allQuery}`;
    let parsedBody = req.body;
    if (typeof parsedBody === 'string') { try { parsedBody = JSON.parse(parsedBody); } catch {} }
    const hasBody = parsedBody && typeof parsedBody === 'object' && Object.keys(parsedBody).length > 0;
    const response = await fetch(url, {
      method: hasBody ? "POST" : "GET",
      headers: hasBody ? { "Content-Type": "application/json" } : {},
      body: hasBody ? JSON.stringify(parsedBody) : undefined
    });
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/pdf') || contentType.includes('application/octet')) {
      const buf = await response.buffer();
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', response.headers.get('content-disposition') || 'inline');
      res.send(buf);
    } else {
      const text = await response.text();
      try { res.json(JSON.parse(text)); } catch { res.send(text); }
    }
  } catch(e: any) {
    res.status(500).json({ error: "PHP error: " + e.message });
  }
});

app.use("/pma", express.static(path.join("/usr/share/phpmyadmin")))
app.use(express.static(path.join(process.cwd(), "dist")));
app.get("*", (req, res) => {
  const hasExt = req.path.indexOf(".") !== -1;
  if (hasExt) { res.status(404).end(); } else {
    res.sendFile(path.join(process.cwd(), "dist", "index.html"));
  }
});
app.listen(3001, "0.0.0.0", () => console.log("SISTEMA VALIDADO NA PORTA 3001"));
