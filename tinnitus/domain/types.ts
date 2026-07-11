export type AlertKey =
  | "pulsatile"
  | "sudden_onset"
  | "sudden_hearing_loss"
  | "unilateral"
  | "hearing_asymmetry"
  | "severe_vertigo"
  | "neurological_symptoms"
  | "ear_pain_or_discharge"
  | "recent_trauma"
  | "unsafe";

export type HearingProfile = "no_known_hearing_loss" | "suspected_hearing_loss" | "confirmed_hearing_loss" | "uses_hearing_aid" | "unknown";
export type SoundSensitivity = "none" | "mild" | "moderate" | "severe" | "reactive_tinnitus";
export type TinnitusPhenotype = "tonal_stable" | "tonal_variable" | "noise_like_broadband" | "low_frequency" | "pulsatile" | "somatosensory" | "reactive" | "hearing_loss_associated" | "stress_dominant" | "sleep_dominant" | "medication_temporal_association" | "unclassified";
export type SoundId = "white_noise" | "pink_noise" | "brown_noise" | "rain" | "ocean" | "narrowband_noise" | "pure_tone";
export type EvidenceLevel = "supportive" | "limited" | "experimental";

export interface UserConsent { accepted: boolean; acceptedAt?: string; consentVersion: string; }
export interface ImpactProfile { sleepImpact: number; concentrationImpact: number; emotionalDistress: number; hypervigilance: number; functionalImpact: number; }
export interface TinnitusProfile {
  location: string[];
  perceivedSounds: string[];
  temporalPattern: string[];
  durationCategory: string;
  intensity: number;
  annoyance: number;
  triggers: string[];
  reliefContexts: string[];
  hearingProfile: HearingProfile;
  soundSensitivity: SoundSensitivity;
  somaticModulation: "none" | "jaw" | "neck" | "touch" | "multiple" | "unknown";
  impact: ImpactProfile;
  medicationRelation: "started_before_tinnitus" | "dose_increased_before_tinnitus" | "withdrawal_before_tinnitus" | "no_clear_relation" | "unknown";
}
export interface SafetyResult { blocked: boolean; referral: boolean; reasons: string[]; blockedAlerts: AlertKey[]; }
export interface SoundRecommendation { soundId: SoundId; name: string; category: SoundId; score: number; evidenceLevel: EvidenceLevel; reasons: string[]; cautions: string[]; excluded: boolean; exclusionReason?: string; requiresProfessionalSupervision: boolean; }
export interface SoundTrialResult { soundId: SoundId; comfort: number; tinnitusAwarenessDuring: number; annoyanceDuring: number; relaxation: number; residualImprovement: number; residualWorsening: number; adverseSymptoms: string[]; wouldUseAgain: boolean; testedAt: string; }
