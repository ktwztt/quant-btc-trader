const VPS_URL = process.env.VPS_TRADE_URL || "http://156.226.176.170:8080/api/trade";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Poly-Creds");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const url = req.method === "GET"
      ? `${VPS_URL}${req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : ""}`
      : VPS_URL;

    const headers = { "Content-Type": "application/json" };
    const polyCreds = req.headers["x-poly-creds"];
    if (polyCreds) headers["X-Poly-Creds"] = polyCreds;

    const fetchOptions = {
      method: req.method,
      headers,
      signal: AbortSignal.timeout(30000),
    };
    if (req.method === "POST") {
      fetchOptions.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    }

    const resp = await fetch(url, fetchOptions);
    const text = await resp.text();

    res.setHeader("Content-Type", resp.headers.get("content-type") || "application/json");
    return res.status(resp.status).send(text);
  } catch (err) {
    const status = err.name === "TimeoutError" ? 504 : 502;
    return res.status(status).json({ error: `Proxy error: ${err.message}` });
  }
}
