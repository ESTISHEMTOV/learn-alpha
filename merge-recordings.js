// Overlays human recordings from recordings/ onto the existing audio clips.
// Files are named L01..L22 (letter names) and W01..W22 (words); the number
// is the letter's position in LETTERS. Any recording found REPLACES the
// corresponding TTS clip; letters with no recording keep their TTS clip.
// Run:  node merge-recordings.js   (no internet needed)
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const REC = path.join(DIR, "recordings");
const OUT = path.join(DIR, "audio-data.js");

const html = fs.readFileSync(path.join(DIR, "index.html"), "utf8");
const LETTERS = eval(html.match(/const LETTERS = (\[[\s\S]*?\]);/)[1]);

// Load current clips (produced by build-audio.js).
const g = {};
new Function("window", fs.readFileSync(OUT, "utf8"))(g);
const AUDIO = g.AUDIO || { names: {}, words: {} };
if (!AUDIO.fx) AUDIO.fx = { wrong: [], right: [] };

const MIME = { mp3:"audio/mpeg", m4a:"audio/mp4", mp4:"audio/mp4", wav:"audio/wav", ogg:"audio/ogg", webm:"audio/webm", aac:"audio/aac", opus:"audio/ogg" };

if (!fs.existsSync(REC)) { console.log("No recordings/ folder — nothing to merge."); process.exit(0); }

const IDX_OF = {};
LETTERS.forEach((it, i) => { IDX_OF[it.l] = i; });

// Feedback phrases spoken on success / mistake (child can't read).
const FX_RIGHT = ["כל הכבוד", "כל-הכבוד", "כלהכבוד", "נכון", "יופי", "מצוין", "מצויין", "בראבו", "right"];
const FX_WRONG = ["טעות", "לא נכון", "לא-נכון", "לאנכון", "נסי שוב", "אופס", "wrong"];

// Work out which clip a filename (without extension) targets.
// Accepts, in order:
//   L02 / W02            -> by number (L=letter-name, W=word)
//   כל הכבוד / נכון ...   -> success feedback   ("right")
//   טעות / לא נכון ...    -> mistake feedback   ("wrong")
//   ב                    -> bare Hebrew letter = that letter's NAME
//   ב מילה / ב-word / בw  -> that letter's WORD
function resolve(base) {
  base = base.trim();
  let m;
  if ((m = base.match(/^([LW])(\d{2})$/i)))
    return { kind: m[1].toUpperCase() === "L" ? "names" : "words", idx: parseInt(m[2], 10) - 1 };
  if (FX_RIGHT.includes(base)) return { fx: "right" };
  if (FX_WRONG.includes(base)) return { fx: "wrong" };
  if ((m = base.match(/^([א-ת])[\s_-]*(מילה|word|w)$/i)) && IDX_OF[m[1]] != null)
    return { kind: "words", idx: IDX_OF[m[1]] };
  if ((m = base.match(/^([א-ת])$/)) && IDX_OF[m[1]] != null)
    return { kind: "names", idx: IDX_OF[m[1]] };
  return null;
}

let merged = 0;
for (const f of fs.readdirSync(REC)) {
  const dot = f.lastIndexOf(".");
  if (dot < 1) continue;
  const ext = f.slice(dot + 1).toLowerCase();
  const r = resolve(f.slice(0, dot));
  if (!r) continue;
  if (!MIME[ext]) { console.log("skip (unknown format): " + f); continue; }
  const bytes = fs.readFileSync(path.join(REC, f));
  if (bytes.length < 400) { console.log("skip (too small/empty): " + f); continue; }
  const uri = "data:" + MIME[ext] + ";base64," + bytes.toString("base64");
  if (r.fx) {                                   // feedback clip: this recording replaces the set
    AUDIO.fx[r.fx] = [uri];
    merged++;
    console.log("merged " + f + "  ->  feedback '" + r.fx + "'");
    continue;
  }
  const { kind, idx } = r;
  if (idx < 0 || idx >= LETTERS.length) { console.log("skip (bad number): " + f); continue; }
  const letter = LETTERS[idx].l;
  AUDIO[kind][letter] = uri;
  merged++;
  console.log("merged " + f + "  ->  " + (kind === "names" ? "letter-name" : "word") + " '" + letter + "'");
}

if (merged === 0) { console.log("No matching recordings found (expected names like L02.mp3 or W02.m4a)."); process.exit(0); }

fs.writeFileSync(OUT, "window.AUDIO = " + JSON.stringify(AUDIO) + ";");
console.log("\nDone: " + merged + " recording(s) embedded. audio-data.js = " +
            Math.round(fs.statSync(OUT).size / 1024) + " KB");
