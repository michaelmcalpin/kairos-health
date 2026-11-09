/**
 * Gene library for the coach Genetics Review.
 *
 * GENERATED from the Genetics Master Database (PRO 7 report order) plus
 * hand-written plain-language (about 4th-grade) explanations and medication
 * considerations. Lifestyle/diet, supplement, peptide and lab guidance come
 * straight from the master database. Regenerate rather than hand-editing the
 * lists below.
 */

export type GeneSectionKey = "immune" | "gut" | "cleanup" | "energy" | "folate" | "b12" | "homocysteine" | "detox" | "brain" | "heart" | "hormones";

export interface GeneSection { key: GeneSectionKey; title: string; blurb: string }

export interface GeneEntry {
  gene: string;
  rsId: string | null;
  section: GeneSectionKey;
  /** Clinical priority from the master database (e.g. "CRITICAL", "HIGH"). */
  priority: string | null;
  nickname: string;
  /** What the gene does, in plain words. */
  plain: string;
  /** What a change in this gene can mean, in plain words. */
  changed: string;
  symptoms: string[];
  lifestyle: string[];
  supplements: string[];
  peptides: string[];
  /** Medication notes to discuss with the prescriber (not prescriptions). */
  meds: string[];
  labs: string[];
  technical: { function: string | null; effect: string | null };
  aliases: string[];
}

export const GENE_SECTIONS: GeneSection[] = [
  {
    "key": "immune",
    "title": "Immune System & Swelling",
    "blurb": "How your body fights germs and calms swelling."
  },
  {
    "key": "gut",
    "title": "Gut, Food & Allergies",
    "blurb": "How your gut and body handle food and histamine."
  },
  {
    "key": "cleanup",
    "title": "Cell Cleanup",
    "blurb": "How your cells take out their trash."
  },
  {
    "key": "energy",
    "title": "Energy & Healthy Aging",
    "blurb": "How your cells make energy and stay young."
  },
  {
    "key": "folate",
    "title": "Folate (Vitamin B9)",
    "blurb": "How your body gets and uses folate."
  },
  {
    "key": "b12",
    "title": "Vitamin B12",
    "blurb": "How your body takes in and uses B12."
  },
  {
    "key": "homocysteine",
    "title": "Homocysteine & Heart Protection",
    "blurb": "How your body keeps homocysteine low to protect blood vessels."
  },
  {
    "key": "detox",
    "title": "Detox & Medicine Clearing",
    "blurb": "How your body cleans out toxins and medicines."
  },
  {
    "key": "brain",
    "title": "Brain, Mood & Sleep",
    "blurb": "How your brain makes and clears mood chemicals."
  },
  {
    "key": "heart",
    "title": "Heart, Blood & Blood Pressure",
    "blurb": "How your blood clots, your blood pressure, and your cholesterol."
  },
  {
    "key": "hormones",
    "title": "Hormones & Thyroid",
    "blurb": "How your thyroid and sex hormones work."
  }
];

export const GENE_LIBRARY: GeneEntry[] = [
  {
    "gene": "C3",
    "rsId": "rs2250656",
    "section": "immune",
    "priority": "HIGH",
    "nickname": "Germ spotter",
    "plain": "This gene helps your body tell your own cells apart from germs.",
    "changed": "When it is changed, your body can get mixed up. It may miss germs or bother its own cells, which can cause swelling.",
    "meds": [
      "LDN (low-dose naltrexone) is a prescription some providers use to calm this. Ask a doctor.",
      "Talk to a doctor before long-term steroid or antibiotic use.",
      "Prescription option from the protocol (needs a doctor): LDN (4mg)"
    ],
    "technical": {
      "function": "Complement system protein that identifies self vs non-self cells. Helps immune system distinguish friend from foe.",
      "effect": "Reduced ability to identify foreign invaders. Immune confusion → may attack self or miss pathogens. Weakened initiation of immune response."
    },
    "aliases": [],
    "symptoms": [
      "Autoimmune tendencies",
      "slow immune recognition",
      "increased susceptibility to infections",
      "positive ANA markers",
      "mold sensitivity"
    ],
    "supplements": [
      "Curcumin",
      "Omega-3 (EPA/DHA)",
      "Resveratrol",
      "Quercetin",
      "CBD Oil",
      "SPMs (Resolve)"
    ],
    "peptides": [
      "Thymosin Alpha-1 (immune modulation)"
    ],
    "lifestyle": [
      "Anti-inflammatory Mediterranean diet",
      "10 servings fruits & vegetables daily",
      "Stress management (nervous system drives immune system)",
      "Breathwork",
      "Prayer/meditation"
    ],
    "labs": [
      "hs-CRP",
      "Serum Complement C3",
      "Sedimentation Rate",
      "IL-6",
      "Iron/Ferritin",
      "Lymphocyte Profile"
    ]
  },
  {
    "gene": "CD14",
    "rsId": "rs2569190",
    "section": "immune",
    "priority": "HIGH",
    "nickname": "Slime-shield finder",
    "plain": "This gene helps your body find germs that hide under a sticky shield in your gut.",
    "changed": "When it is changed, bad gut germs can hide and stick around longer.",
    "meds": [
      "If gut infections keep coming back, ask a doctor about testing before more antibiotics."
    ],
    "technical": {
      "function": "Identifies biofilms and lipopolysaccharide (LPS) structures on foreign organisms. Backup to C3 for pathogen detection.",
      "effect": "Can't properly identify bacterial biofilms → biofilms grow in areas they shouldn't (especially gut). Immune system gets confused by LPS."
    },
    "aliases": [],
    "symptoms": [
      "Gut biofilm overgrowth",
      "recurrent infections",
      "difficulty clearing gut infections",
      "gut dysbiosis"
    ],
    "supplements": [
      "Biofilm Resolve",
      "Gut Defender",
      "anti-biofilm protocols"
    ],
    "peptides": [],
    "lifestyle": [
      "Fresh foods, avoid processed",
      "Periodic GI Map testing",
      "Manage stress (weakens gut immune defense)"
    ],
    "labs": [
      "GI Map",
      "Stool testing for biofilms"
    ]
  },
  {
    "gene": "IL-5",
    "rsId": "rs2069812",
    "section": "immune",
    "priority": "MODERATE",
    "nickname": "Allergy alarm",
    "plain": "This gene turns on cells that fight allergies and tiny bugs.",
    "changed": "When it is changed, allergies can be stronger, mostly when you are stressed.",
    "meds": [
      "Allergy medicines like antihistamines or inhalers are choices to talk over with a doctor."
    ],
    "technical": {
      "function": "Interleukin-5 activates eosinophils (allergy/parasite immune cells).",
      "effect": "Elevated eosinophils → increased allergy response. Usually manageable if stress is low."
    },
    "aliases": [
      "IL5"
    ],
    "symptoms": [
      "Allergies",
      "eosinophil elevation",
      "asthma-like symptoms",
      "environmental sensitivities"
    ],
    "supplements": [
      "Quercetin",
      "Vitamin C",
      "stinging nettle"
    ],
    "peptides": [],
    "lifestyle": [
      "Anti-inflammatory diet, identify food allergens",
      "Keep stress low — heterozygous often won't reach threshold unless stressed"
    ],
    "labs": [
      "Eosinophil count",
      "Environmental Allergy Panel"
    ]
  },
  {
    "gene": "IL-13",
    "rsId": "rs1800925",
    "section": "immune",
    "priority": "LOW",
    "nickname": "Allergy booster",
    "plain": "This gene helps start allergy reactions.",
    "changed": "When it is changed, your body may make more mucus and react more to allergies.",
    "meds": [
      "Ask a doctor about allergy or asthma medicines if breathing is a problem."
    ],
    "technical": {
      "function": "Interleukin-13 drives allergic and anti-parasitic immune responses.",
      "effect": "Overactive allergic-type immune response."
    },
    "aliases": [
      "IL13"
    ],
    "symptoms": [
      "Allergic tendencies",
      "mucus production",
      "asthma risk"
    ],
    "supplements": [
      "Quercetin",
      "SPMs"
    ],
    "peptides": [],
    "lifestyle": [
      "Anti-inflammatory diet",
      "Environmental control"
    ],
    "labs": [
      "IgE levels"
    ]
  },
  {
    "gene": "STAT4",
    "rsId": "rs10181656",
    "section": "immune",
    "priority": "HIGH",
    "nickname": "Immune balance switch",
    "plain": "This gene keeps your immune system balanced so it does not pick on your own body.",
    "changed": "When it is changed, your body may pick on itself. This can show up as sore joints or slow healing.",
    "meds": [
      "Joint pain that will not go away should be checked by a doctor for autoimmune problems.",
      "LDN is a prescription some providers use here. Ask a doctor.",
      "Prescription option from the protocol (needs a doctor): LDN"
    ],
    "technical": {
      "function": "Balances Th1 (self-monitoring) vs Th2 (pathogen response). Key regulator of adaptive immunity.",
      "effect": "Upregulated Th1 → body over-monitors self → tissue damage, auto-inflammatory patterns. Increased risk of autoimmune conditions."
    },
    "aliases": [],
    "symptoms": [
      "Joint inflammation",
      "tissue damage from repetitive movements under stress",
      "tennis elbow",
      "autoimmune markers",
      "slow healing"
    ],
    "supplements": [
      "SPMs (Resolve)",
      "Fish Oil",
      "Pregnenolone (30mg, half year)"
    ],
    "peptides": [
      "Thymosin Alpha-1"
    ],
    "lifestyle": [
      "Anti-inflammatory Mediterranean diet",
      "Surrender outcomes (reduce stress signaling)",
      "Parasympathetic practices"
    ],
    "labs": [
      "ANA",
      "Sed Rate",
      "hs-CRP",
      "Thyroid panel"
    ]
  },
  {
    "gene": "IL-6",
    "rsId": "rs1800795",
    "section": "immune",
    "priority": "CRITICAL",
    "nickname": "Swelling starter",
    "plain": "This gene starts swelling so your body can heal, then tells it to stop.",
    "changed": "When it is changed, swelling can stay on too long. This is linked to blood sugar trouble and slow weight loss.",
    "meds": [
      "Metformin and GLP-1 medicines help blood sugar. Ask a doctor if they fit.",
      "LDN is a prescription some providers use to lower swelling.",
      "Prescription option from the protocol (needs a doctor): LDN"
    ],
    "technical": {
      "function": "Pro-inflammatory cytokine. Triggers IL-10 anti-inflammatory resolution. Essential for workout recovery cycle. Activates liver glucose during exercise.",
      "effect": "Dysregulated IL-6 → either overproduction (chronic inflammation) or underproduction (can't trigger resolution). Linked to insulin resistance, obesity-related inflammation, slower wound healing. Complete block = no cytokine storm (protective vs COVID) but poor resolution."
    },
    "aliases": [
      "IL6"
    ],
    "symptoms": [
      "Chronic low-grade inflammation",
      "insulin resistance",
      "weight loss resistance",
      "slow wound healing",
      "metabolic syndrome markers"
    ],
    "supplements": [
      "SPMs (Resolve)",
      "Fish Oil (EPA/DHA)",
      "Curcumin"
    ],
    "peptides": [
      "SS-31 (mitochondrial)",
      "GLP-1 microdose"
    ],
    "lifestyle": [
      "Anti-inflammatory diet",
      "Avoid high-sugar and processed foods",
      "Regular exercise (stimulates healthy IL-6/IL-10 cycle)",
      "Monitor with blood work"
    ],
    "labs": [
      "Serum IL-6",
      "hs-CRP",
      "Fasting Insulin",
      "HbA1c",
      "Sed Rate"
    ]
  },
  {
    "gene": "IL-10",
    "rsId": "rs1800896",
    "section": "immune",
    "priority": "HIGH",
    "nickname": "Calm-down signal",
    "plain": "This gene tells your body to calm down after it fights a sickness.",
    "changed": "When it is changed, your body has a hard time calming down. Getting better can take longer.",
    "meds": [
      "Ivermectin, mebendazole, and LDN are prescriptions. Only use them with a doctor.",
      "Prescription option from the protocol (needs a doctor): Ivermectin",
      "Prescription option from the protocol (needs a doctor): Mebendazole (for immune modulation)",
      "Prescription option from the protocol (needs a doctor): LDN"
    ],
    "technical": {
      "function": "Anti-inflammatory cytokine. Creates immune resolution (Phase 2). Produces Treg cells that calm immune system.",
      "effect": "Underproduction of IL-10 → can't resolve inflammation → stuck in Phase 1 (initiation). Prolonged inflammatory state."
    },
    "aliases": [
      "IL10"
    ],
    "symptoms": [
      "Can't resolve illness",
      "prolonged recovery",
      "chronic inflammation that won't calm down"
    ],
    "supplements": [
      "SPMs",
      "Mushroom extracts",
      "VIP peptide"
    ],
    "peptides": [
      "Thymosin Alpha-1",
      "VIP"
    ],
    "lifestyle": [
      "Mediterranean diet, anti-inflammatory",
      "Fasting (gets rid of excess immune cells), mushroom therapies"
    ],
    "labs": [
      "IL-6",
      "IL-10",
      "CRP"
    ]
  },
  {
    "gene": "TNF-alpha",
    "rsId": "rs1800629",
    "section": "immune",
    "priority": "HIGH",
    "nickname": "Swelling amplifier",
    "plain": "This gene turns up swelling to fight germs.",
    "changed": "When it is changed, small things like certain foods can cause big swelling.",
    "meds": [
      "For diagnosed gut or joint disease, doctors have medicines that block TNF. Ask a specialist."
    ],
    "technical": {
      "function": "Tumor Necrosis Factor Alpha. Major inflammatory cytokine that stimulates immune attack.",
      "effect": "Overactive TNF → excessive inflammation in gut and systemically, especially with challenging foods."
    },
    "aliases": [
      "TNF",
      "TNFA",
      "TNF-A"
    ],
    "symptoms": [
      "Gut inflammation",
      "food reactions amplified",
      "systemic inflammation from minor triggers"
    ],
    "supplements": [
      "Curcumin",
      "Omega-3",
      "Resveratrol",
      "SPMs"
    ],
    "peptides": [],
    "lifestyle": [
      "High-fiber anti-inflammatory diet",
      "Avoid trigger foods",
      "Stress management"
    ],
    "labs": [
      "TNF-alpha serum",
      "CRP"
    ]
  },
  {
    "gene": "CTLA4",
    "rsId": "rs231775",
    "section": "immune",
    "priority": "HIGH",
    "nickname": "Immune off switch",
    "plain": "This gene tells your germ-fighting cells when to stop.",
    "changed": "When it is changed, sicknesses can hang on for a long time.",
    "meds": [
      "Use antibiotics only when truly needed.",
      "Talk to a doctor before vaccines or new immune medicines.",
      "Prescription option from the protocol (needs a doctor): LDN"
    ],
    "technical": {
      "function": "Regulates cytotoxic T-lymphocytes (adaptive immune system). Controls T-cell shut-off to enter resolution phase. Produces Treg cells.",
      "effect": "T-cells won't shut off → prolonged illness → can't enter resolve phase. Suppresses Treg cells. Way more likely for long-haul conditions (long COVID, chronic infections)."
    },
    "aliases": [],
    "symptoms": [
      "Prolonged illness",
      "things 'hang on'",
      "long-haul conditions",
      "vaccine injury risk",
      "slow immune resolution",
      "chronic inflammatory patterns"
    ],
    "supplements": [
      "Bone broth",
      "Mushroom extracts",
      "SPMs (Resolve)",
      "Fish Oil",
      "Thymosin Alpha-1"
    ],
    "peptides": [
      "Thymosin Alpha-1 (critical for this gene)"
    ],
    "lifestyle": [
      "Mediterranean diet",
      "First-line defense nutrition (don't let infections take hold)",
      "Exercise regularly",
      "Prioritize not getting sick (prevention)",
      "Be cautious with vaccines",
      "Minimize antibiotic use"
    ],
    "labs": [
      "Lymphocyte panel",
      "T-cell subsets",
      "CRP"
    ]
  },
  {
    "gene": "FADS1",
    "rsId": "rs174547",
    "section": "immune",
    "priority": "HIGH",
    "nickname": "Fat converter",
    "plain": "This gene turns the fats you eat into helpers that calm swelling.",
    "changed": "When it is changed, your body makes less of these helpers. Triglycerides (a blood fat) can run high.",
    "meds": [
      "Prescription omega-3 (like icosapent ethyl) is a choice for high triglycerides. Ask a doctor."
    ],
    "technical": {
      "function": "Fatty Acid Desaturase 1. Converts polyunsaturated fats into anti-inflammatory compounds (oleonic acid, EPA/DHA).",
      "effect": "Poor conversion → arachidonic acid builds up (pro-inflammatory). Can't make enough oleonic acid. High triglycerides."
    },
    "aliases": [],
    "symptoms": [
      "High triglycerides",
      "inflammation from dietary fats",
      "seed oil sensitivity amplified",
      "poor omega balance"
    ],
    "supplements": [
      "SPMs (Resolve — designed for this)",
      "EPA/DHA Fish Oil",
      "avoid high-heat seed oils"
    ],
    "peptides": [],
    "lifestyle": [
      "Avoid high-heat seed oils",
      "Emphasize healthy fats: olive oil, fatty fish (salmon, mackerel, tuna, cod liver oil)",
      "Genetically justified to be anti-seed-oil"
    ],
    "labs": [
      "Triglycerides",
      "Omega-3 Index",
      "Fatty Acid Profile"
    ]
  },
  {
    "gene": "NOS2",
    "rsId": "rs4795067",
    "section": "immune",
    "priority": "HIGH",
    "nickname": "Germ blaster",
    "plain": "This gene helps your body knock out bugs and bad gut germs.",
    "changed": "When it is changed, you can pick up gut bugs and parasites more easily.",
    "meds": [
      "Ask a doctor about stool testing before taking anti-parasite medicine."
    ],
    "technical": {
      "function": "Inducible Nitric Oxide Synthase. Part of immune defense. Helps kill parasites and bacteria.",
      "effect": "Impaired iNOS → more susceptible to parasites and wrong bacteria in gut. Higher baseline oxidative stress and inflammation. Affects acetylation detox pathway."
    },
    "aliases": [],
    "symptoms": [
      "Parasite susceptibility",
      "gut infections",
      "elevated nitric oxide (pro-inflammatory)",
      "bacterial overgrowth"
    ],
    "supplements": [
      "Beta Glucans",
      "Immune Restore+",
      "anti-infective protocols"
    ],
    "peptides": [],
    "lifestyle": [
      "Be careful with water quality when traveling",
      "Fresh foods",
      "Don't get stressed and then expose to risky environments",
      "Annual GI Map"
    ],
    "labs": [
      "GI Map",
      "Stool O&P"
    ]
  },
  {
    "gene": "AOC1",
    "rsId": "rs10156191",
    "section": "gut",
    "priority": "MODERATE",
    "nickname": "Histamine cleaner",
    "plain": "This gene cleans up histamine from food and drinks. Histamine can cause itching and bloating.",
    "changed": "When it is changed, wine, leftovers, and aged foods can make you bloated or itchy.",
    "meds": [
      "Some medicines slow this cleaner, like certain antibiotics and acid blockers. Ask a pharmacist.",
      "Antihistamines can help with flare-ups. Ask a doctor which one."
    ],
    "technical": {
      "function": "Diamine oxidase (DAO) — breaks down external histamine from food and alcohol.",
      "effect": "Can't break down histamine well → reactions to high-histamine foods, alcohol (especially wine), leftovers."
    },
    "aliases": [
      "DAO",
      "ABP1"
    ],
    "symptoms": [
      "Bloating",
      "maldigestion",
      "rashing",
      "hives",
      "alcohol intolerance (especially wine)",
      "reactions to aged/fermented foods"
    ],
    "supplements": [
      "DAO supplement when drinking or eating aged foods",
      "Histamine Block"
    ],
    "peptides": [],
    "lifestyle": [
      "Eat fresh (avoid leftovers past 2 days)",
      "Low-yeast alcohol only (vodka, gin, tequila)",
      "Avoid wine, beer",
      "Avoid aged cheese, fermented foods in excess"
    ],
    "labs": [
      "Histamine levels if symptomatic"
    ]
  },
  {
    "gene": "HLA-DQA1",
    "rsId": "rs2187668",
    "section": "gut",
    "priority": "HIGH",
    "nickname": "Gluten sensor",
    "plain": "This gene shapes how your body reacts to gluten and other hard-to-digest foods.",
    "changed": "When it is changed, eating the same foods over and over can make your body react to them.",
    "meds": [
      "Get a celiac blood test before cutting out gluten, or the test may come back wrong."
    ],
    "technical": {
      "function": "Human Leukocyte Antigen. Major celiac/gluten sensitivity and autoimmune risk gene.",
      "effect": "Body becomes sensitive to hard-to-digest foods (gluten, dairy). With repeated exposure, immune system starts attacking gut tissue. Celiac pathway."
    },
    "aliases": [],
    "symptoms": [
      "Gluten/dairy sensitivity",
      "positive ANA",
      "random autoimmune markers",
      "food sensitivities that worsen over time",
      "celiac risk"
    ],
    "supplements": [
      "Gluten Digest (2 caps when eating out)",
      "avoid repetitive food intake",
      "MRT food sensitivity test every 16-24 months"
    ],
    "peptides": [],
    "lifestyle": [
      "Diet variation is critical",
      "Rotate foods",
      "Remove reactive foods 6-8 months",
      "Test with MRT panel regularly",
      "Vary diet to prevent immune system targeting repetitive foods"
    ],
    "labs": [
      "MRT Food Sensitivity",
      "ANA",
      "Celiac panel",
      "tTG-IgA"
    ]
  },
  {
    "gene": "HLA-DQB1",
    "rsId": "rs7454108",
    "section": "gut",
    "priority": "HIGH (combined with DQA1)",
    "nickname": "Gluten sensor partner",
    "plain": "This gene works with HLA-DQA1 to decide how your body handles gluten and dairy.",
    "changed": "When both are changed, the chance of gluten trouble and food reactions goes up.",
    "meds": [
      "Get a celiac blood test before cutting out gluten, or the test may come back wrong."
    ],
    "technical": {
      "function": "Works with HLA-DQA1 as second allele for gluten/casein sensitivity.",
      "effect": "Combined with DQA1, increases celiac and autoimmune risk. Immune system gets 'uppity' with repetitive hard-to-digest proteins."
    },
    "aliases": [],
    "symptoms": [
      "Gluten/dairy sensitivity",
      "positive ANA",
      "random autoimmune markers",
      "food sensitivities that worsen over time",
      "celiac risk"
    ],
    "supplements": [
      "Gluten Digest (2 caps when eating out)",
      "avoid repetitive food intake",
      "MRT food sensitivity test every 16-24 months"
    ],
    "peptides": [],
    "lifestyle": [
      "Diet variation is critical",
      "Rotate foods",
      "Remove reactive foods 6-8 months",
      "Test with MRT panel regularly",
      "Vary diet to prevent immune system targeting repetitive foods"
    ],
    "labs": [
      "MRT Food Sensitivity",
      "ANA",
      "Celiac panel",
      "tTG-IgA"
    ]
  },
  {
    "gene": "FUT2",
    "rsId": "rs492602",
    "section": "gut",
    "priority": "MODERATE-HIGH",
    "nickname": "Gut garden keeper",
    "plain": "This gene helps keep lots of different good bugs in your gut.",
    "changed": "When it is changed, your gut has fewer kinds of good bugs. Your gut also gets less B12.",
    "meds": [
      "Acid blockers and antibiotics can hurt good gut bugs. Ask a doctor if you take them often."
    ],
    "technical": {
      "function": "Fucosyltransferase 2. Maintains gut microbiome diversity. Redistributes B12 back to gut bacteria for ecosystem health.",
      "effect": "Poor microbiome diversity. B12 doesn't get recycled to gut. Double whammy if B12 absorption is also impaired (CUBN). Higher risk for dysbiosis, SIBO, cancer."
    },
    "aliases": [],
    "symptoms": [
      "Gut dysbiosis",
      "low microbial diversity",
      "recurring gut issues",
      "poor B12 status in gut bacteria"
    ],
    "supplements": [
      "Rotating probiotics: spore-based (2-3 months) → multi-strain Lactobacillus (2-3 months) → off (2-3 months)",
      "Prebiotics",
      "Fermented foods",
      "Methyl B12"
    ],
    "peptides": [
      "BPC-157 (gut repair if needed)"
    ],
    "lifestyle": [
      "Mediterranean diet with fermented foods",
      "Prebiotic-rich foods (garlic, onion, asparagus)",
      "GI Map or Genova 3-day stool test every 2-3 years",
      "Don't overdo probiotics year-round"
    ],
    "labs": [
      "GI Map",
      "Genova Stool Test",
      "Serum B12"
    ]
  },
  {
    "gene": "VDR",
    "rsId": "rs2228570",
    "section": "gut",
    "priority": "MODERATE",
    "nickname": "Vitamin D unlocker",
    "plain": "This gene helps your body use vitamin D. Vitamin D helps your bones and immune system.",
    "changed": "When it is changed, your body may run low on vitamin D, even with sun.",
    "meds": [
      "Steroid medicines can lower vitamin D.",
      "High vitamin D with water pills (thiazides) can raise calcium. Check blood levels."
    ],
    "technical": {
      "function": "Vitamin D Receptor. Converts vitamin D into its active form. Requires kidney conversion.",
      "effect": "Can't synthesize/activate vitamin D well. Burns through vitamin D when immune system is upregulated."
    },
    "aliases": [],
    "symptoms": [
      "Low vitamin D despite sun exposure",
      "immune dysregulation",
      "bone density concerns",
      "fatigue"
    ],
    "supplements": [
      "Vitamin D3 + K2 (must take K2 for proper conversion)",
      "Winter: 5",
      "000-10",
      "000 IU",
      "Summer: 2",
      "Some clients year-round 5",
      "000"
    ],
    "peptides": [],
    "lifestyle": [
      "Vitamin D-rich foods",
      "Sun exposure (but won't fully compensate)",
      "Get sun but still supplement"
    ],
    "labs": [
      "Serum 25-OH Vitamin D",
      "Comprehensive Micronutrient Test"
    ]
  },
  {
    "gene": "ATG12",
    "rsId": "rs26538",
    "section": "cleanup",
    "priority": "CRITICAL (when multiple ATGs affected)",
    "nickname": "Cell trash collector",
    "plain": "This gene helps your cells take out their trash.",
    "changed": "When it is changed, junk builds up in your cells. This can slow your metabolism and make weight loss hard.",
    "meds": [
      "Metformin and GLP-1 medicines are sometimes used to help this. Ask a doctor."
    ],
    "technical": {
      "function": "Part of autophagosome formation. Helps cells build internal cleanup structures to collect waste (glycolic end products, damaged organelles).",
      "effect": "Cells can't self-clean efficiently. Waste accumulates. Over time → insulin resistance, senescent cell accumulation, metabolic dysfunction."
    },
    "aliases": [],
    "symptoms": [
      "Weight loss resistance",
      "slow metabolism",
      "insulin resistance",
      "cellular aging",
      "gut issues from damaged cells"
    ],
    "supplements": [
      "Curcumin",
      "Lithium Orotate",
      "D-Chiro-Inositol",
      "Catechins",
      "Resveratrol",
      "Caffeine",
      "Zeolite",
      "Calcium Disodium EDTA",
      "Senescent Cell Detox product"
    ],
    "peptides": [
      "GLP-1 microdose (3 months/year)",
      "FOXO4"
    ],
    "lifestyle": [
      "Intermittent fasting 12-15 hours",
      "Annual extended fasting",
      "Eat enough food (low calorie all the time shuts off autophagy)",
      "Fasting is 'a calling' for these genes",
      "Regular exercise",
      "Take Senescent Cell Detox before fasted workouts"
    ],
    "labs": [
      "Fasting Insulin",
      "HbA1c",
      "Blood Glucose"
    ]
  },
  {
    "gene": "ATG5",
    "rsId": "rs510432",
    "section": "cleanup",
    "priority": "CRITICAL (when combined)",
    "nickname": "Cell trash collector 2",
    "plain": "This gene works with ATG12 to bag up trash inside your cells.",
    "changed": "When it is changed along with others, cell cleanup slows a lot.",
    "meds": [
      "Metformin and GLP-1 medicines are sometimes used to help this. Ask a doctor."
    ],
    "technical": {
      "function": "Key autophagy gene. Works with ATG12 and ATG16L1 to form autophagosomes that collect cellular debris for lysosome degradation.",
      "effect": "Same as ATG12. Combined blocks = significantly impaired cellular cleanup. Cells fill with junk, mitochondria decline, glucose stops being absorbed."
    },
    "aliases": [],
    "symptoms": [
      "Weight loss resistance",
      "slow metabolism",
      "insulin resistance",
      "cellular aging",
      "gut issues from damaged cells. Also: leaky gut (damaged cells accumulate in gut lining)",
      "cardiometabolic dysregulation"
    ],
    "supplements": [
      "Curcumin",
      "Lithium Orotate",
      "D-Chiro-Inositol",
      "Catechins",
      "Resveratrol",
      "Caffeine",
      "Zeolite",
      "Calcium Disodium EDTA",
      "Senescent Cell Detox product"
    ],
    "peptides": [
      "GLP-1 microdose (3 months/year)",
      "FOXO4"
    ],
    "lifestyle": [
      "Intermittent fasting 12-15 hours",
      "Annual extended fasting",
      "Eat enough food (low calorie all the time shuts off autophagy)",
      "Fasting is 'a calling' for these genes",
      "Regular exercise",
      "Take Senescent Cell Detox before fasted workouts"
    ],
    "labs": [
      "Fasting Insulin",
      "HbA1c",
      "Blood Glucose"
    ]
  },
  {
    "gene": "ATG16L1",
    "rsId": "rs10210302",
    "section": "cleanup",
    "priority": "CRITICAL (when combined)",
    "nickname": "Cell trash collector 3",
    "plain": "This gene finishes the trash bag inside your cells.",
    "changed": "When this and the other cleanup genes are changed, your cells have a hard time cleaning up.",
    "meds": [
      "Metformin and GLP-1 medicines are sometimes used to help this. Ask a doctor."
    ],
    "technical": {
      "function": "Third autophagy gene. Completes the autophagosome formation complex.",
      "effect": "Same pathway impact as ATG5/ATG12. Three blocked = severely impaired autophagy."
    },
    "aliases": [],
    "symptoms": [
      "Weight loss resistance",
      "slow metabolism",
      "insulin resistance",
      "cellular aging",
      "gut issues from damaged cells. Also: leaky gut (damaged cells accumulate in gut lining)",
      "cardiometabolic dysregulation"
    ],
    "supplements": [
      "Curcumin",
      "Lithium Orotate",
      "D-Chiro-Inositol",
      "Catechins",
      "Resveratrol",
      "Caffeine",
      "Zeolite",
      "Calcium Disodium EDTA",
      "Senescent Cell Detox product"
    ],
    "peptides": [
      "GLP-1 microdose (3 months/year)",
      "FOXO4"
    ],
    "lifestyle": [
      "Intermittent fasting 12-15 hours",
      "Annual extended fasting",
      "Eat enough food (low calorie all the time shuts off autophagy)",
      "Fasting is 'a calling' for these genes",
      "Regular exercise",
      "Take Senescent Cell Detox before fasted workouts"
    ],
    "labs": [
      "Fasting Insulin",
      "HbA1c",
      "Blood Glucose"
    ]
  },
  {
    "gene": "SIRT1",
    "rsId": "rs1467568",
    "section": "energy",
    "priority": "CRITICAL",
    "nickname": "Longevity gene",
    "plain": "This gene helps your cells stay young and protects the tips of your DNA.",
    "changed": "When it is changed, your cells may age faster than normal.",
    "meds": [
      "Metformin is studied for healthy aging. Ask a doctor if it fits."
    ],
    "technical": {
      "function": "Sirtuin 1 — the 'longevity gene.' Maintains telomere length. Regulates cellular aging. NAD-dependent deacetylase.",
      "effect": "Telomeres shorten faster → accelerated cellular aging. Cells die faster. Oxidative stress damages cells more quickly."
    },
    "aliases": [],
    "symptoms": [
      "Premature aging markers",
      "fatigue",
      "reduced recovery",
      "cellular age exceeding chronological age"
    ],
    "supplements": [
      "NAD+ (critical investment for this gene)",
      "Resveratrol",
      "Quercetin",
      "CoQ10",
      "PQQ",
      "L-Carnitine",
      "Ornithine",
      "Magnesium"
    ],
    "peptides": [
      "Epitalon (telomere support)",
      "GHK-Cu (tissue repair)",
      "SS-31 (mitochondrial)"
    ],
    "lifestyle": [
      "Caloric restriction periods",
      "Anti-inflammatory diet",
      "Exercise (critical — makes new mitochondria)",
      "Oxygen therapy",
      "Zone 2 cardio + HIIT/Tabata",
      "Red light therapy",
      "Sauna",
      "NAD IVs"
    ],
    "labs": [
      "NAD Profile (Fagron Genomics)",
      "Organic Acid Test",
      "Telomere Length Test"
    ]
  },
  {
    "gene": "PPARGC1A",
    "rsId": "rs8192678",
    "section": "energy",
    "priority": "CRITICAL",
    "nickname": "Power plant builder",
    "plain": "This gene helps build the tiny power plants in your cells. It also helps cells use sugar.",
    "changed": "When it is changed, your cells use sugar poorly. Blood sugar can creep up, even if you eat well.",
    "meds": [
      "Metformin or GLP-1 medicines may help blood sugar. Ask a doctor.",
      "Berberine is a supplement that can act like metformin. Do not take both without a doctor."
    ],
    "technical": {
      "function": "PGC-1 Alpha. Master regulator of mitochondrial biogenesis. Controls glucose absorption into cells.",
      "effect": "Cells stop using glucose effectively. Mitochondria don't replicate well. Contributes to insulin resistance at cellular level. Combined with TFAM = immunosenescence."
    },
    "aliases": [
      "PGC1A",
      "PGC-1A"
    ],
    "symptoms": [
      "Blood sugar dysregulation",
      "insulin resistance even with healthy diet",
      "weight loss resistance",
      "pre-diabetic markers"
    ],
    "supplements": [
      "NAD+",
      "CoQ10",
      "PQQ",
      "Resveratrol",
      "Berberine",
      "Alpha Lipoic Acid"
    ],
    "peptides": [
      "SS-31",
      "GLP-1 microdose",
      "AOD-9604"
    ],
    "lifestyle": [
      "Blood sugar stabilizing diet",
      "Avoid sugar spikes",
      "Mediterranean",
      "Exercise is essential",
      "CGM (continuous glucose monitor) periodically",
      "Fasting"
    ],
    "labs": [
      "Fasting Insulin",
      "HbA1c",
      "Fasting Glucose",
      "HOMA-IR"
    ]
  },
  {
    "gene": "TFAM",
    "rsId": "rs1937",
    "section": "energy",
    "priority": "CRITICAL — 'Most prevalent gene, root cause of disease'",
    "nickname": "Power plant protector",
    "plain": "This gene protects the power plants in your cells and helps them grow back.",
    "changed": "When it is changed, your power plants break more easily. Tired, worn-out cells build up and cause swelling.",
    "meds": [
      "Metformin or GLP-1 medicines are sometimes used here. Ask a doctor."
    ],
    "technical": {
      "function": "Mitochondrial Transcription Factor A. Protects mitochondria from oxidative damage. Enables mitochondrial replication.",
      "effect": "Mitochondria are MORE susceptible to damage and DON'T grow back. Cells lose mitochondria → become senescent (undead). Senescent cells don't process glucose, release massive inflammation, interfere with hormone signaling. ROOT CAUSE of immunosenescence."
    },
    "aliases": [],
    "symptoms": [
      "Weight loss resistance",
      "slowing metabolism",
      "insulin resistance",
      "chronic fatigue",
      "hormone insensitivity",
      "nervous system tension",
      "accelerated aging",
      "skin issues"
    ],
    "supplements": [
      "NAD+ (legit investment)",
      "CoQ10",
      "PQQ (start as lifestyle)",
      "Senescent Cell Detox/CellPure",
      "Zeolite",
      "EDTA"
    ],
    "peptides": [
      "SS-31 (mitochondrial repair)",
      "Epitalon",
      "FOXO4",
      "GLP-1 microdose",
      "AOD-9604"
    ],
    "lifestyle": [
      "Mediterranean anti-inflammatory",
      "Blood sugar control",
      "Caloric restriction periods",
      "EXERCISE IS NON-NEGOTIABLE: HIIT/Tabata (stimulates mito replication) + Zone 2 cardio 20min 2-3x/week",
      "Fasting (gets rid of senescent cells)",
      "Cold shock therapy",
      "High heat/sauna",
      "Red light therapy"
    ],
    "labs": [
      "NAD Profile",
      "Fasting Insulin",
      "HbA1c",
      "Organic Acid Test"
    ]
  },
  {
    "gene": "NQO1",
    "rsId": "rs1800566",
    "section": "energy",
    "priority": "MODERATE",
    "nickname": "CoQ10 recycler",
    "plain": "This gene reuses CoQ10, a helper your cells need for energy.",
    "changed": "When it is changed, you may need extra CoQ10 from food or supplements.",
    "meds": [
      "Statin cholesterol medicines lower CoQ10. If you take one, ask about adding CoQ10."
    ],
    "technical": {
      "function": "NAD(P)H Quinone Dehydrogenase 1. Helps recycle CoQ10 and protect against oxidative stress.",
      "effect": "Can't recycle CoQ10 efficiently → needs external CoQ10/PQQ supplementation."
    },
    "aliases": [],
    "symptoms": [
      "Low energy",
      "poor mitochondrial support"
    ],
    "supplements": [
      "CoQ10",
      "PQQ",
      "Riboflavin (B2)"
    ],
    "peptides": [],
    "lifestyle": [
      "CoQ10-rich foods: organ meats, beef, chicken, fish"
    ],
    "labs": [
      "Organic Acid Test"
    ]
  },
  {
    "gene": "NFE2L2 (Nrf2)",
    "rsId": "rs6721961",
    "section": "energy",
    "priority": "MODERATE",
    "nickname": "Antioxidant switch",
    "plain": "This gene turns on your body's own protectors against wear and tear.",
    "changed": "When it is changed, your body makes fewer protectors when you are stressed.",
    "meds": [
      "No common medicine changes this. Food and exercise are the main tools."
    ],
    "technical": {
      "function": "Nuclear Factor Erythroid 2. Master antioxidant switch. Activates antioxidant gene expression.",
      "effect": "Reduced antioxidant defense. Body can't upregulate antioxidant production under stress."
    },
    "aliases": [
      "NFE2L2",
      "NRF2"
    ],
    "symptoms": [
      "Oxidative stress accumulation",
      "inflammation",
      "poor recovery"
    ],
    "supplements": [
      "Pterostilbene",
      "Green Tea (EGCG)",
      "Turmeric",
      "Sulforaphane",
      "Intracellular Detox Complex"
    ],
    "peptides": [],
    "lifestyle": [
      "Antioxidant-rich diet",
      "Cruciferous vegetables (broccoli sprouts for sulforaphane)",
      "Endurance exercise activates Nrf2 pathway"
    ],
    "labs": [
      "8-OHdG (oxidative stress marker)"
    ]
  },
  {
    "gene": "SOD2",
    "rsId": "rs4880",
    "section": "energy",
    "priority": "HIGH",
    "nickname": "Rust protector",
    "plain": "This gene makes your body's main shield against cell 'rust' from everyday living.",
    "changed": "When it is changed, your cells get worn down faster. Swelling can happen without a clear reason.",
    "meds": [
      "NAC is a supplement used here. It can affect some medicines, so check with a pharmacist."
    ],
    "technical": {
      "function": "Superoxide Dismutase 2. Primary antioxidant enzyme. Body's main defense against superoxide free radicals produced by cellular activity.",
      "effect": "Can't make enough SOD → oxidative stress accumulates → damages cells, mitochondria, DNA. Inflammation from normal day-to-day cellular processes."
    },
    "aliases": [],
    "symptoms": [
      "Oxidative stress",
      "accelerated aging",
      "inflammation even without obvious trigger",
      "osteoarthritis → rheumatoid progression"
    ],
    "supplements": [
      "High-dose antioxidants",
      "Curcumin",
      "Sulforaphane",
      "Vitamin C",
      "NAC",
      "Greens products (lots of greens make SOD for you)"
    ],
    "peptides": [
      "GHK-Cu (tissue repair)"
    ],
    "lifestyle": [
      "10 servings fruits & vegetables daily (CRITICAL for this gene)",
      "Greens smoothies",
      "Mediterranean diet",
      "Antioxidant-rich lifestyle",
      "Reduce toxic exposures"
    ],
    "labs": [
      "8-OHdG",
      "Glutathione levels"
    ]
  },
  {
    "gene": "SLC23A1",
    "rsId": "rs33972313",
    "section": "energy",
    "priority": "LOW",
    "nickname": "Vitamin C door",
    "plain": "This gene lets vitamin C into your cells.",
    "changed": "When it is changed, less vitamin C gets in. Healing and the immune system can be slower.",
    "meds": [
      "If you have had kidney stones, ask a doctor before taking high-dose vitamin C."
    ],
    "technical": {
      "function": "Sodium-dependent Vitamin C Transporter. Gets vitamin C into cells.",
      "effect": "Poor vitamin C absorption into cells."
    },
    "aliases": [],
    "symptoms": [
      "Low intracellular vitamin C",
      "poor immune function",
      "slow collagen repair"
    ],
    "supplements": [
      "High-dose Vitamin C (liposomal preferred)"
    ],
    "peptides": [],
    "lifestyle": [
      "Vitamin C-rich foods daily"
    ],
    "labs": [
      "Micronutrient Testing"
    ]
  },
  {
    "gene": "TTPA",
    "rsId": "rs6994076",
    "section": "energy",
    "priority": "HIGH (especially for dementia/Alzheimer's family history)",
    "nickname": "Vitamin E mover",
    "plain": "This gene moves vitamin E to your brain and liver to protect them.",
    "changed": "When it is changed, your brain and liver may get less vitamin E protection.",
    "meds": [
      "High-dose vitamin E can thin the blood. Ask a doctor if you take blood thinners."
    ],
    "technical": {
      "function": "Alpha-Tocopherol Transfer Protein. Processes and distributes vitamin E (D-tocopherol form). Protects lipid bilayer around neurons and liver.",
      "effect": "Can't produce/process vitamin E properly → cognitive decline risk, liver issues, neuronal membrane degradation."
    },
    "aliases": [],
    "symptoms": [
      "Cognitive decline risk",
      "liver function concerns",
      "neurological membrane integrity issues"
    ],
    "supplements": [
      "D-Alpha Tocopherols 400-800mg",
      "Start by age 35-40 at latest"
    ],
    "peptides": [],
    "lifestyle": [
      "Mediterranean diet (higher vitamin E)",
      "Nuts, seeds, olive oil"
    ],
    "labs": [
      "Micronutrient Testing (intracellular)",
      "Liver panel"
    ]
  },
  {
    "gene": "SLC19A1",
    "rsId": "rs1051266",
    "section": "folate",
    "priority": "MODERATE",
    "nickname": "Folate delivery truck",
    "plain": "This gene carries folate (vitamin B9) into your cells.",
    "changed": "When it is changed, less folate gets in, even if you eat enough.",
    "meds": [
      "Methotrexate blocks folate. If you take it, a doctor should watch your folate.",
      "Choose methylfolate over folic acid in vitamins."
    ],
    "technical": {
      "function": "Reduced Folate Carrier. Transports folate into cells.",
      "effect": "Partial block in folate transport → less folate gets where it needs to go even if dietary intake is adequate."
    },
    "aliases": [],
    "symptoms": [
      "Fatigue",
      "poor methylation despite folate intake"
    ],
    "supplements": [
      "Methylfolate (pre-methylated form)",
      "Riboflavin (B2)",
      "Niacinamide (B3)"
    ],
    "peptides": [],
    "lifestyle": [
      "Eat folate-rich whole foods",
      "AVOID folic acid (processed foods)"
    ],
    "labs": [
      "CBC",
      "Serum & RBC Folate"
    ]
  },
  {
    "gene": "FOLR1",
    "rsId": "rs2071010",
    "section": "folate",
    "priority": "MODERATE",
    "nickname": "Folate door",
    "plain": "This gene opens the door for folate to get into your cells.",
    "changed": "When it is changed, it is harder to get folate in. Folic acid in packaged foods may make you anxious.",
    "meds": [
      "Choose methylfolate over folic acid in vitamins, including prenatal vitamins."
    ],
    "technical": {
      "function": "Folate Receptor 1. Binds and imports folate from diet into cells for conversion.",
      "effect": "Impaired folate binding → can't get dietary folate into cells efficiently. First step in folate → methylfolate conversion is compromised."
    },
    "aliases": [],
    "symptoms": [
      "Low intracellular folate",
      "anxiety from folic acid exposure",
      "poor methylation initiation"
    ],
    "supplements": [
      "Methylfolate (bypasses this block)",
      "Methyl Folate Pro"
    ],
    "peptides": [],
    "lifestyle": [
      "AVOID folic acid (processed foods fortified with it → causes anxiety)",
      "Eat natural folate sources"
    ],
    "labs": [
      "Serum & RBC Folate"
    ]
  },
  {
    "gene": "DHFR",
    "rsId": "rs70991108",
    "section": "folate",
    "priority": "HIGH (combined with other folate genes)",
    "nickname": "Folic acid converter",
    "plain": "This gene changes folic acid into a form your body can use.",
    "changed": "When it is changed, folic acid builds up. It can cause worry, upset stomach, or nausea.",
    "meds": [
      "Methotrexate and some antibiotics (like trimethoprim) act on this gene. A doctor should watch closely.",
      "Read labels and skip folic acid in vitamins."
    ],
    "technical": {
      "function": "Dihydrofolate Reductase. Converts folic acid into usable dihydrofolate, then tetrahydrofolate.",
      "effect": "Can't convert folic acid → it accumulates → causes anxiety, nausea, indigestion. Folic acid becomes toxic."
    },
    "aliases": [],
    "symptoms": [
      "Anxiety from processed foods",
      "nausea",
      "indigestion",
      "unmetabolized folic acid in blood"
    ],
    "supplements": [
      "Methylfolate (skip folic acid entirely)",
      "Must supplement pre-methylated form"
    ],
    "peptides": [],
    "lifestyle": [
      "STRICTLY avoid folic acid",
      "No processed/fortified foods",
      "Check all labels"
    ],
    "labs": [
      "Unmetabolized Folic Acid test"
    ]
  },
  {
    "gene": "MTHFD1",
    "rsId": "rs1076991",
    "section": "folate",
    "priority": "MODERATE",
    "nickname": "Folate helper",
    "plain": "This gene is one step in turning folate into its useful form.",
    "changed": "When it is changed, that step is slower. It adds to other folate changes.",
    "meds": [
      "Choose methylfolate over folic acid in vitamins."
    ],
    "technical": {
      "function": "Methylenetetrahydrofolate Dehydrogenase. Intermediate step in folate metabolism cascade.",
      "effect": "Slowed conversion in the folate cascade. Contributes to overall methylation impairment."
    },
    "aliases": [],
    "symptoms": [
      "Anxiety from processed foods",
      "nausea",
      "indigestion",
      "unmetabolized folic acid in blood"
    ],
    "supplements": [
      "Methylfolate",
      "B-vitamin complex"
    ],
    "peptides": [],
    "lifestyle": [
      "STRICTLY avoid folic acid",
      "No processed/fortified foods",
      "Check all labels"
    ],
    "labs": [
      "Folate panel"
    ]
  },
  {
    "gene": "MTHFR C677T",
    "rsId": "rs1801133",
    "section": "folate",
    "priority": "CRITICAL",
    "nickname": "Main folate switch",
    "plain": "This is a big gene. It turns folate into the active form your whole body uses for mood, hormones, detox, and making new cells.",
    "changed": "With two copies, the switch works only a little. With one copy, it works about half as well. You may feel tired, foggy, or anxious, and homocysteine can rise.",
    "meds": [
      "Laughing gas (nitrous oxide) at the dentist or in surgery can make this worse. Tell the dentist and surgeon.",
      "Methotrexate, metformin, and acid blockers can lower folate or B12. Ask a doctor to check levels.",
      "Choose methylfolate over folic acid, especially in prenatal vitamins."
    ],
    "technical": {
      "function": "THE methylation gene. Converts methyleneTHF → methylTHF (active folate). Foundation of ALL methylation: neurotransmitter conversion, hormone conversion, detox, new cell production, DNA repair.",
      "effect": "+/+: Complete block → significant methylation impairment. +/-: 50% block → manageable with support. Can't make enough methylfolate → impaired detox, hormone balance, neurotransmitter production, cellular repair."
    },
    "aliases": [
      "MTHFR677",
      "C677T"
    ],
    "symptoms": [
      "Anxiety",
      "depression",
      "brain fog",
      "fatigue",
      "elevated homocysteine",
      "poor detox",
      "hormone imbalance",
      "infertility",
      "neural tube defect risk",
      "cardiovascular risk"
    ],
    "supplements": [
      "Methylfolate 1-3 mg DAILY FOR LIFE",
      "Under stress: up to 3-4 mg",
      "Methyl B12",
      "SAM-e",
      "Balance with other B forms (adenosylcobalamin, hydroxocobalamin)"
    ],
    "peptides": [],
    "lifestyle": [
      "ZERO folic acid",
      "Whole food folate sources",
      "If pregnant: methylfolate + methyl B12 critical",
      "Reduce stress (increases methylation demand)",
      "When dieting or training hard, increase methylfolate dose"
    ],
    "labs": [
      "Homocysteine",
      "Serum/RBC Folate",
      "CBC",
      "Methylation Profile"
    ]
  },
  {
    "gene": "MTHFR A1298C",
    "rsId": "rs1801131",
    "section": "folate",
    "priority": "HIGH (especially combined with C677T)",
    "nickname": "Folate switch partner",
    "plain": "This gene works with MTHFR C677T. It helps make brain chemicals that affect mood.",
    "changed": "When both MTHFR genes are changed, the folate problem is bigger. Mood can be affected.",
    "meds": [
      "If you take an antidepressant, ask a doctor before adding SAM-e or 5-HTP. Mixing them can be unsafe.",
      "Laughing gas (nitrous oxide) can make this worse. Tell the dentist and surgeon."
    ],
    "technical": {
      "function": "Second MTHFR allele. Works alongside C677T. Affects BH4 (tetrahydrobiopterin) production which impacts neurotransmitter synthesis.",
      "effect": "Combined with C677T creates compounded methylation block. Affects neurotransmitter production pathway specifically."
    },
    "aliases": [
      "MTHFR1298",
      "A1298C"
    ],
    "symptoms": [
      "Neurotransmitter imbalance",
      "mood issues",
      "combined with C677T = severe methylation impairment"
    ],
    "supplements": [
      "Methylfolate 1-3 mg DAILY FOR LIFE",
      "Under stress: up to 3-4 mg",
      "Methyl B12",
      "SAM-e",
      "Balance with other B forms (adenosylcobalamin, hydroxocobalamin)",
      "Focus on neurotransmitter support: SAM-e",
      "5-HTP if appropriate"
    ],
    "peptides": [],
    "lifestyle": [
      "ZERO folic acid",
      "Whole food folate sources",
      "If pregnant: methylfolate + methyl B12 critical",
      "Reduce stress (increases methylation demand)",
      "When dieting or training hard, increase methylfolate dose"
    ],
    "labs": [
      "Homocysteine",
      "Serum/RBC Folate",
      "CBC",
      "Methylation Profile"
    ]
  },
  {
    "gene": "TCN1",
    "rsId": "rs526934",
    "section": "b12",
    "priority": "MODERATE",
    "nickname": "B12 carrier",
    "plain": "This gene carries vitamin B12 in your blood.",
    "changed": "When it is changed, B12 may look fine on a blood test but not reach your cells.",
    "meds": [
      "Metformin and acid blockers lower B12. Ask a doctor to check MMA, not just B12."
    ],
    "technical": {
      "function": "Transcobalamin 1. First B12 binding protein. Carries B12 in blood.",
      "effect": "Impaired B12 transport. B12 may sit in blood but not get delivered to cells."
    },
    "aliases": [],
    "symptoms": [
      "High serum B12 but functionally deficient",
      "fatigue",
      "low energy"
    ],
    "supplements": [
      "Methylcobalamin",
      "Adenosylcobalamin"
    ],
    "peptides": [],
    "lifestyle": [
      "B12-rich foods: organ meats, shellfish, fish"
    ],
    "labs": [
      "Serum B12",
      "MMA (methylmalonic acid)"
    ]
  },
  {
    "gene": "CUBN",
    "rsId": "rs1801222",
    "section": "b12",
    "priority": "HIGH",
    "nickname": "B12 gate",
    "plain": "This gene lets vitamin B12 into your body from your gut.",
    "changed": "When it is changed, you do not soak up B12 well from food. Tiredness can build up over years.",
    "meds": [
      "Metformin and acid blockers (like omeprazole) lower B12 even more. Ask a doctor.",
      "B12 shots or skin creams skip the gut. Ask a doctor if they fit."
    ],
    "technical": {
      "function": "Cubilin. Absorbs B12 in the gut with intrinsic factor. Gateway for B12 entering the body.",
      "effect": "+/+ Complete block: Body doesn't absorb B12 well from gut. Needs intrinsic factor support. B12 sits in bloodstream unused."
    },
    "aliases": [],
    "symptoms": [
      "Chronic low energy",
      "poor adrenal function",
      "high serum B12 but low cellular B12",
      "fatigue that builds over years"
    ],
    "supplements": [
      "Methyl B12 WITH intrinsic factor",
      "Methylation Pro Topical (bypasses gut)",
      "B12 injections if severe"
    ],
    "peptides": [],
    "lifestyle": [
      "B12-rich foods but absorption is the issue, not intake"
    ],
    "labs": [
      "Serum B12",
      "MMA",
      "Holotranscobalamin"
    ]
  },
  {
    "gene": "TCN2",
    "rsId": "rs1801198",
    "section": "b12",
    "priority": "MODERATE",
    "nickname": "B12 delivery",
    "plain": "This gene brings B12 into your cells so you can use it.",
    "changed": "When it is changed, B12 can look normal in blood but your cells do not get enough.",
    "meds": [
      "Metformin and acid blockers lower B12. Ask a doctor to check holotranscobalamin or MMA."
    ],
    "technical": {
      "function": "Transcobalamin 2. Delivers B12 INTO cells for use. Final step of B12 utilization.",
      "effect": "B12 doesn't get into cells even if levels look normal in blood."
    },
    "aliases": [],
    "symptoms": [
      "Chronic low energy",
      "poor adrenal function",
      "high serum B12 but low cellular B12",
      "fatigue that builds over years"
    ],
    "supplements": [
      "Methylcobalamin",
      "Adenosylcobalamin",
      "Methylation Pro"
    ],
    "peptides": [],
    "lifestyle": [],
    "labs": [
      "Holotranscobalamin",
      "MMA"
    ]
  },
  {
    "gene": "MTRR",
    "rsId": "rs1801394",
    "section": "b12",
    "priority": "MODERATE",
    "nickname": "B12 recycler",
    "plain": "This gene reuses B12 so your body can use it again.",
    "changed": "When it is changed, B12 gets used once and thrown away. You need more of it.",
    "meds": [
      "Metformin and acid blockers lower B12. Ask a doctor to check levels."
    ],
    "technical": {
      "function": "Methionine Synthase Reductase. Recycles B12 for reuse in methylation cycle.",
      "effect": "B12 doesn't get recycled → used once and discarded → higher B12 requirement."
    },
    "aliases": [],
    "symptoms": [
      "Higher B12 needs",
      "methylation inefficiency"
    ],
    "supplements": [
      "Methyl B12",
      "higher doses than typical"
    ],
    "peptides": [],
    "lifestyle": [],
    "labs": [
      "Serum B12",
      "Homocysteine"
    ]
  },
  {
    "gene": "MTR",
    "rsId": "rs1805087",
    "section": "homocysteine",
    "priority": "HIGH",
    "nickname": "Homocysteine recycler",
    "plain": "This gene turns homocysteine back into something useful. Too much homocysteine can hurt blood vessels.",
    "changed": "When it is changed, homocysteine can build up. That is hard on the heart and can cause worry.",
    "meds": [
      "Laughing gas (nitrous oxide) raises homocysteine. Tell the dentist and surgeon.",
      "Methotrexate and some seizure medicines raise homocysteine. Ask a doctor to check it."
    ],
    "technical": {
      "function": "Methionine Synthase. Converts homocysteine back to methionine. Key remethylation enzyme.",
      "effect": "Homocysteine can't be recycled → builds up → vascular damage (tiny cuts in blood vessels), anxiety, cardiovascular risk."
    },
    "aliases": [],
    "symptoms": [
      "Elevated homocysteine",
      "cardiovascular risk",
      "anxiety",
      "vascular inflammation"
    ],
    "supplements": [
      "Methylfolate",
      "Methyl B12",
      "Methionine",
      "TMG"
    ],
    "peptides": [],
    "lifestyle": [
      "Avoid smoking and heavy alcohol"
    ],
    "labs": [
      "Plasma Homocysteine",
      "Methylation Profile"
    ]
  },
  {
    "gene": "BHMT",
    "rsId": "rs3733890",
    "section": "homocysteine",
    "priority": "HIGH",
    "nickname": "Backup recycler",
    "plain": "This gene is a backup way to clean up homocysteine.",
    "changed": "When it is changed, homocysteine builds up faster, mostly when you are stressed. Sleep can suffer.",
    "meds": [
      "Ask a doctor to check homocysteine if you take methotrexate or seizure medicines."
    ],
    "technical": {
      "function": "Betaine-Homocysteine Methyltransferase. Backup pathway to convert homocysteine → methionine using TMG/betaine.",
      "effect": "Backup remethylation pathway impaired → homocysteine accumulates faster, especially under stress. Combined with MTR = significant remethylation problem."
    },
    "aliases": [],
    "symptoms": [
      "Elevated homocysteine",
      "sleep issues",
      "anxiety",
      "indigestion when stressed"
    ],
    "supplements": [
      "TMG (Trimethylglycine) 4g — especially at bedtime",
      "Choline",
      "SAM-e"
    ],
    "peptides": [],
    "lifestyle": [
      "Choline-rich foods (eggs, liver)",
      "Beets (natural betaine source)",
      "TMG at bedtime if anxious/sleepless",
      "Critical under stress"
    ],
    "labs": [
      "Plasma Homocysteine"
    ]
  },
  {
    "gene": "CBS",
    "rsId": "rs234706",
    "section": "homocysteine",
    "priority": "HIGH",
    "nickname": "Homocysteine breaker",
    "plain": "This gene breaks down homocysteine and helps make your body's main cleaner, glutathione.",
    "changed": "When it is changed, homocysteine breaks down slowly and you make less glutathione.",
    "meds": [
      "Ask a doctor to check homocysteine before starting high-dose B vitamins."
    ],
    "technical": {
      "function": "Cystathionine Beta-Synthase. Converts homocysteine → cystathionine → cysteine. Entry into transsulfuration pathway for glutathione production.",
      "effect": "Impaired breakdown of homocysteine through cysteine pathway. Reduced glutathione precursor production."
    },
    "aliases": [],
    "symptoms": [
      "Elevated homocysteine",
      "poor detox support",
      "kidney stress"
    ],
    "supplements": [
      "Methylfolate",
      "Methyl B12",
      "P5P (activated B6)",
      "Choline",
      "TMG",
      "Serine",
      "NAC",
      "Methylation Complete Pro"
    ],
    "peptides": [],
    "lifestyle": [
      "Anti-inflammatory diet",
      "Avoid smoking/alcohol"
    ],
    "labs": [
      "Homocysteine",
      "Cysteine",
      "Glutathione"
    ]
  },
  {
    "gene": "CTH",
    "rsId": "rs1021737",
    "section": "homocysteine",
    "priority": "HIGH",
    "nickname": "Glutathione builder",
    "plain": "This gene makes cysteine, a building block your body uses to make glutathione.",
    "changed": "When it is changed, you make less glutathione. Detox and kidney cleanup can slow down.",
    "meds": [
      "NAC is a supplement used here. It can change how some medicines work, so check with a pharmacist."
    ],
    "technical": {
      "function": "Cystathionine Gamma-Lyase. Final step: converts cystathionine → cysteine (needed for glutathione, kidney clearance).",
      "effect": "Can't make cysteine efficiently → low glutathione production, poor kidney clearance."
    },
    "aliases": [],
    "symptoms": [
      "Poor detoxification",
      "kidney stress",
      "low glutathione"
    ],
    "supplements": [
      "NAC (N-Acetyl Cysteine) 500-900mg",
      "Glutathione (IV or liposomal)",
      "P5P"
    ],
    "peptides": [],
    "lifestyle": [
      "Sulfur-rich foods (cruciferous vegetables, garlic, onions)",
      "NAC long-term for kidney support and glutathione production"
    ],
    "labs": [
      "Whole Blood Glutathione",
      "Kidney function panel"
    ]
  },
  {
    "gene": "GSR",
    "rsId": "rs8190955",
    "section": "detox",
    "priority": "MODERATE",
    "nickname": "Glutathione recycler",
    "plain": "This gene reuses glutathione, your body's main cleaner.",
    "changed": "When it is changed, glutathione gets used up faster.",
    "meds": [
      "No common medicine changes this. Vitamin B2 and food are the main tools."
    ],
    "technical": {
      "function": "Glutathione Reductase. Recycles oxidized glutathione back to its active reduced form.",
      "effect": "Glutathione gets used up faster without being recycled. Need more glutathione input."
    },
    "aliases": [],
    "symptoms": [
      "Faster depletion of glutathione stores",
      "poor antioxidant recycling"
    ],
    "supplements": [
      "Riboflavin (B2)",
      "Reduced Glutathione (liposomal or IV)"
    ],
    "peptides": [],
    "lifestyle": [
      "Glutathione-supporting foods: cruciferous vegetables, avocado, spinach"
    ],
    "labs": [
      "Whole Blood Glutathione"
    ]
  },
  {
    "gene": "GCLC",
    "rsId": "rs17883901",
    "section": "detox",
    "priority": "MODERATE",
    "nickname": "Glutathione maker",
    "plain": "This gene controls how much glutathione your body makes.",
    "changed": "When it is changed, you make less glutathione. You may handle stress and toxins less well.",
    "meds": [
      "Acetaminophen (Tylenol) uses up glutathione. Avoid high doses and ask a doctor."
    ],
    "technical": {
      "function": "Glutamate-Cysteine Ligase. Rate-limiting enzyme in glutathione synthesis.",
      "effect": "Reduced glutathione production capacity."
    },
    "aliases": [],
    "symptoms": [
      "Low glutathione",
      "poor detox capacity",
      "oxidative stress vulnerability"
    ],
    "supplements": [
      "Glutathione (liposomal or IV)",
      "NAC",
      "Glycine",
      "Glutamine"
    ],
    "peptides": [],
    "lifestyle": [
      "Sulfur-rich diet"
    ],
    "labs": [
      "Glutathione levels"
    ]
  },
  {
    "gene": "GSTP1",
    "rsId": "rs1695",
    "section": "detox",
    "priority": "HIGH",
    "nickname": "Toxin tagger",
    "plain": "This gene sticks a 'take me out' tag on toxins so your body can remove them.",
    "changed": "When it is changed, toxins like bug spray and weed killer stay longer.",
    "meds": [
      "Before surgery, ask about glutathione support with your care team.",
      "Some cancer medicines are cleared by this gene. Tell an oncologist about this result."
    ],
    "technical": {
      "function": "Glutathione S-Transferase P1. Conjugates glutathione to toxins for removal. Phase 2 detox enzyme.",
      "effect": "Impaired ability to attach glutathione to toxins → toxins don't get tagged for removal efficiently. Herbicide/pesticide sensitivity."
    },
    "aliases": [],
    "symptoms": [
      "Chemical sensitivity",
      "poor pesticide/herbicide clearance",
      "need pre-anesthesia glutathione"
    ],
    "supplements": [
      "NAC",
      "Glutathione (IV pre-surgery recommended)",
      "Intracellular Detox Complex"
    ],
    "peptides": [],
    "lifestyle": [
      "Avoid herbicides/pesticides",
      "Eat organic when possible",
      "Avoid unnecessary chemical exposures",
      "Pre-anesthesia glutathione if having surgery"
    ],
    "labs": [
      "Whole Blood Glutathione",
      "Toxic Metal Testing"
    ]
  },
  {
    "gene": "GSTT1",
    "rsId": "deletion",
    "section": "detox",
    "priority": "CRITICAL (if deleted)",
    "nickname": "Chemical cleaner",
    "plain": "This gene cleans out strong chemicals like solvents and factory fumes.",
    "changed": "If this gene is missing, your body cannot clean these chemicals well at all.",
    "meds": [
      "Tell doctors about this result. Some medicines and anesthesia are cleared by this pathway."
    ],
    "technical": {
      "function": "Glutathione S-Transferase Theta 1. Detoxifies industrial chemicals, solvents, carcinogens.",
      "effect": "Gene deletion = NO production. Can't detox heavy industrial chemicals at all."
    },
    "aliases": [],
    "symptoms": [
      "Extreme chemical sensitivity",
      "unable to clear solvents/industrial toxins"
    ],
    "supplements": [
      "Glutathione (high dose)",
      "NAC",
      "Choline",
      "Cytodetox",
      "Brain Clear"
    ],
    "peptides": [],
    "lifestyle": [
      "Be 'crunchy' — avoid chemicals, cleaners, factory proximity",
      "Organic everything",
      "Annual detox protocols",
      "Avoid toxic environments completely"
    ],
    "labs": [
      "Environmental Toxin Panel",
      "Heavy Metals"
    ]
  },
  {
    "gene": "NAT2",
    "rsId": "rs1801280",
    "section": "detox",
    "priority": "HIGH",
    "nickname": "Drug and chemical clearer",
    "plain": "This gene clears some medicines and chemicals out of your body.",
    "changed": "When it is changed, you clear them slowly. Some medicines can build up and cause side effects.",
    "meds": [
      "You may be a slow clearer of isoniazid, hydralazine, and some sulfa drugs. Ask a doctor about doses.",
      "Share this result with a pharmacist before starting new medicines."
    ],
    "technical": {
      "function": "N-Acetyltransferase 2. Clears industrial chemicals, aromatic amines, drug metabolites through acetylation.",
      "effect": "Slow acetylator. Industrial chemicals, solvents, heavy metals clear slowly from body."
    },
    "aliases": [],
    "symptoms": [
      "Chemical sensitivity",
      "medication sensitivity",
      "toxin accumulation",
      "slow drug metabolism"
    ],
    "supplements": [
      "Silymarin (Milk Thistle)",
      "Alpha Lipoic Acid (ALA)",
      "P5P",
      "Catechins",
      "Cytodetox",
      "Brain Clear"
    ],
    "peptides": [],
    "lifestyle": [
      "Clean living environment",
      "Avoid chemical exposures",
      "Organic foods",
      "Annual detox protocol",
      "Liver support",
      "Be aware of medication dosing (slow metabolizer)"
    ],
    "labs": [
      "Environmental Toxin Panel",
      "Heavy Metal Testing"
    ]
  },
  {
    "gene": "COMT",
    "rsId": "rs4680",
    "section": "brain",
    "priority": "CRITICAL — Most impactful neurotransmitter gene",
    "nickname": "Warrior gene",
    "plain": "This gene cleans up dopamine and adrenaline, the brain chemicals for focus and drive.",
    "changed": "When it is changed, these chemicals stay high. You may be sharp and driven but have a hard time calming down, sleeping, or shutting off worry.",
    "meds": [
      "ADHD stimulants and caffeine can feel extra strong. Ask a doctor about low doses.",
      "Estrogen therapy and birth control clear more slowly with this gene. Ask a doctor.",
      "LDN is a prescription some providers use to calm the nervous system.",
      "Do not mix SAM-e, methylene blue, or lithium with antidepressants unless a doctor says it is safe.",
      "Prescription option from the protocol (needs a doctor): Methylene Blue (5-12mg as Adderall alternative)",
      "Prescription option from the protocol (needs a doctor): LDN (4mg — calms nervous system + dopamine)",
      "Prescription option from the protocol (needs a doctor): Psilocybin microdose (controlled, with doctor)"
    ],
    "technical": {
      "function": "Catechol-O-Methyltransferase. THE 'Warrior Gene.' Breaks down dopamine, norepinephrine, and epinephrine. Only 10-12% of population has this mutation.",
      "effect": "+/+ (slow metabolizer): Dopamine stays HIGH → hyper-focused, driven, high-performance BUT can't calm down. Dopamine-seeking behaviors. Creates sympathetic dominance. Brain is 'stupidly powerful' — can manifest physical symptoms from thoughts alone (anhedonic dysregulation)."
    },
    "aliases": [],
    "symptoms": [
      "Anxiety",
      "insomnia",
      "dopamine-seeking (overwork, food, chaos creation)",
      "intrusive thoughts",
      "fear-based thinking",
      "anger",
      "addiction susceptibility",
      "bipolar features",
      "hypersensitivity",
      "heart palpitations",
      "obsessive patterns",
      "anhedonia (when dopamine crashes)"
    ],
    "supplements": [
      "SAM-e/Bliss4 (1-2x daily)",
      "TMG 4-8g (at bedtime)",
      "Methylfolate",
      "Alpha-GPC",
      "Phosphatidylserine (100-200mg at night)",
      "Lithium Orotate (5mg)"
    ],
    "peptides": [],
    "lifestyle": [
      "Eat FRESH — avoid leftovers (tyramine/phenylethylamine build dopamine)",
      "Avoid folic acid",
      "Mediterranean",
      "Anti-inflammatory",
      "Cold therapy (stimulates dopamine + calms nervous system)",
      "Breathwork",
      "Parasympathetic practices",
      "Walks in nature",
      "MUST take breaks during the day to decompress",
      "Therapy",
      "Dopamine reset weekends",
      "Surrender outcomes",
      "Track anxiety/depression/anger 1-10 daily"
    ],
    "labs": [
      "Neurotransmitter Metabolite Testing",
      "PGx Testing (pharmacogenomics)"
    ]
  },
  {
    "gene": "MAOA",
    "rsId": "rs6323",
    "section": "brain",
    "priority": "CRITICAL (especially combined with COMT)",
    "nickname": "Mood chemical cleaner",
    "plain": "This gene cleans up serotonin, dopamine, and adrenaline.",
    "changed": "When it is changed, these chemicals build up. Mood can swing high and low, and aged foods may bother you.",
    "meds": [
      "Do not stack mood supplements like 5-HTP, saffron, or SAM-e with antidepressants without a doctor. It can be unsafe.",
      "If you ever take an MAOI medicine, follow its food rules carefully.",
      "Prescription option from the protocol (needs a doctor): Methylene Blue (5-12mg as Adderall alternative)",
      "Prescription option from the protocol (needs a doctor): LDN (4mg — calms nervous system + dopamine)",
      "Prescription option from the protocol (needs a doctor): Psilocybin microdose (controlled, with doctor)"
    ],
    "technical": {
      "function": "Monoamine Oxidase A. Breaks down serotonin, dopamine, norepinephrine. 'Double warrior' when combined with COMT.",
      "effect": "Slow amine metabolism → excess catecholamines. Combined with COMT = maximum warrior phenotype. Highest risk for emotional dysregulation. Susceptible to 95% of SIRS/EBV/Lyme/Mold cases."
    },
    "aliases": [],
    "symptoms": [
      "All COMT symptoms amplified. Plus: tyramine sensitivity",
      "histamine-like reactions from aged foods",
      "extreme highs and lows"
    ],
    "supplements": [
      "SAM-e/Bliss4 (1-2x daily)",
      "TMG 4-8g (at bedtime)",
      "Methylfolate",
      "Alpha-GPC",
      "Phosphatidylserine (100-200mg at night)",
      "Lithium Orotate (5mg)",
      "Riboflavin (B2)",
      "Taurine",
      "Choline",
      "TMG",
      "DMG",
      "Inositol",
      "Avoid tyramine foods",
      "Happy Saffron"
    ],
    "peptides": [],
    "lifestyle": [
      "MUST eat fresh",
      "No leftovers",
      "Avoid aged cheese, fermented foods, processed meats",
      "Tyramine and phenylethylamine awareness",
      "Cold therapy (stimulates dopamine + calms nervous system)",
      "Breathwork",
      "Parasympathetic practices",
      "Walks in nature",
      "MUST take breaks during the day to decompress",
      "Therapy",
      "Dopamine reset weekends",
      "Surrender outcomes",
      "Track anxiety/depression/anger 1-10 daily",
      "Balance serotonin/oxytocin: communicate feelings, hug fur babies, meditation, breathwork, loving relationships"
    ],
    "labs": [
      "Neurotransmitter Metabolite Testing",
      "PGx Testing (pharmacogenomics)"
    ]
  },
  {
    "gene": "MAOB",
    "rsId": "rs1799836",
    "section": "brain",
    "priority": "HIGH (combined with COMT/MAOA)",
    "nickname": "Dopamine cleaner",
    "plain": "This gene cleans up dopamine.",
    "changed": "When it is changed, dopamine builds up more, adding to MAOA and COMT changes.",
    "meds": [
      "Some Parkinson's medicines block this gene. Tell a doctor about this result.",
      "Prescription option from the protocol (needs a doctor): Methylene Blue (5-12mg as Adderall alternative)",
      "Prescription option from the protocol (needs a doctor): LDN (4mg — calms nervous system + dopamine)",
      "Prescription option from the protocol (needs a doctor): Psilocybin microdose (controlled, with doctor)"
    ],
    "technical": {
      "function": "Monoamine Oxidase B. Breaks down dopamine and phenylethylamine.",
      "effect": "Adds to catecholamine excess. Third layer of monoamine oxidase impairment."
    },
    "aliases": [],
    "symptoms": [
      "Same pattern as MAOA",
      "additional dopamine accumulation"
    ],
    "supplements": [
      "SAM-e/Bliss4 (1-2x daily)",
      "TMG 4-8g (at bedtime)",
      "Methylfolate",
      "Alpha-GPC",
      "Phosphatidylserine (100-200mg at night)",
      "Lithium Orotate (5mg)",
      "Riboflavin (B2)",
      "Taurine",
      "Choline",
      "TMG",
      "DMG",
      "Inositol",
      "Avoid tyramine foods",
      "Happy Saffron"
    ],
    "peptides": [],
    "lifestyle": [
      "MUST eat fresh",
      "No leftovers",
      "Avoid aged cheese, fermented foods, processed meats",
      "Tyramine and phenylethylamine awareness",
      "Cold therapy (stimulates dopamine + calms nervous system)",
      "Breathwork",
      "Parasympathetic practices",
      "Walks in nature",
      "MUST take breaks during the day to decompress",
      "Therapy",
      "Dopamine reset weekends",
      "Surrender outcomes",
      "Track anxiety/depression/anger 1-10 daily",
      "Balance serotonin/oxytocin: communicate feelings, hug fur babies, meditation, breathwork, loving relationships"
    ],
    "labs": [
      "Neurotransmitter Metabolite Testing",
      "PGx Testing (pharmacogenomics)"
    ]
  },
  {
    "gene": "GAD1 (allele 1)",
    "rsId": "rs3828275",
    "section": "brain",
    "priority": "HIGH",
    "nickname": "Calm chemical maker",
    "plain": "This gene turns glutamate (an 'on' chemical) into GABA (a 'calm' chemical).",
    "changed": "When it is changed, you make less calm chemical. You may feel nervous, restless, or have trouble sleeping.",
    "meds": [
      "Sleep and anxiety medicines like benzodiazepines and gabapentin work on GABA. Only use them with a doctor.",
      "Amantadine is a prescription some providers use. Ask a doctor.",
      "Prescription option from the protocol (needs a doctor): Amantadine (prescription)",
      "Prescription option from the protocol (needs a doctor): LDN supports this pathway too"
    ],
    "technical": {
      "function": "Glutamic Acid Decarboxylase. Converts glutamate (excitatory/anxiety) → GABA (calming). Two alleles exist.",
      "effect": "Glutamate can't convert to GABA → anxiety, nervousness, insomnia. Complete block in one allele = significant anxiety generator."
    },
    "aliases": [
      "GAD1"
    ],
    "symptoms": [
      "Anxiety",
      "nervousness",
      "insomnia",
      "restlessness",
      "glutamate sensitivity",
      "racing thoughts"
    ],
    "supplements": [
      "L-Theanine",
      "Melatonin",
      "Magnesium",
      "NAC",
      "Zinc",
      "Oxaloacetate (Benagine)",
      "GAD Pro Enhancer",
      "Elderberry",
      "Glycine"
    ],
    "peptides": [],
    "lifestyle": [
      "Avoid MSG and glutamate-rich processed foods",
      "Breathwork, meditation, nervous system calming"
    ],
    "labs": [
      "Neurotransmitter testing"
    ]
  },
  {
    "gene": "GAD1 (allele 2)",
    "rsId": "rs769407",
    "section": "brain",
    "priority": "CRITICAL (if both alleles blocked)",
    "nickname": "Calm chemical maker 2",
    "plain": "This is the second copy of GAD1. It is a backup for making the calm chemical.",
    "changed": "When both copies are changed, it is much harder to make calm chemical. Anxiety can be strong.",
    "meds": [
      "Strong anxiety needs a doctor's care. Medicines that act on GABA should only be used with a doctor.",
      "Prescription option from the protocol (needs a doctor): Amantadine (prescription)",
      "Prescription option from the protocol (needs a doctor): Consider prescription Ketamine therapy in controlled setting",
      "Prescription option from the protocol (needs a doctor): LDN supports this pathway too",
      "Prescription option from the protocol (needs a doctor): Psilocybin microdose may help"
    ],
    "technical": {
      "function": "Second allele of GAD1. Backup for glutamate → GABA conversion.",
      "effect": "If both alleles affected, glutamate → GABA conversion is severely impaired. Massive anxiety."
    },
    "aliases": [],
    "symptoms": [
      "Severe anxiety",
      "panic features",
      "sleep disruption"
    ],
    "supplements": [
      "L-Theanine",
      "Melatonin",
      "Magnesium",
      "NAC",
      "Zinc",
      "Oxaloacetate (Benagine)",
      "GAD Pro Enhancer",
      "Elderberry",
      "Glycine"
    ],
    "peptides": [],
    "lifestyle": [
      "Avoid MSG and glutamate-rich processed foods",
      "Breathwork, meditation, nervous system calming"
    ],
    "labs": [
      "Neurotransmitter testing"
    ]
  },
  {
    "gene": "TRPM6",
    "rsId": "rs2274924",
    "section": "brain",
    "priority": "MODERATE",
    "nickname": "Magnesium door",
    "plain": "This gene lets magnesium in. Magnesium relaxes muscles and helps you sleep.",
    "changed": "When it is changed, you soak up less magnesium. Cramps, poor sleep, and restless legs can happen.",
    "meds": [
      "Acid blockers (like omeprazole) and water pills lower magnesium. Ask a doctor to check levels."
    ],
    "technical": {
      "function": "Transient Receptor Potential Melastatin 6. Magnesium ion channel. Controls magnesium absorption.",
      "effect": "Poor magnesium absorption → affects nerve function, muscle relaxation, sleep, hundreds of enzymatic reactions."
    },
    "aliases": [],
    "symptoms": [
      "Muscle cramps",
      "poor sleep",
      "anxiety",
      "nerve issues",
      "restless legs"
    ],
    "supplements": [
      "Magnesium (glycinate, threonate, or taurate preferred)",
      "Higher doses than typical"
    ],
    "peptides": [],
    "lifestyle": [
      "Magnesium-rich foods: dark leafy greens, nuts, seeds, dark chocolate"
    ],
    "labs": [
      "RBC Magnesium",
      "Micronutrient Testing"
    ]
  },
  {
    "gene": "F2",
    "rsId": "rs1799963",
    "section": "heart",
    "priority": "HIGH",
    "nickname": "Clotting gene",
    "plain": "This gene helps your blood clot when you get a cut.",
    "changed": "When it is changed, your blood may clot too easily. That raises the risk of blood clots.",
    "meds": [
      "Birth control pills and hormone therapy with estrogen raise clot risk. Ask about non-estrogen options.",
      "Fish oil and nattokinase thin the blood. Do not mix them with blood thinners without a doctor.",
      "Baby aspirin or blood thinners are only for a doctor to decide.",
      "Prescription option from the protocol (needs a doctor): baby aspirin (discuss with doctor)"
    ],
    "technical": {
      "function": "Prothrombin (Factor II). Clotting factor in coagulation cascade.",
      "effect": "Increased blood clot risk. Factor V Leiden-like risk."
    },
    "aliases": [
      "PROTHROMBIN"
    ],
    "symptoms": [
      "Deep vein thrombosis risk",
      "stroke risk",
      "clotting events"
    ],
    "supplements": [
      "Fish oil",
      "Nattokinase"
    ],
    "peptides": [],
    "lifestyle": [
      "Anti-inflammatory diet",
      "Stay hydrated",
      "Move frequently",
      "Compression socks for flights",
      "Avoid prolonged sitting"
    ],
    "labs": [
      "PT/INR",
      "D-Dimer",
      "Factor V Leiden panel"
    ]
  },
  {
    "gene": "F5",
    "rsId": "rs6025",
    "section": "heart",
    "priority": "HIGH",
    "nickname": "Factor V Leiden",
    "plain": "This is the most common gene that makes blood clot too easily.",
    "changed": "When it is changed, blood clots in the legs or lungs are more likely.",
    "meds": [
      "Birth control pills and hormone therapy with estrogen raise clot risk. Ask about non-estrogen options.",
      "Tell every doctor before surgery or long trips.",
      "Fish oil and nattokinase thin the blood. Do not mix them with blood thinners without a doctor.",
      "Prescription option from the protocol (needs a doctor): baby aspirin (discuss with doctor)"
    ],
    "technical": {
      "function": "Factor V Leiden. Most common hereditary clotting disorder.",
      "effect": "Increased clotting risk. APC resistance."
    },
    "aliases": [
      "FACTOR V",
      "FACTOR V LEIDEN",
      "F5 LEIDEN"
    ],
    "symptoms": [
      "DVT",
      "pulmonary embolism risk",
      "clotting events"
    ],
    "supplements": [
      "Fish oil",
      "Nattokinase"
    ],
    "peptides": [],
    "lifestyle": [
      "Anti-inflammatory diet",
      "Stay hydrated",
      "Move frequently",
      "Compression socks for flights",
      "Avoid prolonged sitting"
    ],
    "labs": [
      "PT/INR",
      "D-Dimer",
      "Factor V Leiden panel"
    ]
  },
  {
    "gene": "F10",
    "rsId": "rs3211783",
    "section": "heart",
    "priority": "MODERATE",
    "nickname": "Clotting helper",
    "plain": "This gene is a small part of how your blood clots.",
    "changed": "When it is changed, your blood can get a little thicker, mostly when swelling is high.",
    "meds": [
      "Tell a doctor before starting estrogen or hormone therapy."
    ],
    "technical": {
      "function": "Factor X. Part of coagulation cascade. Weakest of clotting factors.",
      "effect": "Mild increase in blood thickness. Combined with inflammation = thickened blood over time."
    },
    "aliases": [],
    "symptoms": [
      "Blood thickening under stress",
      "cardiovascular risk if inflammation is chronic"
    ],
    "supplements": [
      "Fish oil",
      "anti-inflammatory support"
    ],
    "peptides": [],
    "lifestyle": [
      "Anti-inflammatory diet",
      "Manage inflammation",
      "Monitor blood viscosity if combined with other inflammatory genes"
    ],
    "labs": [
      "CBC",
      "D-Dimer",
      "CRP"
    ]
  },
  {
    "gene": "ACE",
    "rsId": "rs4646994",
    "section": "heart",
    "priority": "MODERATE-HIGH",
    "nickname": "Blood pressure gene",
    "plain": "This gene helps control your blood pressure and body water.",
    "changed": "When it is changed, salt and stress can raise your blood pressure and make you swell.",
    "meds": [
      "ACE inhibitor or ARB blood pressure medicines may work well for you. Ask a doctor.",
      "Pain pills like ibuprofen can raise blood pressure. Use them less often."
    ],
    "technical": {
      "function": "Angiotensin Converting Enzyme. Regulates blood pressure and fluid balance.",
      "effect": "+/+ Complete block: Increased hypertension risk. Swelling under stress. Salt-sensitive."
    },
    "aliases": [],
    "symptoms": [
      "Hypertension risk",
      "swelling when stressed or flying",
      "water retention",
      "salt sensitivity"
    ],
    "supplements": [
      "Electrolytes: 2:1 or 1:1 potassium-to-sodium ratio (NOT high sodium)",
      "Go more potassium",
      "Reduce sodium after age 40"
    ],
    "peptides": [],
    "lifestyle": [
      "Lower sodium diet",
      "Higher potassium foods (bananas, avocado, sweet potato)",
      "Don't gain excess weight",
      "Stress management",
      "'Lean and serene OR stressed and swollen.'"
    ],
    "labs": [
      "Blood pressure monitoring",
      "BMP",
      "Renin/Aldosterone"
    ]
  },
  {
    "gene": "ApoB",
    "rsId": "rs693",
    "section": "heart",
    "priority": "HIGH",
    "nickname": "Cholesterol carrier",
    "plain": "This gene makes the carrier that moves LDL cholesterol in your blood.",
    "changed": "When it is changed, your LDL cholesterol can run high. Very high-fat diets may not be good for you long term.",
    "meds": [
      "Statins, ezetimibe, or other cholesterol medicines may be options. Ask a doctor.",
      "Berberine and red yeast rice act like statins. Do not mix them with statins unless a doctor says so."
    ],
    "technical": {
      "function": "Apolipoprotein B. Major component of LDL particles. Affects cholesterol transport.",
      "effect": "Higher LDL/ApoB. Genetically driven elevated cholesterol. Not ideal for high-saturated-fat diets long-term."
    },
    "aliases": [
      "APOB"
    ],
    "symptoms": [
      "Elevated LDL",
      "cardiovascular risk",
      "poor response to carnivore/high-sat-fat diets"
    ],
    "supplements": [
      "Fish oil",
      "plant sterols",
      "fiber",
      "Berberine"
    ],
    "peptides": [],
    "lifestyle": [
      "Mediterranean (not carnivore long-term)",
      "Balanced mono/poly/sat fat",
      "High fiber",
      "Moderate protein",
      "Can use keto/carnivore as acute medicinal phases but not as lifestyle"
    ],
    "labs": [
      "Lipid panel with ApoB",
      "LDL-P",
      "Lp(a)"
    ]
  },
  {
    "gene": "CYP1A2",
    "rsId": "rs762551",
    "section": "detox",
    "priority": "LOW",
    "nickname": "Caffeine clearer",
    "plain": "This gene clears caffeine from your body.",
    "changed": "If you are a slow clearer, coffee stays in you longer. It can make you jittery or keep you awake.",
    "meds": [
      "This gene also clears some medicines, like some antidepressants and asthma medicines. Share this result with a pharmacist.",
      "Smoking speeds this gene up, and quitting slows it down. That can change medicine doses."
    ],
    "technical": {
      "function": "Cytochrome P450 1A2. Metabolizes caffeine in the liver.",
      "effect": "Slow metabolizer: Caffeine stays in system longer → jitters, anxiety, sleep disruption. Fast metabolizer: No issues with caffeine."
    },
    "aliases": [],
    "symptoms": [
      "Caffeine sensitivity",
      "insomnia",
      "anxiety from coffee",
      "or no issues at all (depends on variant)"
    ],
    "supplements": [
      "If slow: reduce caffeine",
      "If fast: caffeine is fine"
    ],
    "peptides": [],
    "lifestyle": [
      "Adjust caffeine based on variant",
      "Slow = limit",
      "Fast = enjoy"
    ],
    "labs": []
  },
  {
    "gene": "CYP19A1",
    "rsId": "rs10046",
    "section": "hormones",
    "priority": "HIGH",
    "nickname": "Estrogen maker",
    "plain": "This gene turns testosterone into estrogen.",
    "changed": "When it is fast, your body makes more estrogen and less testosterone. Mood can swing.",
    "meds": [
      "If you take testosterone, a doctor may add an estrogen blocker (like anastrozole). Never guess the dose.",
      "Some breast cancer medicines work on this gene. Tell an oncologist about this result."
    ],
    "technical": {
      "function": "Aromatase enzyme. Converts testosterone → estrogen.",
      "effect": "Fast converter: testosterone converts to estrogen rapidly → low T, high E, emotional volatility, gynecomastia in men. Estrogen detox through high-oxidative pathways."
    },
    "aliases": [],
    "symptoms": [
      "Low testosterone despite healthy lifestyle",
      "high estrogen",
      "emotional swings",
      "gynecomastia (men)",
      "estrogen-dominant symptoms (women)",
      "cancer risk from poor estrogen clearance"
    ],
    "supplements": [
      "DIM",
      "Calcium D-Glucarate",
      "Chrysin (aromatase inhibitor)",
      "Anti-estrogen support if on TRT",
      "Especially important for COMT individuals"
    ],
    "peptides": [],
    "lifestyle": [
      "Cruciferous vegetables (natural DIM)",
      "Avoid xenoestrogens (plastics, BPA)",
      "If on TRT: take anti-estrogen weekly",
      "Monitor estrogen metabolites"
    ],
    "labs": [
      "Estrogen metabolites (2:16 ratio)",
      "Total/Free Testosterone",
      "SHBG"
    ]
  },
  {
    "gene": "FOXE1",
    "rsId": "various",
    "section": "hormones",
    "priority": "MODERATE-HIGH",
    "nickname": "Thyroid fuel gene",
    "plain": "This gene helps your thyroid use iodine and selenium to make its hormone.",
    "changed": "When it is changed, you may run low on iodine or selenium. Your thyroid can slow down.",
    "meds": [
      "If you take thyroid medicine, ask a doctor before taking iodine.",
      "Iodine can bother Hashimoto's thyroid. Check thyroid antibodies first."
    ],
    "technical": {
      "function": "Forkhead Box E1. Processes selenium and iodine for thyroid hormone production.",
      "effect": "Prone to low selenium and iodine → hypothyroid risk. Subclinical thyroid issues."
    },
    "aliases": [],
    "symptoms": [
      "Hypothyroid symptoms: fatigue",
      "weight gain",
      "cold intolerance",
      "brain fog",
      "hair thinning"
    ],
    "supplements": [
      "Iodoral 12.5mg (iodine/potassium iodide) 1-2x/week",
      "month on/month off",
      "Selenium 200mcg"
    ],
    "peptides": [],
    "lifestyle": [
      "Iodine-rich foods: seaweed, fish, dairy",
      "Selenium-rich foods: Brazil nuts, fish, eggs"
    ],
    "labs": [
      "Full Thyroid Panel (TSH, Free T3, Free T4, RT3, antibodies)"
    ]
  },
  {
    "gene": "PDE8B",
    "rsId": "rs4704397",
    "section": "hormones",
    "priority": "MODERATE",
    "nickname": "Thyroid shield",
    "plain": "This gene affects how your thyroid handles chlorine, fluoride, and bromine.",
    "changed": "When it is changed, these chemicals can push out iodine and slow your thyroid.",
    "meds": [
      "If you take thyroid medicine, ask a doctor before taking iodine."
    ],
    "technical": {
      "function": "Phosphodiesterase 8B. Affects thyroid function and halogen processing.",
      "effect": "More susceptible to halogen overload (bromine, chlorine, fluorine). These compete with iodine for receptor sites, suppressing thyroid."
    },
    "aliases": [],
    "symptoms": [
      "Thyroid suppression under stress",
      "sensitivity to chlorinated pools",
      "fluoride",
      "flame retardants"
    ],
    "supplements": [
      "Iodine 12.5mg weekly to push halogens out",
      "Halogen detox",
      "Flush protocol helps"
    ],
    "peptides": [],
    "lifestyle": [
      "Avoid fluoride toothpaste",
      "Filter water",
      "Non-chlorine pool (salt water)",
      "Minimize flame retardant exposure (new furniture, mattresses)",
      "Less fluoride",
      "Less bromine"
    ],
    "labs": [
      "Thyroid panel",
      "Halide levels"
    ]
  }
];
