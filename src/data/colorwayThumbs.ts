/**
 * colorwayThumbs — resolves per-item colorway thumbnail URIs.
 *
 * Maps (partName, colorwayId) → remote image URI pointing to pre-rendered
 * 256×256 PNGs from the Unity batch render pipeline. Each clothing item ×
 * colorway × gender has its own render showing the actual tinted result on
 * a neutral mannequin.
 *
 * Dev: http://localhost:9099 (http-server serving AMG_Renders/)
 * Prod: R2 CDN (swap RENDER_BASE_URL when thumbnails are deployed)
 */
import type { ImageSourcePropType } from 'react-native';

const RENDER_BASE_URL = 'http://localhost:9099';

// Three colorway IDs differ between COLORWAY_PALETTE and the Unity render
// filenames (render pipeline was built before palette IDs were finalized).
const PALETTE_TO_RENDER_ID: Record<string, string> = {
  frozen: 'storm',
  // holo→carbon removed: carbon render uses wrong colors (dark grey, not holographic purple/cyan/gold).
  // Holographic falls back to color-bar swatch until re-rendered in Unity.
};

// Hero part code → render subfolder. Only hero slots have renders;
// companion parts (arm/leg segments) inherit visually from the hero.
const CODE_TO_FOLDER: Record<string, string> = {
  '10TORS': 'Tops',
  '17HIPS': 'Bottoms',
  '20FOTL': 'Shoes',
  '21FOTR': 'Shoes',
  '22AHED': 'Hats',
};

// Paired slots where the hero code differs from the render code.
// Shoes hero = FootRight (21FOTR) but renders use FootLeft (20FOTL).
const CODE_NORMALIZE: Record<string, string> = {
  '21FOTR': '20FOTL',
};

/**
 * Extract the render-compatible prefix from a full Synty part name.
 * `SK_APOC_OUTL_01_10TORS_HU01` → `APOC_OUTL_01_10TORS`
 */
function renderPrefix(partName: string): string | null {
  let name = partName;
  if (name.startsWith('SK_')) name = name.slice(3);
  // Strip species suffix (_HU01, _HU02, _EL01, _GO01, _SK01, _ZO01, etc.)
  const suffixMatch = name.match(/_[A-Z]{2}\d{2}$/);
  if (suffixMatch) name = name.slice(0, -suffixMatch[0].length);
  return name || null;
}

/**
 * Extract the 5-char part code from a Synty part name.
 * `SK_APOC_OUTL_01_10TORS_HU01` → `10TORS`
 */
function partCode(partName: string): string | null {
  const match = partName.match(/(\d{2}[A-Z]{4})(?:_[A-Z]{2}\d{2})?$/);
  return match?.[1] ?? null;
}

/**
 * Resolve a pre-rendered colorway thumbnail URI for a part × colorway combo.
 * Returns null if the part code isn't a hero slot with renders, or the
 * colorway ID isn't recognized.
 */
export function getColorwayThumbUri(
  partName: string,
  colorwayId: string,
  gender: 'male' | 'female' = 'male',
): ImageSourcePropType | null {
  const code = partCode(partName);
  if (!code) return null;

  const folder = CODE_TO_FOLDER[code];
  if (!folder) return null;

  let prefix = renderPrefix(partName);
  if (!prefix) return null;

  // Normalize paired codes (e.g. 21FOTR → 20FOTL) so the prefix
  // matches the render filename convention.
  const norm = CODE_NORMALIZE[code];
  if (norm) prefix = prefix.replace(code, norm);

  const renderId = PALETTE_TO_RENDER_ID[colorwayId] ?? colorwayId;
  const url = `${RENDER_BASE_URL}/${folder}/${gender}/${prefix}_${renderId}_${gender}.png`;
  return { uri: url };
}
