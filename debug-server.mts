import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, ".env") });
import express from "express";
const app = express();
app.use(express.json());
app.all('/api.php', async (req, res) => {
  res.json({ ok: true });
});
app.listen(3001, "0.0.0.0", () => console.log("DEBUG OK"));
