const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 4173);
const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const RACES_FILE = path.join(DATA_DIR, "race-results.json");
const TRACKS_FILE = path.join(DATA_DIR, "tracks.json");

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
  if (!fs.existsSync(RACES_FILE)) {
    fs.writeFileSync(RACES_FILE, JSON.stringify({ results: [] }, null, 2));
  }
  if (!fs.existsSync(TRACKS_FILE)) {
    fs.writeFileSync(TRACKS_FILE, JSON.stringify({ tracks: [] }, null, 2));
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
      if (!body) return resolve({});
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

  if (!isPathSafe(localPath)) return sendText(res, 403, "Forbidden");

  fs.stat(localPath, (statErr, stat) => {
    if (statErr || !stat.isFile()) return sendText(res, 404, "Not found");

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

function cleanId(value) {
  return String(value || "")
    .trim()
    .slice(0, 64)
    .replace(/[^a-zA-Z0-9_.:-]/g, "_");
}

function cleanName(value) {
  const trimmed = String(value || "").trim().slice(0, 24);
  return trimmed.replace(/[^\w\- .]/g, "") || "Player";
}

function computeTrackLeaderboard(results, trackId, limit = 50) {
  const bestByUser = new Map();
  for (const row of results) {
    if (row.trackId !== trackId) continue;
    const key = row.userId || row.accountId;
    if (!key) continue;
    const prev = bestByUser.get(key);
    if (!prev || row.timeMs < prev.timeMs) bestByUser.set(key, row);
  }
  const list = Array.from(bestByUser.values()).sort((a, b) => a.timeMs - b.timeMs);
  return list.slice(0, limit).map((row, idx) => ({
    rank: idx + 1,
      userId: row.userId || row.accountId,
    name: row.name,
    timeMs: row.timeMs,
    attempts: row.attempts || 1,
    updatedAt: row.timestamp,
  }));
}

function computeOverall(results, tracks, limit = 100) {
  const activeTrackIds = Array.from(new Set([...tracks.map((t) => t.trackId), ...results.map((r) => r.trackId)])).filter(Boolean);
  const trackBoards = new Map();

  for (const trackId of activeTrackIds) {
    trackBoards.set(trackId, computeTrackLeaderboard(results, trackId, 500));
  }

  const userStats = new Map();
  for (const [trackId, board] of trackBoards.entries()) {
    const boardSize = Math.max(board.length, 1);
    for (const entry of board) {
      const percentile = entry.rank / boardSize;
      const scoreComponent = percentile; // lower better
      const current = userStats.get(entry.userId) || {
        userId: entry.userId,
        name: entry.name,
        raceCount: 0,
        tracksSet: new Set(),
        scoreSum: 0,
      };
      current.name = entry.name;
      current.raceCount += 1;
      current.tracksSet.add(trackId);
      current.scoreSum += scoreComponent;
      userStats.set(entry.userId, current);
    }
  }

  const totalTracks = activeTrackIds.length;
  const overall = Array.from(userStats.values()).map((u) => {
    const trackCoverage = totalTracks > 0 ? u.tracksSet.size / totalTracks : 0;
    const avgPercentile = u.scoreSum / Math.max(u.raceCount, 1);
    const coverageBonus = (1 - trackCoverage) * 0.15;
    const score = avgPercentile + coverageBonus;
    return {
      userId: u.userId,
      name: u.name,
      score: Number(score.toFixed(6)),
      raceCount: u.raceCount,
      totalTracks,
    };
  });

  overall.sort((a, b) => a.score - b.score || b.raceCount - a.raceCount);
  return overall.slice(0, limit).map((row, idx) => ({ rank: idx + 1, ...row }));
}

async function handleApi(req, res, pathname, urlObj) {
  const racesData = readJson(RACES_FILE, { results: [] });
  const tracksData = readJson(TRACKS_FILE, { tracks: [] });
  const results = Array.isArray(racesData.results) ? racesData.results : [];
  const tracks = Array.isArray(tracksData.tracks) ? tracksData.tracks : [];

  if (req.method === "GET" && pathname === "/api/lock-status") {
    return sendJson(res, 200, { locked: false }), true;
  }

  if (req.method === "GET" && pathname === "/api/overall-leaderboard") {
    return sendJson(res, 200, { entries: computeOverall(results, tracks, 100) }), true;
  }

  if (req.method === "GET" && pathname === "/api/leaderboard") {
    const trackId = cleanId(urlObj.searchParams.get("trackId"));
    if (!trackId) return sendJson(res, 400, { error: "trackId is required" }), true;
    return sendJson(res, 200, { trackId, entries: computeTrackLeaderboard(results, trackId, 100) }), true;
  }

  if (req.method === "POST" && pathname === "/api/race-result") {
    let body;
    try {
      body = await parseRequestBody(req);
    } catch (error) {
      return sendJson(res, 400, { success: false, error: error.message }), true;
    }

    const trackId = cleanId(body.trackId);
    const userId = cleanId(body.userId || body.accountId || body.userTokenHash || body.tokenHash || body.token || body.guestId);
    const name = cleanName(body.name || body.nickname || "Player");
    const timeMs = Number(body.timeMs ?? body.time);

    if (!trackId || !userId || !Number.isFinite(timeMs) || timeMs <= 0) {
      return sendJson(res, 400, { success: false, error: "trackId, userId and positive timeMs are required" }), true;
    }

    let attempts = 1;
    const prior = results.filter((r) => r.trackId === trackId && r.userId === userId).length;
    attempts += prior;

    const row = {
      trackId,
      userId,
      accountId: userId,
      name,
      timeMs: Math.round(timeMs),
      frames: Number(body.frames || 0) || null,
      replay: typeof body.replay === "string" ? body.replay.slice(0, 200_000) : null,
      replayHash: cleanId(body.replayHash || body.uploadId || "") || null,
      carId: cleanId(body.carId || body.car || body.carName || "") || null,
      carColors: String(body.carColors || body.CarColors || "").slice(0, 64) || null,
      timestamp: Date.now(),
      attempts,
    };

    results.push(row);
    writeJson(RACES_FILE, { results });

    const trackBoard = computeTrackLeaderboard(results, trackId, 100);
    const position = trackBoard.find((r) => r.userId === userId)?.rank || null;
    return sendJson(res, 200, { success: true, trackId, position, leaderboardSize: trackBoard.length }), true;
  }

  if (req.method === "POST" && pathname === "/api/tracks") {
    let body;
    try {
      body = await parseRequestBody(req);
    } catch (error) {
      return sendJson(res, 400, { success: false, error: error.message }), true;
    }

    const trackId = cleanId(body.trackId || body.id || body.name);
    if (!trackId) return sendJson(res, 400, { success: false, error: "trackId is required" }), true;

    const existing = tracks.find((t) => t.trackId === trackId);
    const payload = {
      trackId,
      title: String(body.title || trackId).slice(0, 80),
      author: cleanName(body.author || "Community"),
      category: String(body.category || "custom").slice(0, 20),
      data: typeof body.data === "string" ? body.data.slice(0, 300000) : "",
      updatedAt: Date.now(),
    };

    if (existing) Object.assign(existing, payload);
    else tracks.push(payload);

    writeJson(TRACKS_FILE, { tracks });
    return sendJson(res, 200, { success: true, trackId }), true;
  }

  if (req.method === "GET" && pathname === "/api/tracks") {
    return sendJson(res, 200, {
      tracks: tracks.map((t) => ({
        trackId: t.trackId,
        title: t.title,
        author: t.author,
        category: t.category,
        updatedAt: t.updatedAt,
      })),
    }), true;
  }

  return false;
}

ensureDataFiles();

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (urlObj.pathname.startsWith("/api/")) {
    const handled = await handleApi(req, res, urlObj.pathname, urlObj);
    if (!handled) sendJson(res, 404, { error: "Not found" });
    return;
  }

  serveStatic(req, res, urlObj.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`Polytrack server running at http://${HOST}:${PORT}`);
  console.log("API routes:");
  console.log("  GET  /api/lock-status");
  console.log("  GET  /api/overall-leaderboard");
  console.log("  GET  /api/leaderboard?trackId=");
  console.log("  POST /api/race-result");
  console.log("  GET  /api/tracks");
  console.log("  POST /api/tracks");
});
