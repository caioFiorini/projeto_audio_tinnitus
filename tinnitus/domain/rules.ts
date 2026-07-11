import { CLINICAL_CONTENT } from "./config";
import type { AlertKey, SafetyResult, SoundId, SoundRecommendation, SoundTrialResult, TinnitusPhenotype, TinnitusProfile } from "./types";

const BLOCKING: AlertKey[] = ["pulsatile", "sudden_hearing_loss", "neurological_symptoms", "recent_trauma", "ear_pain_or_discharge", "unsafe"];
const REFERRAL: AlertKey[] = ["unilateral", "hearing_asymmetry", "severe_vertigo"];
const alertCopy: Record<AlertKey, string> = {
  pulsatile: "O som acompanha o pulso. Procure avaliação médica antes de testar sons.", sudden_onset: "Início súbito merece avaliação profissional.", sudden_hearing_loss: "Redução súbita da audição requer avaliação urgente.", unilateral: "Zumbido em um lado merece avaliação com otorrino e audiometria.", hearing_asymmetry: "Diferença de audição entre os ouvidos merece avaliação profissional.", severe_vertigo: "Tontura intensa ou vertigem requer avaliação profissional.", neurological_symptoms: "Sintomas neurológicos requerem avaliação urgente.", ear_pain_or_discharge: "Dor forte, secreção ou sangramento requerem avaliação médica.", recent_trauma: "Sintomas após trauma requerem avaliação médica.", unsafe: "Se você não se sente em segurança, procure apoio de emergência ou uma pessoa de confiança agora.",
};

export function evaluateSafety(alerts: AlertKey[]): SafetyResult {
  const blockedAlerts = alerts.filter((alert) => BLOCKING.includes(alert));
  const referralAlerts = alerts.filter((alert) => REFERRAL.includes(alert));
  return { blocked: blockedAlerts.length > 0, referral: referralAlerts.length > 0, blockedAlerts, reasons: [...blockedAlerts, ...referralAlerts].map((key) => alertCopy[key]) };
}

export function classify(profile: TinnitusProfile, alerts: AlertKey[]): TinnitusPhenotype[] {
  const phenotypes = new Set<TinnitusPhenotype>();
  const tonal = profile.perceivedSounds.some((value) => ["apito", "tom eletrônico", "assobio"].includes(value));
  if (alerts.includes("pulsatile") || profile.temporalPattern.includes("pulsante")) phenotypes.add("pulsatile");
  if (tonal) phenotypes.add(profile.temporalPattern.includes("flutuante") ? "tonal_variable" : "tonal_stable");
  if (profile.perceivedSounds.some((value) => ["chiado", "estática", "cigarra", "vento", "cachoeira"].includes(value))) phenotypes.add("noise_like_broadband");
  if (profile.hearingProfile !== "no_known_hearing_loss" && profile.hearingProfile !== "unknown") phenotypes.add("hearing_loss_associated");
  if (profile.soundSensitivity === "severe" || profile.soundSensitivity === "reactive_tinnitus") phenotypes.add("reactive");
  if (profile.somaticModulation !== "none" && profile.somaticModulation !== "unknown") phenotypes.add("somatosensory");
  if (profile.impact.sleepImpact >= 7) phenotypes.add("sleep_dominant");
  if (Math.max(profile.impact.emotionalDistress, profile.impact.hypervigilance) >= 7) phenotypes.add("stress_dominant");
  if (!["no_clear_relation", "unknown"].includes(profile.medicationRelation)) phenotypes.add("medication_temporal_association");
  if (!phenotypes.size) phenotypes.add("unclassified");
  return [...phenotypes];
}

export function recommend(profile: TinnitusProfile, alerts: AlertKey[], trials: SoundTrialResult[]): SoundRecommendation[] {
  const safety = evaluateSafety(alerts);
  if (safety.blocked) return [];
  const phenotypes = classify(profile, alerts);
  const highSensitivity = profile.soundSensitivity === "severe" || profile.soundSensitivity === "reactive_tinnitus" || safety.referral;
  const ids: SoundId[] = ["pink_noise", "rain", "brown_noise", "white_noise", "ocean", "narrowband_noise", "pure_tone"];
  return ids.map((soundId) => {
    const content = CLINICAL_CONTENT.sounds[soundId];
    const reasons: string[] = [];
    const cautions: string[] = ["Comece no menor volume audível e interrompa se houver piora ou desconforto."];
    let compatibility = 40;
    if (["pink_noise", "rain", "ocean"].includes(soundId) && (phenotypes.includes("reactive") || phenotypes.includes("sleep_dominant"))) { compatibility += 35; reasons.push("Som estável e suave compatível com a necessidade de conforto ou sono."); }
    if (soundId === "brown_noise" && (phenotypes.includes("noise_like_broadband") || phenotypes.includes("sleep_dominant"))) { compatibility += 30; reasons.push("Alternativa grave para teste de enriquecimento sonoro."); }
    if (soundId === "white_noise" && phenotypes.includes("noise_like_broadband")) { compatibility += 25; reasons.push("Som de banda larga compatível com um padrão de chiado ou estática."); }
    if (soundId === "narrowband_noise" && phenotypes.includes("tonal_stable")) { compatibility += 30; reasons.push("O padrão tonal estável pode justificar um teste curto e controlado."); }
    if (soundId === "pure_tone" && phenotypes.includes("tonal_stable")) { compatibility += 15; reasons.push("Pode ajudar apenas a comparar a faixa percebida, sem finalidade diagnóstica."); }
    if (!reasons.length) reasons.push("Opção de suporte para testar a resposta individual com segurança.");
    const prohibited = highSensitivity && ["narrowband_noise", "pure_tone"].includes(soundId);
    if (prohibited) cautions.push("Bloqueado inicialmente por sensibilidade sonora alta ou necessidade de avaliação profissional.");
    const trial = trials.filter((item) => item.soundId === soundId).at(-1);
    const response = trial ? ((trial.comfort / 10) * 100 * CLINICAL_CONTENT.weights.comfort) + ((10 - trial.tinnitusAwarenessDuring) / 10) * 100 * CLINICAL_CONTENT.weights.awareness + ((10 - trial.annoyanceDuring) / 10) * 100 * CLINICAL_CONTENT.weights.annoyance + (trial.relaxation / 10) * 100 * CLINICAL_CONTENT.weights.relaxation - (trial.residualWorsening / 10) * 100 * CLINICAL_CONTENT.weights.worseningPenalty - (trial.adverseSymptoms.length ? 100 * CLINICAL_CONTENT.weights.adversePenalty : 0) : 0;
    const excluded = prohibited || Boolean(trial && (trial.residualWorsening >= 6 || trial.adverseSymptoms.length));
    if ((trial?.residualWorsening ?? 0) >= 6 || trial?.adverseSymptoms.length) cautions.push("Você registrou piora ou sintoma adverso; não será sugerido automaticamente.");
    return { soundId, name: content.name, category: soundId, score: Math.round(compatibility * CLINICAL_CONTENT.weights.profile + response), evidenceLevel: content.evidence, reasons, cautions, excluded, exclusionReason: excluded ? cautions.at(-1) : undefined, requiresProfessionalSupervision: highSensitivity || ["narrowband_noise", "pure_tone"].includes(soundId) };
  }).sort((a, b) => Number(a.excluded) - Number(b.excluded) || b.score - a.score);
}
