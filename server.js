const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const VERSION = "1.0.0";
const assets = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
]);

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}

function createServer() {
  return http.createServer((request, response) => {
    let pathname;
    try {
      pathname = new URL(request.url, "http://localhost").pathname;
    } catch {
      response.writeHead(400).end();
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }

    if (pathname === "/favicon.ico") {
      response.writeHead(204).end();
      return;
    }

    if (pathname === "/api/health") {
      sendJson(response, 200, { status: "ok", version: VERSION });
      return;
    }
    if (pathname === "/api/tools") {
      sendJson(response, 200, { tools: ["web-search", "mail-shortcuts", "url-check"] });
      return;
    }

    const asset = assets.get(pathname);
    if (!asset) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
      return;
    }

    const filePath = path.join(ROOT, asset[0]);
    fs.readFile(filePath, (error, content) => {
      if (error) {
        response.writeHead(500).end();
        return;
      }
      response.writeHead(200, {
        "Content-Type": asset[1],
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
        "Referrer-Policy": "no-referrer",
        "X-Frame-Options": "DENY",
      });
      response.end(request.method === "HEAD" ? undefined : content);
    });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || "127.0.0.1";
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error("PORT must be an integer between 1 and 65535.");
    process.exit(1);
  }
  createServer().listen(port, host, () => {
    console.log(`Integrated workspace running at http://${host}:${port}`);
  });
}

module.exports = { createServer };
