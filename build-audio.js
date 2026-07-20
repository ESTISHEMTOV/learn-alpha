// Downloads real Hebrew TTS clips for every letter-name and word,
// base64-embeds them, and writes audio-data.js.
//
// IMPORTANT: uses node's native fetch + encodeURIComponent so the Hebrew
// query is sent as correct UTF-8. (Passing Hebrew through the Windows shell
// mangles it into "?" characters, which Google then reads aloud as
// "סימן שאלה" — that was the original bug.)
const fs = require("fs");
const path = require("path");

const HTML = path.join(__dirname, "index.html");
const OUT = path.join(__dirname, "audio-data.js");

const html = fs.readFileSync(HTML, "utf8");
const LETTERS = eval(html.match(/const LETTERS = (\[[\s\S]*?\]);/)[1]);
const LETTER_NAME = eval("(" + html.match(/const LETTER_NAME = (\{[\s\S]*?\});/)[1] + ")");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchTTS(text) {
  const url = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=iw&q=" +
              encodeURIComponent(text);
  const res = await fetch(url, { headers: { "User-Agent": UA, "Referer": "https://translate.google.com/" } });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 800) throw new Error("too small (" + buf.length + " bytes)");
  return buf;
}

(async () => {
  const AUDIO = { names: {}, words: {} };
  let ok = 0, fail = 0;
  for (const it of LETTERS) {
    for (const [kind, text] of [["names", LETTER_NAME[it.l] || it.l], ["words", it.w]]) {
      try {
        const buf = await fetchTTS(text);
        AUDIO[kind][it.l] = "data:audio/mpeg;base64," + buf.toString("base64");
        ok++;
        process.stdout.write(".");
      } catch (e) {
        fail++;
        console.log("\nFAIL " + kind + " " + it.l + " '" + text + "' -> " + e.message);
      }
    }
  }
  console.log("\nok=" + ok + " fail=" + fail);
  if (fail > 0) { console.log("Some downloads failed — not writing."); process.exit(1); }
  const js = "window.AUDIO = " + JSON.stringify(AUDIO) + ";";
  fs.writeFileSync(OUT, js);
  console.log("audio-data.js written: " + Math.round(Buffer.byteLength(js) / 1024) + " KB");
})();
