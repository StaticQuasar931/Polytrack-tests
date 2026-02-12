const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 4173);
const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const LOCK_STATE_FILE = path.join(DATA_DIR, "lock-state.json");
const LEADERBOARD_FILE = path.join(DATA_DIR, "overall-leaderboard.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wasm": "application/wasm",
  ".glb": "model/gltf-binary",
  ".track": "application/octet-stream",
};

function ensureDataFiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(LOCK_STATE_FILE)) {
    fs.writeFileSync(LOCK_STATE_FILE, JSON.stringify({ locked: false }, null, 2));
  }

  if (!fs.existsSync(LEADERBOARD_FILE)) {
    fs.writeFileSync(
      LEADERBOARD_FILE,
      JSON.stringify(
        {
          entries: [
            { rank: 1, name: "GhostDriver", averageRank: 1.42, raceCount: 18, totalTracks: 20 },
            { rank: 2, name: "TrackWizard", averageRank: 1.66, raceCount: 20, totalTracks: 20 },
            { rank: 3, name: "PolyAce", averageRank: 1.89, raceCount: 16, totalTracks: 20 },
          ],
        },
        null,
        2,
      ),
    );
  }
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(message);
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function isPathSafe(filePath) {
  const normalized = path.normalize(filePath);
  return normalized.startsWith(ROOT);
}

function serveStatic(req, res, pathname) {
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const localPath = path.join(ROOT, decodeURIComponent(requestPath));

  if (!isPathSafe(localPath)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  fs.stat(localPath, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      sendText(res, 404, "Not found");
      return;
    }

    const ext = path.extname(localPath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": mimeType,
      "Content-Length": stat.size,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=600",
    });

    fs.createReadStream(localPath).pipe(res);
  });
}

async function handleApi(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/lock-status") {
    sendJson(res, 200, { locked: false });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/overall-leaderboard") {
    const data = readJson(LEADERBOARD_FILE, { entries: [] });
    const entries = Array.isArray(data.entries) ? data.entries : [];
    sendJson(res, 200, {
      entries: entries.map((entry, index) => ({
        rank: Number(entry.rank || index + 1),
        name: String(entry.name || "Unknown"),
        averageRank: Number(entry.averageRank || 0),
        raceCount: Number(entry.raceCount || 0),
        totalTracks: Number(entry.totalTracks || 0),
      })),
    });
    return true;
  }

  return false;
}

ensureDataFiles();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname.startsWith("/api/")) {
    const handled = await handleApi(req, res, url.pathname);
    if (!handled) sendJson(res, 404, { error: "Not found" });
    return;
  }

  serveStatic(req, res, url.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`Polytrack server running at http://${HOST}:${PORT}`);
  console.log("API routes:");
  console.log("  GET  /api/lock-status");
  console.log("  GET  /api/overall-leaderboard");
});
