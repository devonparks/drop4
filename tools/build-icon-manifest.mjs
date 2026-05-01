#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════
// build-icon-manifest.mjs — programmatically extend ui-asset-manifest.json
// with cosmetic icons (emotes, idles, pack covers) using a shared
// VISUAL_DIRECTION_LOCKIN-compliant prompt template. Run once to inject
// entries; gen-art.mjs picks them up via --only=<group>.
//
// Usage:
//   node tools/build-icon-manifest.mjs
//
// Idempotent — entries with matching `id` are replaced, new ones appended.
// ═══════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, 'docs', 'ui-asset-manifest.json');

// Shared figure-pose prompt template for emotes + idles.
function poseIcon({ id, filename, label, pose, mood, category }) {
  const subjectKind = category === 'idle' ? 'IDLE THUMBNAIL' : 'EMOTE THUMBNAIL';
  return {
    group: category === 'idle' ? 'idle-icons' : 'emote-icons',
    id,
    filename,
    size: '1024x1024',
    background: 'transparent',
    prompt:
      `Drop4 premium mobile game ${subjectKind} icon for the '${label}' ${category}, per VISUAL_DIRECTION_LOCKIN. Chunky playful 3D dimensional aesthetic — Brawl Stars / Coin Master / Match Masters figure language. Transparent background, centered figure with ~12% padding. Single hero subject: a stylized chunky 3D mini-character figure ${pose}. The figure is gender-neutral with a simple silhouette, small chunky head, broad shoulders, slightly tapered legs — Brawl Stars character proportions. The figure's body, shirt and pants face uses the Drop4 cool palette (pure white at the top of the silhouette, cyan-blue in the middle, deep cobalt navy at the bottom). Strong downward 3D EXTRUSION underneath the figure in a warm orange-to-deep-red gradient (peachy orange top of depth, deep crimson bottom) — same extrusion language as the DROP4 logo. Thick DARK NAVY OUTLINE (~4-5px) hugging the silhouette tightly all the way around. Crisp white rim highlight along the upper edges of head, shoulder, and any extended limb. Designed to read clearly at 64-96px in a mobile shop list — silhouette must remain legible at small size with the pose instantly recognizable. Mood: chunky, playful, premium, dimensional, ${mood}. NO text, NO numerals, NO words, NO photorealism, NO sleek thin styling, NO chrome, NO Connect 4 disc, NO halos, NO aura glow, NO drop shadows behind the figure (the 3D extrusion IS the depth), NO detailed facial features beyond simple eyes, NO small props, NO floor.`,
  };
}

// Shared pack-cover prompt template — same chunky 3D figure aesthetic, but
// figure is wearing/embodying the pack's signature look. The pack cover acts
// as a "this is what's inside" hero shot.
function packCover({ id, filename, label, look }) {
  return {
    group: 'pack-covers',
    id,
    filename,
    size: '1024x1024',
    background: 'transparent',
    prompt:
      `Drop4 premium mobile game PACK COVER icon for the '${label}' cosmetic pack, per VISUAL_DIRECTION_LOCKIN. Chunky playful 3D dimensional aesthetic — Brawl Stars / Coin Master / Match Masters figure language. Transparent background, centered figure with ~12% padding. Single hero subject: a stylized chunky 3D mini-character figure standing in a confident hero pose (slight three-quarter angle, weight on back foot, one hand on hip), embodying this pack's signature look — ${look}. The figure has Brawl Stars character proportions: small chunky head, broad shoulders, slightly tapered legs. The pack's signature outfit and props are the focal point and clearly readable. Apply the Drop4 chunky-3D treatment: thick DARK NAVY OUTLINE (~4-5px) hugging the entire silhouette tightly, white rim highlight along the upper edges of head, shoulders, and weapons or props, and a strong downward 3D EXTRUSION underneath the figure in a warm orange-to-deep-red gradient (peachy orange top of depth, deep crimson bottom). The outfit's natural colors are allowed to dominate the figure body, but the navy outline + warm gold-red extrusion language stays. Designed to read clearly at 96-160px in a mobile shop pack header — silhouette and pack identity must be instantly recognizable. Mood: chunky, playful, premium, dimensional, hero-shot. NO text, NO numerals, NO words, NO photorealism, NO sleek thin styling, NO chrome, NO Connect 4 disc, NO halos, NO aura glow, NO drop shadows behind the figure, NO floor or ground plane, NO background scenery.`,
  };
}

// ── Emote roster (18 remaining; dab/bow/menacing-fists already exist) ──

const EMOTES = [
  { id: 'emote-dance-twist', label: 'Twist Dance',
    pose: "performing a TWIST DANCE — hips swiveled hard to one side, shoulders rotated counter to the hips, arms loose and bent at the elbows mid-swing, one knee slightly raised, smooth disco-era motion frozen mid-twist",
    mood: 'groovy and fluid' },
  { id: 'emote-dance-spin-slick', label: 'Slick Spin',
    pose: "mid SLICK SPIN — one leg planted firmly, the other extended outward as the body rotates, both arms gracefully swept out to the sides like wings, head tilted with the rotation, smooth confident motion",
    mood: 'smooth and stylish' },
  { id: 'emote-dance-greased', label: 'Greased Lightning Dance',
    pose: "in a GREASED LIGHTNING dance pose — one arm thrust diagonally up at 60 degrees with a pointed finger, the other arm at the hip, hips swiveled with one hip popped, body leaning back slightly in a 1950s rocker stance",
    mood: 'showy and triumphant' },
  { id: 'emote-dance-chest-pump', label: 'Chest Pump',
    pose: "performing a CHEST PUMP victory dance — chest puffed forward and up, one fist pumped down at hip level, the other arm raised triumphantly, head tilted back with celebratory swagger, weight on back foot",
    mood: 'triumphant and proud' },
  { id: 'emote-dance-running-step', label: 'Running Step',
    pose: "doing the RUNNING MAN dance step — one knee raised high to chest level, the other leg pushing off behind, arms pumping forward and back at the elbows like sprinting, leaning slightly forward, mid-stride",
    mood: 'energetic and athletic' },
  { id: 'emote-air-guitar', label: 'Air Guitar',
    pose: "rocking out with an AIR GUITAR — left arm extended outward holding an invisible guitar neck, right hand strumming over the imaginary strings at the hip, knees bent in a wide rocker stance, head tilted back like screaming a solo",
    mood: 'rocker and intense' },
  { id: 'emote-clap', label: 'Applause Clap',
    pose: "APPLAUDING with both hands raised at chest height, palms together mid-clap, head slightly tilted with a pleased expression, weight squared on both legs, gentle gracious posture",
    mood: 'gracious and pleased' },
  { id: 'emote-beckon', label: 'Come Here',
    pose: "performing a BECKON 'come here' gesture — one arm extended forward at chest height with palm facing up and fingers mid-curl inward, the other hand resting confidently on the hip, slight forward lean, playful taunt",
    mood: 'taunting and playful' },
  { id: 'emote-shake-fist', label: 'Shake Fist',
    pose: "SHAKING a clenched fist — one arm raised at head height with a tight fist visibly mid-shake (slight motion blur of the shake), the other arm at the side, body leaning forward angrily, knees slightly bent",
    mood: 'angry and defiant' },
  { id: 'emote-thumbs-down', label: 'Thumbs Down',
    pose: "giving a THUMBS DOWN — one arm extended outward at chest height with a clear thumb pointing straight down (the thumb is the visual focal point), the other arm relaxed at the side, head tilted dismissively",
    mood: 'dismissive and disapproving' },
  { id: 'emote-tantrum', label: 'Tantrum',
    pose: "throwing a TANTRUM — both fists clenched and held tight at the sides, knees bent in a stomp, head tilted back with mouth open mid-shout, body squared and tense, an exaggerated frustrated stance",
    mood: 'comically frustrated' },
  { id: 'emote-finger-guns', label: 'Finger Guns',
    pose: "shooting FINGER GUNS — both hands at hip height with index fingers extended forward and thumbs raised forming pistol shapes, body leaning back slightly with confident swagger, weight on back foot, smooth cool pose",
    mood: 'cool and confident' },
  { id: 'emote-beat-chest', label: 'Beat Chest',
    pose: "BEATING the chest like a primal King-Kong-style display — both fists raised and curled, mid-pound on the upper chest, body leaning forward in a wide stance, shoulders hunched, primal intimidation pose",
    mood: 'primal and intimidating' },
  { id: 'emote-dust-shoulder', label: 'Dust Shoulder',
    pose: "BRUSHING dirt off the shoulder — one hand sweeping diagonally across the opposite shoulder mid-brush, the other arm relaxed, head tilted with a smug look, weight shifted to one leg, smooth dismissive cool",
    mood: 'smug and dismissive' },
  { id: 'emote-hand-on-heart', label: 'Hand on Heart',
    pose: "with one HAND PRESSED OVER the heart in a sincere gesture — palm flat against the chest centered over the heart, the other arm relaxed at the side, head bowed slightly, solemn respectful posture",
    mood: 'sincere and respectful' },
  { id: 'emote-blow-kiss', label: 'Blow Kiss',
    pose: "BLOWING a kiss — fingertips of one hand touching pursed lips with the arm bent forward and outward as if just released the kiss, the other arm extended outward to the side or raised slightly, head tilted, charming",
    mood: 'charming and flirty' },
  { id: 'emote-heart-hands', label: 'Heart Hands',
    pose: "forming HEART HANDS — both hands held up together at chest level with thumbs and index fingers touching to form a clear heart shape between the palms, the heart shape is the visual focal point, head tilted sweetly",
    mood: 'sweet and adoring' },
  { id: 'emote-finger-heart', label: 'Finger Heart',
    pose: "making a Korean-style FINGER HEART — one hand raised near the cheek with the thumb and index finger crossed forming a tiny visible heart shape between them, the other arm at the side, head tilted with a coy smile",
    mood: 'cute and coy' },
];

// ── Idle roster (7 unique idle poses) ──

const IDLES = [
  { id: 'idle-base', label: 'Idle',
    pose: "in a relaxed neutral IDLE STANCE — standing tall with weight evenly distributed, arms hanging naturally at the sides, head facing forward, shoulders relaxed, calm ready posture",
    mood: 'relaxed and ready' },
  { id: 'idle-hands-on-hips', label: 'Hands on Hips',
    pose: "standing with both HANDS ON HIPS — fists planted firmly on the hips with elbows bowed out to the sides, chest forward, head up, weight squared, confident hero pose",
    mood: 'confident and powerful' },
  { id: 'idle-arms-folded', label: 'Arms Folded',
    pose: "with ARMS FOLDED across the chest — both arms crossed at the chest, hands tucked under the opposite biceps, weight shifted slightly to one leg, head tilted with a thoughtful expression",
    mood: 'thoughtful and stoic' },
  { id: 'idle-bored-foot-tap', label: 'Foot Tap',
    pose: "impatiently TAPPING ONE FOOT — one foot raised slightly off the ground mid-tap, weight on the other leg, both arms folded across the chest, head tilted with a bored expression, body slightly hunched",
    mood: 'impatient and bored' },
  { id: 'idle-bored-swing-arms', label: 'Swing Arms',
    pose: "casually SWINGING the ARMS — both arms swung gently to one side mid-motion, body twisted slightly counter to the swing, head looking around, knees soft, idle waiting energy",
    mood: 'idle and waiting' },
  { id: 'idle-bored-slump', label: 'Bored Slump',
    pose: "in a BORED SLUMP — body slumped over with rounded shoulders, head hanging forward and down, arms loose at the sides, knees slightly bent, classic exhausted bored stance",
    mood: 'defeated and bored' },
  { id: 'idle-check-watch', label: 'Check Watch',
    pose: "CHECKING an imaginary WRISTWATCH — one arm raised across the body at chest height with the wrist twisted upward, the other hand pointing at the wrist, head tilted down to look, impatient waiting pose",
    mood: 'impatient and curious' },
];

// ── Pack covers (21 packs) ──

const PACKS = [
  { id: 'pack-humn-base', label: 'Human Base',
    look: 'a friendly civilian human in a plain crew-neck t-shirt and dark jeans, no extra props, neutral skin tone, simple welcoming everyman silhouette' },
  { id: 'pack-elvn-base', label: 'Elf Base',
    look: 'a graceful elven figure with long pointed ears (the pointed ears are the clearest identifier), shoulder-length flowing hair, a simple natural-toned tunic, refined posture' },
  { id: 'pack-gobl-base', label: 'Goblin Base',
    look: 'a stocky goblin with mottled green skin, big pointed ears jutting out wide, sharp teeth, beady yellow eyes, simple ragged tunic and rough trousers' },
  { id: 'pack-sktn-base', label: 'Skeleton Base',
    look: 'a chunky bone-white SKELETON figure with a clear skull face (eye sockets, jaw), exposed rib cage, bony arms and legs, no flesh, gothic fantasy mascot vibe' },
  { id: 'pack-zomb-base', label: 'Zombie Base',
    look: 'a shambling zombie with greenish-grey skin, torn ragged clothing, slightly hunched posture, arms held forward in classic zombie pose, simple horror mascot vibe' },
  { id: 'pack-mdrn-civl', label: 'Modern Civilians',
    look: 'a casual modern-day civilian wearing a colored hoodie, blue jeans, and clean white sneakers, hands tucked into the hoodie pocket, contemporary streetwear silhouette' },
  { id: 'pack-mdrn-polc', label: 'Modern Police',
    look: 'a modern POLICE OFFICER in a navy-blue uniform with a clearly visible silver badge on the chest, peaked cap with a brim, utility belt at the waist, professional law-enforcement silhouette' },
  { id: 'pack-scfi-civl', label: 'Sci-Fi Civilians',
    look: 'a sci-fi civilian in a sleek futuristic jumpsuit with luminescent cyan trim along the seams, a soft high collar, simple boots, friendly future-citizen silhouette' },
  { id: 'pack-scfi-sold', label: 'Sci-Fi Soldiers',
    look: 'a sci-fi SOLDIER in heavy futuristic combat armor with chunky shoulder pauldrons, glowing visor on the helmet, holding a sleek energy rifle across the chest, military space-marine silhouette' },
  { id: 'pack-fant-kngt', label: 'Fantasy Knights',
    look: 'a fantasy KNIGHT in full plate armor with chunky pauldrons, gauntlets, and a horned or plumed helm, holding a longsword pointed downward in front, heroic medieval silhouette' },
  { id: 'pack-fant-vill', label: 'Fantasy Villagers',
    look: 'a fantasy VILLAGER in a simple linen tunic, leather belt, woolen trousers, soft felt cap, holding a small sack or basket, humble medieval peasant silhouette' },
  { id: 'pack-fant-sktn', label: 'Fantasy Skeletons',
    look: 'an UNDEAD SKELETAL warrior with bone-white skull face, tattered medieval tunic, rusted iron pauldrons, gripping an old sword or rusted spear, gothic-fantasy undead silhouette' },
  { id: 'pack-samr-warr', label: 'Samurai Warriors',
    look: 'a SAMURAI warrior in ornate lacquered armor (red and black plates), a horned kabuto helmet, holding a katana with both hands diagonally across the chest, traditional Japanese warrior silhouette' },
  { id: 'pack-vikg-warr', label: 'Viking Warriors',
    look: 'a VIKING warrior with a thick braided beard, horned or winged helmet, fur cloak over the shoulders, leather and iron armor, holding a chunky two-handed battle axe, Norse raider silhouette' },
  { id: 'pack-elvn-warr', label: 'Elven Warriors',
    look: 'an ELVEN ARCHER with long pointed ears, light forest-green leather armor with gold trim, a hooded cloak, holding a curved longbow vertically in one hand with a quiver of arrows on the back' },
  { id: 'pack-gobl-figt', label: 'Goblin Fighters',
    look: 'a GOBLIN FIGHTER with mottled green skin and big pointed ears, mismatched scrap armor (rusted plates, leather scraps), holding a curved short sword or jagged dagger, chaotic raider silhouette' },
  { id: 'pack-apoc-outl', label: 'Apocalypse Outlaws',
    look: 'a wasteland OUTLAW in a torn leather duster coat, spiked shoulder pads, gas-mask or skull bandana over the lower face, dusty jeans and combat boots, post-apocalyptic raider silhouette' },
  { id: 'pack-apoc-surv', label: 'Apocalypse Survivors',
    look: 'a wasteland SURVIVOR in a hooded cloth jacket and cargo pants, a heavy backpack with a rolled blanket strapped on, sturdy boots, holding a wrapped cloth canteen, weary survivor silhouette' },
  { id: 'pack-apoc-zomb', label: 'Apocalypse Zombies',
    look: 'an APOCALYPSE ZOMBIE in shredded modern clothing (torn t-shirt and ripped jeans), grey-green decaying skin, mouth slack, arms outstretched forward in classic horror-zombie shamble pose' },
  { id: 'pack-horr-viln', label: 'Horror Villains',
    look: 'a HORROR VILLAIN figure in a long dark trench coat, a featureless white theater mask, holding a long blade lowered in one hand, ominous slasher-movie killer silhouette, NOT gory' },
  { id: 'pack-pirt-capt', label: 'Pirate Captains',
    look: 'a swashbuckling PIRATE CAPTAIN in a tricorn hat with a feather, a long captain coat with gold trim, frilled shirt, leather boots, a curved cutlass on the hip, classic pirate silhouette' },
];

// ── Build + write ──

function ensureGroup(items, group) {
  // No-op — we just append/replace per id; keeping for clarity.
  return items;
}

function upsert(items, entry) {
  const idx = items.findIndex((it) => it.id === entry.id);
  if (idx >= 0) items[idx] = entry;
  else items.push(entry);
}

function main() {
  const raw = JSON.parse(fs.readFileSync(MANIFEST, 'utf-8'));
  const items = raw.items;

  let added = 0;
  let updated = 0;
  const all = [
    ...EMOTES.map((e) => poseIcon({ ...e, filename: `${e.id}.png`, category: 'emote' })),
    ...IDLES.map((e) => poseIcon({ ...e, filename: `${e.id}.png`, category: 'idle' })),
    ...PACKS.map((p) => packCover({ ...p, filename: `${p.id}.png` })),
  ];

  for (const entry of all) {
    const exists = items.findIndex((it) => it.id === entry.id) >= 0;
    upsert(items, entry);
    if (exists) updated += 1;
    else added += 1;
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(raw, null, 2) + '\n');
  console.log(`Manifest updated: ${added} added, ${updated} replaced. Total entries: ${items.length}.`);
  console.log(`Groups: emote-icons (${EMOTES.length} new), idle-icons (${IDLES.length}), pack-covers (${PACKS.length}).`);
}

main();
