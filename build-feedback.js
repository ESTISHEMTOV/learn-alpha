// Fetches short Hebrew feedback phrases (spoken encouragement) and adds them to
// audio-data.js as AUDIO.fx = { wrong:[...], right:[...] }. This is needed
// because a child who can't read must HEAR "try again" / "well done", and the
// machine has no Hebrew TTS voice for live speech. Run: node build-feedback.js
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "audio-data.js");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const PHRASES = {
  wrong: ["אוֹפְּס"],                    // short "oops" is enough on a mistake
  right: ["כָּל הַכָּבוֹד!", "יוֹפִי!", "מְצוּיָּן!"],
};

async function tts(text){
  const url = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=iw&q=" +
              encodeURIComponent(text);
  const r = await fetch(url, { headers: { "User-Agent": UA, "Referer": "https://translate.google.com/" } });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const b = Buffer.from(await r.arrayBuffer());
  if (b.length < 800) throw new Error("too small");
  return "data:audio/mpeg;base64," + b.toString("base64");
}

(async () => {
  const g = {};
  new Function("window", fs.readFileSync(OUT, "utf8"))(g);
  const AUDIO = g.AUDIO;
  AUDIO.fx = AUDIO.fx || {};
  for (const kind of Object.keys(PHRASES)){
    // Don't clobber a human recording already merged in (e.g. mom's "כל הכבוד").
    if (AUDIO.fx[kind] && AUDIO.fx[kind].length){
      console.log("(keeping existing " + kind + " clip)");
      continue;
    }
    AUDIO.fx[kind] = [];
    for (const p of PHRASES[kind]){
      AUDIO.fx[kind].push(await tts(p));
      process.stdout.write(".");
    }
  }
  fs.writeFileSync(OUT, "window.AUDIO = " + JSON.stringify(AUDIO) + ";");
  console.log("\nfx added: wrong=" + AUDIO.fx.wrong.length + " right=" + AUDIO.fx.right.length +
              " | audio-data.js = " + Math.round(fs.statSync(OUT).size / 1024) + " KB");
})();
