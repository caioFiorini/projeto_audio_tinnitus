"use client";

import { useEffect, useRef, useState } from "react";

type SoundId = "pink" | "brown" | "rain" | "ocean" | "night";
type JournalEntry = {
  id: number;
  date: string;
  perception: number;
  note: string;
};

const sounds: Array<{
  id: SoundId;
  name: string;
  description: string;
  mark: string;
  color: string;
}> = [
  {
    id: "pink",
    name: "Ruído rosa",
    description: "Equilibrado e delicado",
    mark: "≈",
    color: "rose",
  },
  {
    id: "brown",
    name: "Ruído marrom",
    description: "Grave e acolhedor",
    mark: "∿",
    color: "earth",
  },
  {
    id: "rain",
    name: "Chuva leve",
    description: "Constante e refrescante",
    mark: "·",
    color: "blue",
  },
  {
    id: "ocean",
    name: "Ondas calmas",
    description: "Ritmo lento e natural",
    mark: "≋",
    color: "aqua",
  },
  {
    id: "night",
    name: "Noite serena",
    description: "Ambiente suave e espaçado",
    mark: "◔",
    color: "violet",
  },
];

const perceptionLabels = ["Muito leve", "Leve", "Moderado", "Intenso", "Muito intenso"];

function makeNoiseBuffer(ctx: AudioContext, id: SoundId) {
  const seconds = 10;
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    brown = (brown + 0.02 * white) / 1.02;
    const brownSample = brown * 3.2;

    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const pinkSample = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;

    const t = i / ctx.sampleRate;
    if (id === "pink") data[i] = pinkSample * 0.72;
    if (id === "brown") data[i] = brownSample * 0.76;
    if (id === "rain") {
      const softPulse = 0.78 + Math.sin(t * 0.47) * 0.08 + Math.sin(t * 1.13) * 0.05;
      data[i] = (white * 0.34 + pinkSample * 0.26) * softPulse;
    }
    if (id === "ocean") {
      const swell = 0.22 + Math.pow((Math.sin(t * 0.72 - 1.2) + 1) / 2, 1.7) * 0.78;
      data[i] = brownSample * swell * 0.62 + pinkSample * 0.08;
    }
    if (id === "night") {
      let chirp = 0;
      const cycle = t % 4.7;
      if (cycle > 1.1 && cycle < 1.27) {
        const p = (cycle - 1.1) / 0.17;
        chirp = Math.sin(2 * Math.PI * (1850 + p * 620) * t) * Math.sin(Math.PI * p) * 0.055;
      }
      data[i] = brownSample * 0.28 + pinkSample * 0.12 + chirp;
    }
  }

  const fade = Math.min(4096, Math.floor(length / 10));
  for (let i = 0; i < fade; i += 1) {
    const mix = i / fade;
    const tailIndex = length - fade + i;
    data[tailIndex] = data[tailIndex] * (1 - mix) + data[i] * mix;
  }
  return buffer;
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function Home() {
  const [selected, setSelected] = useState<SoundId>("pink");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(10);
  const [tone, setTone] = useState(48);
  const [texture, setTexture] = useState(28);
  const [timerMinutes, setTimerMinutes] = useState(30);
  const [remaining, setRemaining] = useState(30 * 60);
  const [favorites, setFavorites] = useState<SoundId[]>(["pink"]);
  const [perception, setPerception] = useState(3);
  const [note, setNote] = useState("");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [journalSaved, setJournalSaved] = useState(false);
  const [showSafety, setShowSafety] = useState(false);

  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);
  const lfoGainRef = useRef<GainNode | null>(null);

  const currentSound = sounds.find((sound) => sound.id === selected) ?? sounds[0];
  const adjustable = selected === "pink" || selected === "brown";

  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem("brisa-favorites");
      const savedEntries = localStorage.getItem("brisa-journal");
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
      if (savedEntries) setEntries(JSON.parse(savedEntries));
    } catch {
      // Local preferences are optional; the app keeps working without them.
    }
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          stopAudio();
          setIsPlaying(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    const target = (volume / 35) * 0.12;
    const ctx = contextRef.current;
    const master = masterRef.current;
    if (ctx && master && isPlaying) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.15);
    }
  }, [volume, isPlaying]);

  useEffect(() => {
    const filter = filterRef.current;
    const ctx = contextRef.current;
    if (filter && ctx && adjustable) {
      const frequency = 1100 + Math.pow(tone / 100, 1.35) * 9000;
      filter.frequency.cancelScheduledValues(ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(frequency, ctx.currentTime + 0.2);
    }
  }, [tone, adjustable]);

  useEffect(() => {
    const lfoGain = lfoGainRef.current;
    const ctx = contextRef.current;
    if (lfoGain && ctx) {
      lfoGain.gain.linearRampToValueAtTime((texture / 100) * 0.018, ctx.currentTime + 0.2);
    }
  }, [texture]);

  useEffect(() => {
    return () => {
      sourceRef.current?.stop();
      lfoRef.current?.stop();
      contextRef.current?.close();
    };
  }, []);

  function stopAudio(withFade = true) {
    const ctx = contextRef.current;
    const master = masterRef.current;
    const source = sourceRef.current;
    const lfo = lfoRef.current;
    if (!ctx || !source) return;

    const delay = withFade ? 0.32 : 0.03;
    if (master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + delay);
    }
    window.setTimeout(() => {
      try {
        source.stop();
        lfo?.stop();
      } catch {
        // Nodes may already be stopped.
      }
    }, delay * 1000 + 40);
    sourceRef.current = null;
    lfoRef.current = null;
  }

  async function startAudio(soundId: SoundId = selected) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = contextRef.current ?? new AudioContextClass();
    contextRef.current = ctx;
    if (ctx.state === "suspended") await ctx.resume();

    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const master = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    source.buffer = makeNoiseBuffer(ctx, soundId);
    source.loop = true;
    filter.type = soundId === "rain" ? "highpass" : "lowpass";
    const naturalFrequencies: Record<SoundId, number> = {
      pink: 1100 + Math.pow(tone / 100, 1.35) * 9000,
      brown: 1100 + Math.pow(tone / 100, 1.35) * 9000,
      rain: 820,
      ocean: 2400,
      night: 4300,
    };
    filter.frequency.value = naturalFrequencies[soundId];
    filter.Q.value = 0.45;
    master.gain.value = 0;
    compressor.threshold.value = -22;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.02;
    compressor.release.value = 0.35;
    lfo.frequency.value = soundId === "ocean" ? 0.09 : 0.16;
    lfoGain.gain.value = (texture / 100) * 0.018;

    source.connect(filter);
    filter.connect(master);
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);
    master.connect(compressor);
    compressor.connect(ctx.destination);

    source.start();
    lfo.start();
    const target = (volume / 35) * 0.12;
    master.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.8);

    sourceRef.current = source;
    filterRef.current = filter;
    masterRef.current = master;
    lfoRef.current = lfo;
    lfoGainRef.current = lfoGain;
  }

  async function togglePlay() {
    if (isPlaying) {
      stopAudio();
      setIsPlaying(false);
      return;
    }
    if (remaining === 0) setRemaining(timerMinutes * 60);
    await startAudio();
    setIsPlaying(true);
  }

  async function chooseSound(id: SoundId) {
    if (id === selected) return;
    const wasPlaying = isPlaying;
    if (wasPlaying) stopAudio(false);
    setSelected(id);
    if (id === "brown") setTone(36);
    if (id === "pink") setTone(48);
    if (wasPlaying) {
      await startAudio(id);
    }
  }

  function setTimer(minutes: number) {
    setTimerMinutes(minutes);
    setRemaining(minutes * 60);
  }

  function toggleFavorite(id: SoundId) {
    const updated = favorites.includes(id)
      ? favorites.filter((favorite) => favorite !== id)
      : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem("brisa-favorites", JSON.stringify(updated));
  }

  function saveJournal() {
    const entry: JournalEntry = {
      id: Date.now(),
      date: new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
      perception,
      note: note.trim(),
    };
    const updated = [entry, ...entries].slice(0, 12);
    setEntries(updated);
    setNote("");
    setJournalSaved(true);
    localStorage.setItem("brisa-journal", JSON.stringify(updated));
    window.setTimeout(() => setJournalSaved(false), 2200);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Brisa, início">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>brisa</span>
        </a>
        <nav className="nav-links" aria-label="Navegação principal">
          <a className="active" href="#ouvir">Ouvir</a>
          <a href="#diario">Meu diário</a>
          <button className="help-button" onClick={() => setShowSafety((value) => !value)} aria-expanded={showSafety}>
            <span aria-hidden="true">?</span> Uso cuidadoso
          </button>
        </nav>
      </header>

      {showSafety && (
        <aside className="safety-banner" role="note">
          <div>
            <strong>Som de apoio, não tratamento médico.</strong>
            <p>Comece quase inaudível e mantenha abaixo do zumbido. Se houver piora, dor, pressão ou tontura, pare. Não altere medicação sem falar com o profissional que prescreveu.</p>
          </div>
          <button onClick={() => setShowSafety(false)} aria-label="Fechar aviso">×</button>
        </aside>
      )}

      <section className="hero" id="inicio">
        <div>
          <span className="eyebrow"><span /> Seu espaço de conforto</span>
          <h1>Um pouco de calma,<br /><em>um som de cada vez.</em></h1>
        </div>
        <p>Crie uma paisagem sonora suave para reduzir a percepção do zumbido e respirar com mais tranquilidade.</p>
      </section>

      <section className="listening-grid" id="ouvir">
        <article className={`player-card ${isPlaying ? "is-playing" : ""}`}>
          <div className="player-topline">
            <span>TOCANDO AGORA</span>
            <button
              className={`favorite-main ${favorites.includes(selected) ? "selected" : ""}`}
              onClick={() => toggleFavorite(selected)}
              aria-label={favorites.includes(selected) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
              {favorites.includes(selected) ? "♥" : "♡"}
            </button>
          </div>

          <div className="sound-visual" aria-hidden="true">
            <span className="orbit orbit-one" />
            <span className="orbit orbit-two" />
            <span className="sound-core">{currentSound.mark}</span>
          </div>

          <div className="now-playing">
            <p>{currentSound.description}</p>
            <h2>{currentSound.name}</h2>
          </div>

          <div className="transport">
            <button className="skip" onClick={() => chooseSound(sounds[(sounds.findIndex((s) => s.id === selected) + sounds.length - 1) % sounds.length].id)} aria-label="Som anterior">‹</button>
            <button className="play-button" onClick={togglePlay} aria-label={isPlaying ? "Pausar som" : "Reproduzir som"}>
              <span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>
            </button>
            <button className="skip" onClick={() => chooseSound(sounds[(sounds.findIndex((s) => s.id === selected) + 1) % sounds.length].id)} aria-label="Próximo som">›</button>
          </div>

          <div className="volume-control">
            <span aria-hidden="true">◖</span>
            <label className="sr-only" htmlFor="volume">Volume interno</label>
            <input id="volume" type="range" min="0" max="35" value={volume} onChange={(event) => setVolume(Number(event.target.value))} style={{ "--range-progress": `${(volume / 35) * 100}%` } as React.CSSProperties} />
            <span aria-hidden="true">◗</span>
            <output>{volume}%</output>
          </div>
          <p className="volume-note"><span aria-hidden="true">⌁</span> Limite interno conservador · comece quase inaudível</p>
        </article>

        <div className="control-column">
          <article className="control-card timer-card">
            <div className="card-heading">
              <div><span className="heading-icon clock" aria-hidden="true">◷</span><div><h3>Temporizador</h3><p>O som termina suavemente</p></div></div>
              <strong className="time-left">{formatTime(remaining)}</strong>
            </div>
            <div className="timer-options" role="group" aria-label="Duração da sessão">
              {[15, 30, 45, 60].map((minutes) => (
                <button key={minutes} className={timerMinutes === minutes ? "active" : ""} onClick={() => setTimer(minutes)}>{minutes} min</button>
              ))}
            </div>
          </article>

          <article className={`control-card adjust-card ${!adjustable ? "disabled" : ""}`}>
            <div className="card-heading">
              <div><span className="heading-icon tune" aria-hidden="true">⌁</span><div><h3>Ajuste para seu conforto</h3><p>{adjustable ? `Personalize o ${currentSound.name.toLowerCase()}` : "Disponível nos ruídos rosa e marrom"}</p></div></div>
              <span className="live-badge">AO VIVO</span>
            </div>
            <div className="adjustment-row">
              <div className="slider-label"><label htmlFor="tone">Timbre</label><span>{tone < 40 ? "mais macio" : tone > 66 ? "mais claro" : "equilibrado"}</span></div>
              <input id="tone" type="range" min="0" max="100" value={tone} disabled={!adjustable} onChange={(event) => setTone(Number(event.target.value))} style={{ "--range-progress": `${tone}%` } as React.CSSProperties} />
              <div className="range-ends"><span>Grave</span><span>Claro</span></div>
            </div>
            <div className="adjustment-row">
              <div className="slider-label"><label htmlFor="texture">Movimento</label><span>{texture < 35 ? "estável" : texture > 68 ? "envolvente" : "suave"}</span></div>
              <input id="texture" type="range" min="0" max="100" value={texture} disabled={!adjustable} onChange={(event) => setTexture(Number(event.target.value))} style={{ "--range-progress": `${texture}%` } as React.CSSProperties} />
              <div className="range-ends"><span>Estável</span><span>Envolvente</span></div>
            </div>
            <p className="adjust-tip"><span aria-hidden="true">✦</span> Faça mudanças pequenas e espere alguns instantes antes de ajustar de novo.</p>
          </article>
        </div>
      </section>

      <section className="library-section" aria-labelledby="library-title">
        <div className="section-heading">
          <div><span className="eyebrow"><span /> PAISAGENS SONORAS</span><h2 id="library-title">Encontre o som que acolhe você</h2></div>
          <span className="favorite-count">♥ {favorites.length} favorito{favorites.length === 1 ? "" : "s"}</span>
        </div>
        <div className="sound-library">
          {sounds.map((sound) => (
            <article key={sound.id} className={`sound-card ${selected === sound.id ? "selected" : ""}`}>
              <button className="sound-select" onClick={() => chooseSound(sound.id)} aria-label={`Selecionar ${sound.name}`}>
                <span className={`sound-icon ${sound.color}`} aria-hidden="true">{sound.mark}</span>
                <span className="sound-copy"><strong>{sound.name}</strong><small>{sound.description}</small></span>
                {selected === sound.id && <span className="selected-wave" aria-hidden="true"><i /><i /><i /><i /></span>}
              </button>
              <button className={`mini-favorite ${favorites.includes(sound.id) ? "selected" : ""}`} onClick={() => toggleFavorite(sound.id)} aria-label={favorites.includes(sound.id) ? `Remover ${sound.name} dos favoritos` : `Favoritar ${sound.name}`}>{favorites.includes(sound.id) ? "♥" : "♡"}</button>
            </article>
          ))}
        </div>
      </section>

      <section className="journal-section" id="diario">
        <div className="journal-intro">
          <span className="eyebrow"><span /> PERCEPÇÃO</span>
          <h2>Como o zumbido está agora?</h2>
          <p>Registrar sem julgamento ajuda a reconhecer horários, sons e hábitos que trazem mais conforto.</p>
          <div className="privacy-note"><span aria-hidden="true">⌂</span><div><strong>Privado neste aparelho</strong><small>Seus registros não são enviados para nenhum lugar.</small></div></div>
        </div>

        <article className="journal-card">
          <div className="perception-scale" role="radiogroup" aria-label="Intensidade percebida do zumbido">
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} role="radio" aria-checked={perception === value} className={perception === value ? "active" : ""} onClick={() => setPerception(value)}>
                <span>{value}</span><small>{perceptionLabels[value - 1]}</small>
              </button>
            ))}
          </div>
          <label htmlFor="note">Algo ajudou ou incomodou? <span>(opcional)</span></label>
          <textarea id="note" value={note} maxLength={240} onChange={(event) => setNote(event.target.value)} placeholder="Ex.: Depois de 20 minutos com ruído marrom, senti mais conforto..." />
          <div className="journal-actions"><span>{note.length}/240</span><button onClick={saveJournal}>{journalSaved ? "✓ Registro salvo" : "Salvar percepção"}</button></div>
        </article>
      </section>

      {entries.length > 0 && (
        <section className="recent-section" aria-labelledby="recent-title">
          <h2 id="recent-title">Registros recentes</h2>
          <div className="recent-list">
            {entries.slice(0, 3).map((entry) => (
              <article key={entry.id}><span className="entry-score">{entry.perception}</span><div><strong>{perceptionLabels[entry.perception - 1]}</strong><small>{entry.date}</small>{entry.note && <p>{entry.note}</p>}</div></article>
            ))}
          </div>
        </section>
      )}

      <section className="care-callout">
        <span className="care-symbol" aria-hidden="true">+</span>
        <div><strong>Cuide também da causa</strong><p>Zumbido após medicação merece conversa com o médico e avaliação com otorrino ou fonoaudiólogo. Se o som pulsar com o coração, surgir de repente com perda auditiva, fraqueza ou vertigem, procure atendimento.</p></div>
      </section>

      <footer>
        <a className="brand footer-brand" href="#inicio"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>brisa</span></a>
        <p>Um apoio gentil para momentos mais tranquilos.</p>
        <span>Não substitui orientação médica.</span>
      </footer>
    </main>
  );
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
