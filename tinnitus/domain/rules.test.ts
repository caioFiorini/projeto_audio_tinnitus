import assert from "node:assert/strict";
import test from "node:test";
import { classify, evaluateSafety, recommend } from "./rules";
import type { TinnitusProfile } from "./types";

const profile: TinnitusProfile = { location: ["ambos os ouvidos"], perceivedSounds: ["chiado"], temporalPattern: ["contínuo"], durationCategory: "mais de 6 meses", intensity: 5, annoyance: 6, triggers: ["silêncio"], reliefContexts: [], hearingProfile: "unknown", soundSensitivity: "none", somaticModulation: "none", impact: { sleepImpact: 2, concentrationImpact: 2, emotionalDistress: 2, hypervigilance: 2, functionalImpact: 2 }, medicationRelation: "unknown" };

test("pulsatile tinnitus blocks all personalised sound recommendations", () => {
  assert.equal(evaluateSafety(["pulsatile"]).blocked, true);
  assert.deepEqual(recommend(profile, ["pulsatile"], []), []);
});
test("reactive tinnitus excludes pure tones and narrowband noise", () => {
  const recommendations = recommend({ ...profile, soundSensitivity: "reactive_tinnitus" }, [], []);
  assert.equal(recommendations.find((item) => item.soundId === "pure_tone")?.excluded, true);
  assert.equal(recommendations.find((item) => item.soundId === "narrowband_noise")?.excluded, true);
});
test("classification supports more than one phenotype", () => {
  const results = classify({ ...profile, perceivedSounds: ["apito"], impact: { ...profile.impact, sleepImpact: 8 } }, []);
  assert.ok(results.includes("tonal_stable"));
  assert.ok(results.includes("sleep_dominant"));
});
test("adverse response excludes the sound from future automatic tests", () => {
  const recommendations = recommend(profile, [], [{ soundId: "pink_noise", comfort: 0, tinnitusAwarenessDuring: 9, annoyanceDuring: 9, relaxation: 0, residualImprovement: 0, residualWorsening: 8, adverseSymptoms: ["dor"], wouldUseAgain: false, testedAt: "2026-07-10T00:00:00.000Z" }]);
  assert.equal(recommendations.find((item) => item.soundId === "pink_noise")?.excluded, true);
});
