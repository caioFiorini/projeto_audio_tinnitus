import type { SoundId } from "./types";

export const CLINICAL_CONTENT = {
  version: "2026.07-mvp.1",
  reviewedAt: "2026-07-10",
  weights: { profile: 0.4, comfort: 0.2, awareness: 0.15, annoyance: 0.15, relaxation: 0.1, worseningPenalty: 0.35, adversePenalty: 0.5 },
  sounds: {
    white_noise: { name: "Ruído branco suavizado", evidence: "supportive", description: "Enriquecimento sonoro de banda larga." },
    pink_noise: { name: "Ruído rosa", evidence: "supportive", description: "Som estável e suave para reduzir o contraste com o silêncio." },
    brown_noise: { name: "Ruído marrom", evidence: "supportive", description: "Alternativa com maior presença de frequências graves." },
    rain: { name: "Chuva contínua", evidence: "supportive", description: "Som natural estável, útil para conforto e sono." },
    ocean: { name: "Água corrente suave", evidence: "supportive", description: "Som natural de baixa variabilidade." },
    narrowband_noise: { name: "Ruído de banda estreita", evidence: "limited", description: "Teste curto perto da faixa percebida, quando apropriado." },
    pure_tone: { name: "Tom puro", evidence: "limited", description: "Apenas para comparação curta e opcional." },
  } satisfies Record<SoundId, { name: string; evidence: "supportive" | "limited"; description: string }>,
} as const;
