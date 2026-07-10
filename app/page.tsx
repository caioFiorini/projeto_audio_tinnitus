"use client";

import { useEffect, useRef, useState } from "react";

type NoiseId = "pink" | "brown" | "rain" | "ocean" | "night";
type SoundId = NoiseId | "custom";
type CustomNoiseBase = "pink" | "brown";
type CustomWave = "sine" | "triangle";
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
  {
    id: "custom",
    name: "Meu som",
    description: "Frequência e textura ajustáveis",
    mark: "⌁",
    color: "custom",
  },
];

const perceptionLabels = ["Muito leve", "Leve", "Moderado", "Intenso", "Muito intenso"];
const GENERAL_VOLUME_MAX = 20;
const CUSTOM_VOLUME_MAX = 6;
const GENERAL_GAIN_CEILING = 0.045;
const CUSTOM_GAIN_CEILING = 0.012;

function targetGain(sound: SoundId, volume: number) {
  const maximum = sound === "custom" ? CUSTOM_VOLUME_MAX : GENERAL_VOLUME_MAX;
  const ceiling = sound === "custom" ? CUSTOM_GAIN_CEILING : GENERAL_GAIN_CEILING;
  return (Math.min(volume, maximum) / maximum) * ceiling;
}

function makeNoiseBuffer(ctx: AudioContext, id: NoiseId) {
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

function frequencyToSlider(frequency: number) {
  return (Math.log(frequency / 125) / Math.log(8000 / 125)) * 100;
}

function sliderToFrequency(position: number) {
  return Math.round(125 * Math.pow(8000 / 125, position / 100));
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function Home() {
  const [selected, setSelected] = useState<SoundId>("pink");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(5);
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
  const [showSafetyGate, setShowSafetyGate] = useState(false);
  const [safetyAccepted, setSafetyAccepted] = useState(false);
  const [customFrequency, setCustomFrequency] = useState(2000);
  const [customWave, setCustomWave] = useState<CustomWave>("sine");
  const [customBase, setCustomBase] = useState<CustomNoiseBase>("pink");
  const [customToneMix, setCustomToneMix] = useState(24);
  const [customBandwidth, setCustomBandwidth] = useState(58);
  const [customSaved, setCustomSaved] = useState(false);

  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioScheduledSourceNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);
  const lfoGainRef = useRef<GainNode | null>(null);
  const customOscillatorRef = useRef<OscillatorNode | null>(null);
  const customToneGainRef = useRef<GainNode | null>(null);

  const currentSound = sounds.find((sound) => sound.id === selected) ?? sounds[0];
  const adjustable = selected === "pink" || selected === "brown";

  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem("brisa-favorites");
      const savedEntries = localStorage.getItem("brisa-journal");
      const savedCustom = localStorage.getItem("brisa-custom-sound");
      setSafetyAccepted(localStorage.getItem("brisa-safety-v2") === "accepted");
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
      if (savedEntries) setEntries(JSON.parse(savedEntries));
      if (savedCustom) {
        const custom = JSON.parse(savedCustom);
        if (typeof custom.frequency === "number") setCustomFrequency(Math.min(8000, Math.max(125, custom.frequency)));
        if (custom.wave === "sine" || custom.wave === "triangle") setCustomWave(custom.wave);
        if (custom.base === "pink" || custom.base === "brown") setCustomBase(custom.base);
        if (typeof custom.toneMix === "number") setCustomToneMix(Math.min(60, Math.max(0, custom.toneMix)));
        if (typeof custom.bandwidth === "number") setCustomBandwidth(Math.min(100, Math.max(0, custom.bandwidth)));
      }
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
    const target = targetGain(selected, volume);
    const ctx = contextRef.current;
    const master = masterRef.current;
    if (ctx && master && isPlaying) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.15);
    }
  }, [volume, isPlaying, selected]);

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
    if (selected !== "custom") return;
    const ctx = contextRef.current;
    const filter = filterRef.current;
    const oscillator = customOscillatorRef.current;
    if (!ctx) return;
    if (filter) {
      filter.frequency.cancelScheduledValues(ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(customFrequency, ctx.currentTime + 0.15);
      filter.Q.linearRampToValueAtTime(0.5 + ((100 - customBandwidth) / 100) * 5.5, ctx.currentTime + 0.15);
    }
    if (oscillator) {
      oscillator.frequency.cancelScheduledValues(ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(customFrequency, ctx.currentTime + 0.15);
      oscillator.type = customWave;
    }
  }, [customFrequency, customBandwidth, customWave, selected]);

  useEffect(() => {
    const ctx = contextRef.current;
    const toneGain = customToneGainRef.current;
    if (ctx && toneGain && selected === "custom") {
      toneGain.gain.cancelScheduledValues(ctx.currentTime);
      toneGain.gain.linearRampToValueAtTime((customToneMix / 100) * 0.18, ctx.currentTime + 0.15);
    }
  }, [customToneMix, selected]);

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
      customOscillatorRef.current?.stop();
      contextRef.current?.close();
    };
  }, []);

  function stopAudio(withFade = true) {
    const ctx = contextRef.current;
    const master = masterRef.current;
    const source = sourceRef.current;
    const lfo = lfoRef.current;
    const customOscillator = customOscillatorRef.current;
    if (!ctx || !source) return;

    const delay = withFade ? 0.45 : 0.05;
    if (master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + delay);
    }
    window.setTimeout(() => {
      try {
        source.stop();
        lfo?.stop();
        customOscillator?.stop();
      } catch {
        // Nodes may already be stopped.
      }
    }, delay * 1000 + 40);
    sourceRef.current = null;
    lfoRef.current = null;
    customOscillatorRef.current = null;
    customToneGainRef.current = null;
  }

  async function startAudio(soundId: SoundId = selected, baseOverride: CustomNoiseBase = customBase) {
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

    source.buffer = makeNoiseBuffer(ctx, soundId === "custom" ? baseOverride : soundId);
    source.loop = true;
    filter.type = soundId === "rain" ? "highpass" : soundId === "custom" ? "bandpass" : "lowpass";
    const naturalFrequencies: Record<NoiseId, number> = {
      pink: 1100 + Math.pow(tone / 100, 1.35) * 9000,
      brown: 1100 + Math.pow(tone / 100, 1.35) * 9000,
      rain: 820,
      ocean: 2400,
      night: 4300,
    };
    filter.frequency.value = soundId === "custom" ? customFrequency : naturalFrequencies[soundId];
    filter.Q.value = soundId === "custom" ? 0.5 + ((100 - customBandwidth) / 100) * 5.5 : 0.45;
    master.gain.value = 0;
    compressor.threshold.value = -30;
    compressor.knee.value = 5;
    compressor.ratio.value = 20;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    lfo.frequency.value = soundId === "ocean" ? 0.09 : 0.16;
    lfoGain.gain.value = (texture / 100) * 0.018;

    source.connect(filter);
    filter.connect(master);
    let customOscillator: OscillatorNode | null = null;
    let customToneGain: GainNode | null = null;
    if (soundId === "custom") {
      customOscillator = ctx.createOscillator();
      customToneGain = ctx.createGain();
      customOscillator.type = customWave;
      customOscillator.frequency.value = customFrequency;
      customToneGain.gain.value = (customToneMix / 100) * 0.18;
      customOscillator.connect(customToneGain);
      customToneGain.connect(master);
    }
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);
    master.connect(compressor);
    compressor.connect(ctx.destination);

    source.start();
    lfo.start();
    customOscillator?.start();
    const target = targetGain(soundId, volume);
    master.gain.linearRampToValueAtTime(target, ctx.currentTime + 1.2);

    sourceRef.current = source;
    filterRef.current = filter;
    masterRef.current = master;
    lfoRef.current = lfo;
    lfoGainRef.current = lfoGain;
    customOscillatorRef.current = customOscillator;
    customToneGainRef.current = customToneGain;
  }

  async function togglePlay() {
    if (isPlaying) {
      stopAudio();
      setIsPlaying(false);
      return;
    }
    if (!safetyAccepted) {
      setShowSafetyGate(true);
      return;
    }
    const safeMinutes = selected === "custom" ? Math.min(timerMinutes, 10) : timerMinutes;
    if (remaining === 0 || (selected === "custom" && remaining > 10 * 60)) setRemaining(safeMinutes * 60);
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
    if (id === "custom") {
      if (volume > CUSTOM_VOLUME_MAX) setVolume(4);
      setTimerMinutes(5);
      setRemaining(5 * 60);
    } else if (selected === "custom" && timerMinutes <= 10) {
      setTimerMinutes(30);
      setRemaining(30 * 60);
    }
    if (wasPlaying) {
      await startAudio(id);
    }
  }

  function setTimer(minutes: number) {
    const safeMinutes = selected === "custom" ? Math.min(minutes, 10) : minutes;
    setTimerMinutes(safeMinutes);
    setRemaining(safeMinutes * 60);
  }

  function acceptSafetyGate() {
    localStorage.setItem("brisa-safety-v2", "accepted");
    setSafetyAccepted(true);
    setVolume(selected === "custom" ? 2 : 3);
    setShowSafetyGate(false);
  }

  function toggleFavorite(id: SoundId) {
    const updated = favorites.includes(id)
      ? favorites.filter((favorite) => favorite !== id)
      : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem("brisa-favorites", JSON.stringify(updated));
  }

  function saveCustomSound() {
    localStorage.setItem("brisa-custom-sound", JSON.stringify({
      frequency: customFrequency,
      wave: customWave,
      base: customBase,
      toneMix: customToneMix,
      bandwidth: customBandwidth,
    }));
    setCustomSaved(true);
    window.setTimeout(() => setCustomSaved(false), 2200);
  }

  function nudgeFrequency(amount: number) {
    setCustomFrequency((current) => Math.min(8000, Math.max(125, current + amount)));
  }

  async function changeCustomBase(base: CustomNoiseBase) {
    setCustomBase(base);
    if (isPlaying && selected === "custom") {
      stopAudio(false);
      await startAudio("custom", base);
    }
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
          <a href="#laboratorio">Criar som</a>
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
            <p>O app reduz a saída digital, mas não mede dB nem controla o volume físico do aparelho. Comece quase inaudível e abaixo do zumbido. Se houver piora, dor, pressão ou tontura, pare.</p>
          </div>
          <button onClick={() => setShowSafety(false)} aria-label="Fechar aviso">×</button>
        </aside>
      )}

      {showSafetyGate && (
        <div className="safety-gate" role="dialog" aria-modal="true" aria-labelledby="safety-gate-title">
          <div className="safety-gate-card">
            <span className="gate-icon" aria-hidden="true">◖</span>
            <span className="eyebrow"><span /> PROTEÇÃO AUDITIVA</span>
            <h2 id="safety-gate-title">Antes de iniciar qualquer som</h2>
            <p>O Brisa limita o sinal dentro do aplicativo, mas celulares e fones têm potências diferentes. Por isso, nenhum app consegue garantir sozinho um nível seguro em dB.</p>
            <ol>
              <li><strong>Abaixe o volume físico</strong> do celular ou computador até o mínimo.</li>
              <li>Inicie o som e aumente somente até ficar <strong>quase audível</strong>, nunca para cobrir completamente o zumbido.</li>
              <li>Use em ambiente tranquilo e faça pausas. Se houver desconforto, piora, pressão, dor ou tontura, <strong>pare imediatamente</strong>.</li>
            </ol>
            <div className="gate-note"><span aria-hidden="true">!</span> Frequências personalizadas ficam limitadas a sessões de 5 ou 10 minutos e têm um teto ainda menor.</div>
            <div className="gate-actions"><button className="secondary-action" onClick={() => setShowSafetyGate(false)}>Agora não</button><button className="primary-action" onClick={acceptSafetyGate}>Entendi e baixei o aparelho</button></div>
          </div>
        </div>
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
            <input id="volume" type="range" min="0" max={selected === "custom" ? CUSTOM_VOLUME_MAX : GENERAL_VOLUME_MAX} value={volume} onChange={(event) => setVolume(Number(event.target.value))} style={{ "--range-progress": `${(volume / (selected === "custom" ? CUSTOM_VOLUME_MAX : GENERAL_VOLUME_MAX)) * 100}%` } as React.CSSProperties} />
            <span aria-hidden="true">◗</span>
            <output>{volume}%</output>
          </div>
          <p className="volume-note"><span aria-hidden="true">⌁</span> {selected === "custom" ? "Modo personalizado · teto interno reduzido a 6%" : "Teto digital reduzido · o volume físico também deve ficar baixo"}</p>
        </article>

        <div className="control-column">
          <article className="control-card timer-card">
            <div className="card-heading">
              <div><span className="heading-icon clock" aria-hidden="true">◷</span><div><h3>Temporizador</h3><p>O som termina suavemente</p></div></div>
              <strong className="time-left">{formatTime(remaining)}</strong>
            </div>
            <div className="timer-options" role="group" aria-label="Duração da sessão">
              {(selected === "custom" ? [5, 10] : [15, 30, 45, 60]).map((minutes) => (
                <button key={minutes} className={timerMinutes === minutes ? "active" : ""} onClick={() => setTimer(minutes)}>{minutes} min</button>
              ))}
            </div>
          </article>

          <article className={`control-card adjust-card ${!adjustable && selected !== "custom" ? "disabled" : ""}`}>
            <div className="card-heading">
              <div><span className="heading-icon tune" aria-hidden="true">⌁</span><div><h3>{selected === "custom" ? "Seu som personalizado" : "Ajuste para seu conforto"}</h3><p>{selected === "custom" ? `${customFrequency.toLocaleString("pt-BR")} Hz · ajustes no laboratório abaixo` : adjustable ? `Personalize o ${currentSound.name.toLowerCase()}` : "Disponível nos ruídos rosa e marrom"}</p></div></div>
              <span className="live-badge">AO VIVO</span>
            </div>
            {selected === "custom" ? (
              <div className="custom-active-summary">
                <span className="mini-spectrum" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></span>
                <div><strong>{customWave === "sine" ? "Onda senoidal" : "Onda triangular"}</strong><small>Base de ruído {customBase === "pink" ? "rosa" : "marrom"} · tom limitado</small></div>
                <a href="#laboratorio">Ajustar</a>
              </div>
            ) : (
              <>
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
              </>
            )}
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

      <section className="frequency-lab" id="laboratorio" aria-labelledby="lab-title">
        <div className="lab-intro">
          <span className="eyebrow"><span /> CRIAÇÃO GUIADA</span>
          <h2 id="lab-title">Encontre um som parecido com o seu</h2>
          <p>Compare com calma e pare no tom que parecer mais próximo. Isso cria uma referência pessoal de conforto — não é um exame nem identifica uma frequência clínica.</p>
          <div className="lab-safety">
            <span aria-hidden="true">!</span>
            <div><strong>Antes de testar</strong><p>Comece no volume mínimo. Não tente encobrir completamente o zumbido e interrompa se o tom incomodar, causar pressão, dor ou piora.</p></div>
          </div>
        </div>

        <article className="lab-panel">
          <div className="lab-panel-header">
            <div><span className="lab-status"><i /> SOM PERSONALIZADO</span><strong>{customFrequency.toLocaleString("pt-BR")} <small>Hz</small></strong><p>{customFrequency < 500 ? "Região grave" : customFrequency < 2000 ? "Região média" : customFrequency < 5000 ? "Região aguda" : "Região bem aguda"}</p></div>
            <span className="frequency-orb" aria-hidden="true"><i /><i /><i /></span>
          </div>

          <div className="frequency-presets" role="group" aria-label="Frequências de referência">
            {[250, 500, 1000, 2000, 4000, 6000, 8000].map((frequency) => (
              <button key={frequency} className={customFrequency === frequency ? "active" : ""} onClick={() => setCustomFrequency(frequency)}>{frequency >= 1000 ? `${frequency / 1000}k` : frequency}</button>
            ))}
          </div>

          <div className="frequency-control">
            <div className="slider-label"><label htmlFor="custom-frequency">Ajuste fino da frequência</label><span>escala auditiva</span></div>
            <input id="custom-frequency" type="range" min="0" max="100" step="0.1" value={frequencyToSlider(customFrequency)} onChange={(event) => setCustomFrequency(sliderToFrequency(Number(event.target.value)))} style={{ "--range-progress": `${frequencyToSlider(customFrequency)}%` } as React.CSSProperties} />
            <div className="frequency-nudge"><button onClick={() => nudgeFrequency(-50)}>− 50 Hz</button><span>125 Hz</span><span>8.000 Hz</span><button onClick={() => nudgeFrequency(50)}>+ 50 Hz</button></div>
          </div>

          <div className="lab-options-grid">
            <fieldset>
              <legend>Formato da onda</legend>
              <div className="segmented-control">
                <button className={customWave === "sine" ? "active" : ""} onClick={() => setCustomWave("sine")}><span aria-hidden="true">∿</span> Suave</button>
                <button className={customWave === "triangle" ? "active" : ""} onClick={() => setCustomWave("triangle")}><span aria-hidden="true">⌃</span> Triangular</button>
              </div>
            </fieldset>
            <fieldset>
              <legend>Base de conforto</legend>
              <div className="segmented-control">
                <button className={customBase === "pink" ? "active" : ""} onClick={() => changeCustomBase("pink")}>Ruído rosa</button>
                <button className={customBase === "brown" ? "active" : ""} onClick={() => changeCustomBase("brown")}>Ruído marrom</button>
              </div>
            </fieldset>
          </div>

          <div className="lab-sliders">
            <div className="adjustment-row">
              <div className="slider-label"><label htmlFor="tone-mix">Presença do tom</label><span>{customToneMix < 18 ? "discreta" : customToneMix < 38 ? "suave" : "mais presente"}</span></div>
              <input id="tone-mix" type="range" min="0" max="60" value={customToneMix} onChange={(event) => setCustomToneMix(Number(event.target.value))} style={{ "--range-progress": `${(customToneMix / 60) * 100}%` } as React.CSSProperties} />
              <div className="range-ends"><span>Só ruído</span><span>Tom limitado</span></div>
            </div>
            <div className="adjustment-row">
              <div className="slider-label"><label htmlFor="bandwidth">Faixa ao redor do tom</label><span>{customBandwidth < 34 ? "estreita" : customBandwidth > 68 ? "ampla" : "moderada"}</span></div>
              <input id="bandwidth" type="range" min="0" max="100" value={customBandwidth} onChange={(event) => setCustomBandwidth(Number(event.target.value))} style={{ "--range-progress": `${customBandwidth}%` } as React.CSSProperties} />
              <div className="range-ends"><span>Estreita</span><span>Ampla</span></div>
            </div>
          </div>

          <div className="lab-actions">
            <p><span aria-hidden="true">⌁</span> No modo personalizado, o app reduz automaticamente o teto interno para 6% e limita a sessão a 10 minutos.</p>
            <div><button className="secondary-action" onClick={saveCustomSound}>{customSaved ? "✓ Salvo neste aparelho" : "Salvar ajuste"}</button><button className="primary-action" onClick={() => chooseSound("custom")}>{selected === "custom" ? "Som selecionado" : "Usar no player"}</button></div>
          </div>
        </article>
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
