// Tiny zero-dependency static server so the app runs from http://localhost,
// where the microphone permission is remembered permanently (unlike file://,
// which re-asks every time). Started by start-server.bat.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = 8080;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".m4a":  "audio/mp4", ".mp4": "audio/mp4",
  ".mp3":  "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg",
  ".png":  "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8", ".md": "text/markdown; charset=utf-8",
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  // Prevent path traversal outside ROOT.
  const filePath = path.join(ROOT, path.normalize(urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end("forbidden"); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log("\n  הא-ב הקסום פועל! פתחי בדפדפן:  http://localhost:" + PORT + "\n");
  console.log("  (כדי לעצור: סגרי את החלון השחור הזה)\n");
});
