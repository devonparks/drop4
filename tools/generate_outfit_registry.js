#!/usr/bin/env node
/**
 * Generate src/data/outfitRegistry.ts from the .glb files in
 * src/assets/models/outfits/.
 *
 * Filenames look like `<species>_<pack>_<NN>.glb` — the script groups by
 * species + pack and emits a typed registry the app can consume.
 *
 * Run after `npm run convert-fbx outfits`.
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.resolve(__dirname, '..', 'src', 'assets', 'models', 'outfits');
const OUT_FILE = path.resolve(__dirname, '..', 'src', 'data', 'outfitRegistry.ts');

// Known species tokens — filenames that start with these get split cleanly.
const SPECIES_TOKENS = ['elves', 'goblin', 'human', 'skeleton', 'zombie'];

function parseName(baseName) {
  // e.g. "human_modern_civilians_03" → { species:"human", pack:"modern_civilians", idx:3 }
  //      "modern_civilians_03"        → { species:"human" (legacy), pack:"modern_civilians", idx:3 }
  const parts = baseName.split('_');
  let species;
  if (SPECIES_TOKENS.includes(parts[0])) {
    species = parts.shift();
  } else {
    species = 'human'; // legacy files without a species prefix are all humans
  }
  const idx = parseInt(parts.pop(), 10);
  const pack = parts.join('_');
  return { species, pack, idx };
}

// Prettify a pack/species slug for display
function titleCase(slug) {
  return slug
    .split('_')
    .map((w) => (w === 'sci' ? 'Sci' : w === 'fi' ? 'Fi' : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

function main() {
  const files = fs.readdirSync(MODELS_DIR).filter((f) => f.toLowerCase().endsWith('.glb'));
  files.sort();

  const outfits = files.map((f) => {
    const base = path.basename(f, '.glb');
    const parsed = parseName(base);
    return {
      id: base,           // e.g. "human_modern_civilians_03"
      file: f,
      ...parsed,
    };
  });

  // Group by species → pack → outfits[]
  const bySpecies = {};
  for (const o of outfits) {
    if (!bySpecies[o.species]) bySpecies[o.species] = {};
    if (!bySpecies[o.species][o.pack]) bySpecies[o.species][o.pack] = [];
    bySpecies[o.species][o.pack].push(o);
  }

  // Build TypeScript output
  const lines = [];
  lines.push('/**');
  lines.push(' * Outfit GLB Registry (AUTO-GENERATED)');
  lines.push(' *');
  lines.push(' * Produced by tools/generate_outfit_registry.js — edit that script,');
  lines.push(' * not this file. Regenerates from src/assets/models/outfits/*.glb.');
  lines.push(' *');
  lines.push(' * Schema:');
  lines.push(' *   OutfitId  = filename without .glb (e.g. "human_modern_civilians_03")');
  lines.push(' *   Species   = the species this outfit fits ("human"|"elves"|...)');
  lines.push(' *   Pack      = pack slug (e.g. "modern_civilians")');
  lines.push(' */');
  lines.push('');
  lines.push(`export type OutfitId = string;`);
  lines.push(`export type Species = 'human' | 'elves' | 'goblin' | 'skeleton' | 'zombie';`);
  lines.push('');
  lines.push('export interface OutfitMeta {');
  lines.push('  id: OutfitId;');
  lines.push('  name: string;');
  lines.push('  species: Species;');
  lines.push('  pack: string;');
  lines.push('  packLabel: string;');
  lines.push('  index: number;');
  lines.push('  glb: number;');
  lines.push('}');
  lines.push('');
  lines.push('export const OUTFITS: Record<OutfitId, OutfitMeta> = {');
  for (const o of outfits) {
    const name = `${titleCase(o.pack)} ${String(o.idx).padStart(2, '0')}`;
    const packLabel = titleCase(o.pack);
    lines.push(
      `  ${o.id}: { id: '${o.id}', name: '${name}', species: '${o.species}', pack: '${o.pack}', packLabel: '${packLabel}', index: ${o.idx}, glb: require('../assets/models/outfits/${o.file}') },`
    );
  }
  lines.push('};');
  lines.push('');
  lines.push(`export const OUTFIT_IDS: OutfitId[] = Object.keys(OUTFITS);`);
  lines.push('');

  // Species → pack map
  lines.push('export interface PackMeta {');
  lines.push('  species: Species;');
  lines.push('  pack: string;');
  lines.push('  label: string;');
  lines.push('  outfitIds: OutfitId[];');
  lines.push('}');
  lines.push('');
  lines.push('export const PACKS: PackMeta[] = [');
  for (const species of Object.keys(bySpecies).sort()) {
    for (const pack of Object.keys(bySpecies[species]).sort()) {
      const ids = bySpecies[species][pack].map((o) => `'${o.id}'`).join(', ');
      lines.push(
        `  { species: '${species}', pack: '${pack}', label: '${titleCase(pack)}', outfitIds: [${ids}] },`
      );
    }
  }
  lines.push('];');
  lines.push('');
  lines.push('export function outfitsForPack(species: Species, pack: string): OutfitMeta[] {');
  lines.push('  const p = PACKS.find((x) => x.species === species && x.pack === pack);');
  lines.push('  return p ? p.outfitIds.map((id) => OUTFITS[id]) : [];');
  lines.push('}');
  lines.push('');
  lines.push('export function outfitsForSpecies(species: Species): OutfitMeta[] {');
  lines.push('  return OUTFIT_IDS.map((id) => OUTFITS[id]).filter((o) => o.species === species);');
  lines.push('}');
  lines.push('');

  fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf8');
  console.log(`[gen-outfits] wrote ${outfits.length} outfits to ${OUT_FILE}`);
  console.log(`[gen-outfits] species breakdown:`);
  for (const species of Object.keys(bySpecies).sort()) {
    const packs = Object.keys(bySpecies[species]);
    console.log(`  ${species}: ${packs.length} packs, ${packs.reduce((s, p) => s + bySpecies[species][p].length, 0)} outfits`);
  }
}

main();
