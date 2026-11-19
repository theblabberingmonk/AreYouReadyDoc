# 05 — Content Plan

## Sources

| Source | What we take | Status |
|---|---|---|
| Workspace `solution/` pipeline | 17 solved papers, ~170 model answers, 1 checked illustration/question, 20 SVG figures | 12 exported; re-run for 17 after fixing paper-10 titles (below) |
| NBE curriculum: *Competency Based Training Programme in DNB–Paediatric Surgery* (nbe.edu.in) | The 14 syllabus areas → lesson skeleton + coverage checklist | Captured below |
| NBE recommended texts (Spitz & Coran; Ashcraft's; Prem Puri; Jones'; Mattei; Carachi…) | Bibliography page + "further reading" per lesson | Listed in curriculum |

## The 14 NBE syllabus areas → lesson modules

The official syllabus outline, mapped to lesson module slugs. One module per
area in v1; heavy areas split in v2.

| # | Syllabus area (official wording, abridged) | Module slug |
|---|---|---|
| I | Basic medical sciences as applied to paediatric surgery (developmental anatomy, neonatal physiology/metabolism/pathology, pharmacokinetics, biochemistry, fetal A&P) | `i-basic-sciences` |
| II | Growth & development | `ii-growth-development` |
| III | Genetics as applied to surgery; parent counselling | `iii-genetics-counselling` |
| IV | Common paediatric medical conditions and their treatment | `iv-medical-conditions` |
| V | Neonatal surgery | `v-neonatal-surgery` |
| VI | Etiology and treatment of congenital malformations | `vi-congenital-malformations` |
| VII | Organisation of intensive care, referral & transfer services | `vii-sicu-transport` |
| VIII | Specialised investigative procedures: technique and interpretation | `viii-investigations` |
| IX | Pathology of surgical conditions of childhood | `ix-surgical-pathology` |
| X | Systemic and regional paediatric surgery (incl. urology, plastic, thoracic, neurosurgery) | `x-regional-surgery` |
| XI | Paediatric operative surgery | `xi-operative-surgery` |
| XII | Trauma in children, including burns | `xii-trauma-burns` |
| XIII | Malignancy in childhood; antineoplastic drugs and radiation | `xiii-oncology` |
| XIV | Biostatistics, research methodology, ethics, medico-legal, health policy | `xiv-research-ethics` |

## Lesson anatomy

Each lesson page: **objectives** (3–6, exam-worded) → **core revision text**
(curated from the human-authored model answers, stitched with editorial
transitions — never AI-written in v1) → **figures** (the existing SVG set) →
**asked-in-papers** (linked questions) → **syllabus checklist** (official
bullets, ticked as covered).

v1 lesson text is assembled from what already exists. Example: `v-neonatal-surgery`
draws from CDH (papers 01/04/11), oesophageal atresia (06/08/11), NEC (04),
abdominal-wall defects (01/06/11), neonatal obstruction (01/04/11),
meconium ileus, neonatal sepsis/SIRS (05), thermoregulation/transport (04),
SICU organisation (09). That is a full module on day one.

## Topic taxonomy (controlled, from real data)

Derived from the actual question titles across the 17 papers. ~14 topics,
each mapped to syllabus areas. Every question gets ≥ 1 topic slug at export
time (export script v2, deterministic keyword rules + a hand-maintained
override table for edge cases).

| Topic slug | Covers (examples from real questions) | Areas |
|---|---|---|
| `neonatal-emergencies` | CDH, EA/TEF, NEC, abdominal-wall defects, neonatal obstruction, meconium ileus | V, VI |
| `gi-hepatobiliary` | Hirschsprung, ARM/cloaca, biliary atresia, choledochal cyst, malrotation, atresias, duplications/Meckel, appendicitis/intussusception, achalasia, caustic ingestion, upper-GI bleed | VI, X |
| `urology` | PUV, VUR/reimplant, hypospadias, UPJ/antenatal HN, duplex/ureterocele, neurogenic bladder, augmentation, undescended testis, DSD/CAH | X |
| `oncology` | Neuroblastoma, Wilms/non-Wilms renal, hepatoblastoma, germ-cell/SCT, rhabdomyosarcoma, vascular tumours | XIII |
| `thoracic` | CPAM/sequestration, empyema/chylothorax, mediastinal masses, chest wall/pectus, lung development | X |
| `trauma-burns` | Solid-organ injury/FAST, trauma scores, SCIWORA, burns, compartment syndrome | XII |
| `perioperative-critical-care` | Fluids/electrolytes, TPN/vascular access, ventilation/ECMO, thermoregulation, transport, sepsis/MODS, intestinal failure/transplant | I, VII |
| `basic-sciences` | Fetal circulation, embryology tables (arches/duplex law), pharmacokinetics, genetics | I, II, III |
| `investigations` | Renal scintigraphy/renogram, urodynamics, PET/molecular imaging, ultrasound | VIII |
| `operative-tech` | MIS/robotics, energy devices/CUSA, tissue engineering | XI |
| `plastic-reconstructive` | Clefts, craniosynostosis, torticollis, branchial/thyroglossal, cervical nodes | X |
| `neurosurgery` | Neural-tube defects/tethered cord, hydrocephalus/shunts | X |
| `endocrine-bariatric` | Adolescent obesity/metabolic surgery | X |
| `research-ethics` | Study designs, statistics, bias, publication metrics | XIV |

## Past-papers section

The 17 published papers, grouped by session, newest first:

`2023-04` (1) · `2022-12` (4) · `2022-06` (3) · `2021-10` (2) · `2020-12` (4) · `2020-06` (3)

New papers join the site only when their solutions pass the workspace checklist
(next up: paper 18 = `2023-04 Paper 2`). The export script's `wanted` set is
the gate — increment it deliberately.

## Content pipeline & data quality

- `export_site_data.py` (parent workspace, run manually) is the only path
  content takes into this repo. Repo content is fully regenerable from the
  workspace — never hand-edit `data/` or `public/assets/`.
- **Known issue to fix before next export**: paper `10` (`2022-06 · DrNB ·
  Paper 1`) exports with empty titles (`"Question N"`) — its answers.md is
  missing the `### <title>` heading the parser expects. Fix upstream in the
  workspace, not in the JSON.
- Export v2 additions: `topics[]` per question, `topics.json`, `lessons/`,
  `search-index.json`, and `index.json` (currently not written — the script
  writes it but the run was partial; re-run).
- Zod-validate all content JSON at build time; a malformed export fails the
  build, never reaches users.

## Editorial rules

- Model answers stay as authored in the workspace; the site renders, it does
  not rewrite.
- Attribution line on every paper page: session + paper, "Questions © NBE,
  reproduced for educational fair dealing; answers and illustrations original."
- No ads, no SEO-bait pages, no content marketing. The library is the site.
