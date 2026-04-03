const SPECIALTY_KEYWORDS: Record<string, string[]> = {
  "Dermatologue": ["peau", "acné", "eczéma", "allergie cutanée", "tache", "rougeur"],
  "Cardiologue": ["coeur", "poitrine", "palpitations", "tension", "hypertension", "douleur thoracique"],
  "Pneumologue": ["respiration", "essoufflement", "asthme", "toux", "poumon"],
  "Gastro-entérologue": ["ventre", "estomac", "digestion", "nausée", "reflux", "foie"],
  "Neurologue": ["tête", "migraine", "vertige", "mémoire", "nerf", "engourdissement"],
  "Pédiatre": ["enfant", "bébé", "fièvre enfant", "vaccin", "croissance"],
  "Gynécologue": ["grossesse", "cycle", "douleur pelvienne", "gynécologique"],
  "ORL": ["oreille", "nez", "gorge", "sinus", "angine"],
  "Ophtalmologue": ["vue", "oeil", "vision", "yeux", "flou"],
  "Médecin généraliste": ["fatigue", "fièvre", "douleur", "infection", "symptôme"],
};

export const AI_DEFAULT_SPECIALTY = "Médecin généraliste";

export function getAiSpecialtyOptions() {
  return Object.keys(SPECIALTY_KEYWORDS);
}

export function detectSpecialties(symptoms: string) {
  const normalized = symptoms.toLowerCase();
  const scored = Object.entries(SPECIALTY_KEYWORDS)
    .map(([specialty, keywords]) => ({
      specialty,
      score: keywords.reduce((accumulator, keyword) => accumulator + (normalized.includes(keyword) ? 1 : 0), 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return scored.map((entry) => entry.specialty);
}
