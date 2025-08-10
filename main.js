import React, { useMemo, useState } from "react";

/**
 * RLVR Language Gym — Chrome Extension + PWA shell (Black + Blue theme)
 * - Mobile‑first, extension popup or PWA route
 * - Paste a Netflix/YouTube link or connect a Google Doc (MCP tool)
 * - Subtitle/paragraph explorer → card creation → SRS review
 * - RLVR panel turns on automatically for scarce languages (e.g., Hawaiian)
 */

export default function App() {
  const [url, setUrl] = useState("");
  const [connectedDoc, setConnectedDoc] = useState<string | null>(null);
  const [parsed, setParsed] = useState(false);
  const [selection, setSelection] = useState<string | null>(null);
  const [langPair, setLangPair] = useState<{ src: string; tgt: string }>({ src: "en", tgt: "haw" });

  const provider = useMemo(() => detectProvider(url), [url]);
  const scarce = useMemo(() => isScarceLanguage(langPair.tgt), [langPair.tgt]);

  const sampleSubtitles = useMemo(
    () => [
      { t: "00:01", s: "We need to open the doors now.", t2: "Pani i nā puka i kēia manawa." },
      { t: "00:05", s: "Stay close and follow my lead.", t2: "E pili mai a hahai iʻau." },
      { t: "00:09", s: "Don’t panic—breathe.", t2: "Mai hopohopo—e hanu mālie." },
      { t: "00:12", s: "Remember the passphrase: jade rabbit.", t2: "E hoʻomanaʻo i ka huaʻōlelo hūnā: lapi ʻākala." },
    ],
    []
  );

  const vocab = useMemo(
    () => [
      { word: "open", translit: "hāmama", gloss: "to open", freq: 3 },
      { word: "follow", translit: "hahai", gloss: "to follow", freq: 2 },
      { word: "breathe", translit: "hanu", gloss: "to breathe", freq: 2 },
      { word: "passphrase", translit: "huaʻōlelo hūnā", gloss: "passphrase", freq: 1 },
    ],
    []
  );

  const onParse = () => setParsed(true);
  const onCreateCard = (text: string) => setSelection(text);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-white">
      {/* Top app bar */}
      <header className="sticky top-0 z-50 backdrop-blur bg-black/50 border-b border-white/10">
        <div className="mx-auto max-w-screen-md px-4 py-3 flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-500/15 ring-1 ring-blue-400/40">
            <span className="text-blue-300 font-bold">LG</span>
          </span>
          <div className="flex-1">
            <h1 className="text-base font-semibold leading-tight">RLVR Language Gym</h1>
            <p className="text-xs text-white/60 leading-tight">Paste → Parse → Mine phrases → Cards → Review</p>
          </div>
          <InstallPWAButton />
        </div>
      </header>

      {/* Hero / Input */}
      <section className="mx-auto max-w-screen-md px-4 py-5">
        <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-4 md:p-5 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="shrink-0 px-2 py-1 rounded-xl text-[10px] uppercase tracking-wider bg-blue-500/10 text-blue-200">Media</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a Netflix / YouTube link, or any page with subtitles…"
              className="w-full bg-transparent placeholder-white/40 outline-none text-sm md:text-base"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ProviderChip label="YouTube" onClick={() => setUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")} />
            <ProviderChip label="Netflix" onClick={() => setUrl("https://www.netflix.com/title/80057281")} />
            <ProviderChip label="Generic Page" onClick={() => setUrl("https://example.com/article")} />
            <button
              onClick={onParse}
              className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-blue-400 px-4 py-2 text-black font-semibold hover:bg-blue-300"
            >
              {parsed ? "Re-Parse" : "Parse"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/70">
            <span className="px-2 py-1 rounded-xl bg-white/10">Detected: {provider || "—"}</span>
            <LangPicker value={langPair} onChange={setLangPair} />
            {scarce && <span className="ml-auto px-2 py-1 rounded-xl bg-blue-500/10 text-blue-200">Scarce language → RLVR ON</span>}
          </div>
        </div>
      </section>

      {/* MCP / Docs */}
      <section className="mx-auto max-w-screen-md px-4">
        <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Connect a Google Doc (MCP)</h2>
              <p className="text-xs text-white/60">Pull paragraphs from a sales script, travel itinerary, or chat transcript.</p>
            </div>
            <button
              onClick={() => setConnectedDoc("Q3‑Sales‑Script (en→haw)")}
              className="rounded-2xl bg-blue-400/90 px-4 py-2 text-black font-semibold hover:bg-blue-300"
            >
              {connectedDoc ? "Reconnect" : "Connect"}
            </button>
          </div>
          {connectedDoc && <p className="mt-2 text-xs text-blue-200">Connected: {connectedDoc}</p>}
        </div>
      </section>

      {/* Parsed preview & subtitle explorer */}
      <section className="mx-auto max-w-screen-md px-4 py-5 grid gap-4">
        <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-4 md:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Subtitle / Paragraph Explorer</h3>
            <span className="text-xs text-white/60">{parsed ? "Parsed sample" : "Waiting for parse…"}</span>
          </div>
          <ul className="mt-3 grid gap-2">
            {(parsed ? sampleSubtitles : []).map((row) => (
              <li key={row.t} className="rounded-2xl bg-black/30 p-3 md:p-4 border border-white/10">
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>{row.t}</span>
                  <button
                    onClick={() => onCreateCard(`${row.s}|||${row.t2}`)}
                    className="rounded-xl bg-blue-400/90 text-black px-3 py-1 font-semibold hover:bg-blue-300"
                  >
                    Add card
                  </button>
                </div>
                <p className="mt-1 text-sm md:text-base">{row.s}</p>
                <p className="mt-0.5 text-sm md:text-base text-blue-300">{row.t2}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Pop‑up dictionary / word list */}
        <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-4 md:p-5">
          <h3 className="text-sm font-semibold">Pop‑up Dictionary (inline)</h3>
          <p className="text-xs text-white/60">Tap any word to preview meaning, frequency, and pronunciation.</p>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {vocab.map((v) => (
              <div key={v.word} className="rounded-2xl bg-black/30 p-3 border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{v.word}</span>
                  <span className="text-[10px] rounded-md px-2 py-0.5 bg-white/10">★{v.freq}</span>
                </div>
                <p className="text-xs text-white/70">{v.gloss}</p>
                <p className="text-[11px] text-blue-300">{v.translit}</p>
                <button className="mt-2 w-full rounded-xl bg-blue-400 text-black text-xs py-1 font-semibold">Add to SRS</button>
              </div>
            ))}
          </div>
        </div>

        {/* SRS / Review queue preview */}
        <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-4 md:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Review Queue</h3>
            <span className="text-xs text-white/60">Spaced repetition</span>
          </div>
          <div className="mt-3 grid gap-2">
            {selection ? <Flashcard text={selection} /> : <p className="text-sm text-white/60">Select any subtitle to generate a card.</p>}
          </div>
        </div>

        {/* RLVR Panel */}
        <RLVRPanel scarce={scarce} />
      </section>

      {/* Bottom nav for mobile (PWA‑friendly) */}
      <nav className="sticky bottom-0 z-50 md:hidden backdrop-blur bg-black/50 border-t border-white/10">
        <div className="mx-auto max-w-screen-md grid grid-cols-3 text-center">
          <NavBtn label="Home" active />
          <NavBtn label="Cards" />
          <NavBtn label="Settings" />
        </div>
      </nav>

      <footer className="mx-auto max-w-screen-md px-4 py-10 text-xs text-white/50">
        <p>Media‑first learning flow with MCP Docs + RLVR hooks. Black/blue theme for a clean, professional feel.</p>
      </footer>
    </div>
  );
}

function ProviderChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl bg-white/10 px-3 py-1 text-xs hover:bg-white/20">
      {label}
    </button>
  );
}

function LangPicker({ value, onChange }: { value: { src: string; tgt: string }; onChange: (v: { src: string; tgt: string }) => void }) {
  const langs = ["en", "zh", "yue", "nan", "fi", "es", "ja", "ko", "haw"]; // add Hawaiian (haw)
  return (
    <div className="flex items-center gap-2">
      <Select list={langs} value={value.src} onChange={(src) => onChange({ ...value, src })} />
      <span className="text-white/40">→</span>
      <Select list={langs} value={value.tgt} onChange={(tgt) => onChange({ ...value, tgt })} />
    </div>
  );
}

function Select({ value, onChange, list }: { value: string; onChange: (v: string) => void; list: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-2 py-1 text-xs">
      {list.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Flashcard({ text }: { text: string }) {
  const [front, back] = text.split("|||");
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="rounded-2xl bg-black/30 p-4 border border-white/10">
      <p className="text-sm md:text-base">{revealed ? back : front}</p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => setRevealed(!revealed)} className="rounded-xl bg-white/10 px-3 py-1 text-xs">
          {revealed ? "Hide" : "Reveal"}
        </button>
        <button className="ml-auto rounded-xl bg-blue-400 text-black text-xs px-3 py-1 font-semibold">Good ✓</button>
        <button className="rounded-xl bg-white/10 text-xs px-3 py-1">Again</button>
      </div>
    </div>
  );
}

function RLVRPanel({ scarce }: { scarce: boolean }) {
  return (
    <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-4 md:p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">RLVR (Scarce‑Language Rewards)</h3>
        <span className={`text-xs ${scarce ? "text-blue-300" : "text-white/60"}`}>{scarce ? "Enabled" : "Disabled"}</span>
      </div>
      <p className="mt-1 text-xs text-white/60">
        When the target language is scarce (e.g., Hawaiian), we route translations through a verifiable‑reward loop (exact‑match + back‑translation similarity + terminology coverage). This panel displays mock metrics you can bind to your backend.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Metric label="Reward (0‑1)" value={scarce ? "0.78" : "—"} />
        <Metric label="BLEU" value={scarce ? "23.4" : "—"} />
        <Metric label="chrF" value={scarce ? "49.2" : "—"} />
        <Metric label="Cards added" value={"12"} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="rounded-2xl bg-blue-400 text-black text-xs px-3 py-1 font-semibold">Run RL step</button>
        <button className="rounded-2xl bg-white/10 text-xs px-3 py-1">Export eval</button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-black/30 p-3 border border-white/10">
      <p className="text-[11px] text-white/60">{label}</p>
      <p className="text-lg font-semibold text-blue-300">{value}</p>
    </div>
  );
}

function InstallPWAButton() {
  const [installed, setInstalled] = useState(false);
  return (
    <button onClick={() => setInstalled(true)} className="rounded-2xl bg-white/10 px-3 py-1 text-xs hover:bg-white/20" aria-label="Install PWA">
      {installed ? "Installed" : "Install"}
    </button>
  );
}

function NavBtn({ label, active }: { label: string; active?: boolean }) {
  return <button className={`py-3 text-xs ${active ? "text-blue-300" : "text-white/70"}`}>{label}</button>;
}

function detectProvider(u: string) {
  if (!u) return "";
  if (/youtube\.com|youtu\.be/.test(u)) return "YouTube";
  if (/netflix\.com/.test(u)) return "Netflix";
  if (/docs\.google\.com/.test(u)) return "Google Docs";
  return "Web";
}

function isScarceLanguage(code: string) {
  // Treat Hawaiian + any code not in common set as scarce
  const common = new Set(["en", "zh", "yue", "nan", "fi", "es", "ja", "ko"]);
  return code === "haw" || !common.has(code);
}
