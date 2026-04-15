# Drop4 Character Bible

Every character in Drop4 is a named person with a look, a story, and a signature move. This doc drives both the Unity character rendering AND the in-game roster data.

## Design principles

1. **Silhouette first** — every character should be identifiable from their shadow alone. Different species, body shapes, hair, and accessories create this.
2. **Name tells a story** — "Speedy Sam" tells you everything. "Player_04" tells you nothing.
3. **Signature emote = personality** — the locked emote IS the character. King Kyle's Royal Wave defines him.
4. **Lore in one sentence** — nobody reads paragraphs. One sentence, maximum personality.

## Species distribution (across 41 characters)

- **Human** — 25 characters (the core roster, widest outfit variety)
- **Zombie** — 5 characters (Chapter 3 elite + one starter)
- **Skeleton** — 4 characters (Chapter 2-3, spooky vibes)
- **Goblin** — 4 characters (scrappy underdogs, Chapter 1-2)
- **Elf** — 3 characters (elegant precision players, Chapter 2-3)

This gives visible species variety across the roster grid — not just 41 humans in different shirts.

---

## BASE CHARACTERS (5 — available from launch, never locked)

### 1. Rookie (Default Player)
- **Species:** Human
- **Look:** Casual streetwear — white tee, jeans, clean sneakers. Generic but clean. The "create-a-player" baseline.
- **Lore:** "Day one. No rep, no record. Just a board and a dream."
- **Signature emote:** None (uses all universals)
- **Sidekick build:** Human, Modern Civilians outfit 01, short brown hair, default colors

### 2. Bones
- **Species:** Skeleton
- **Look:** Skeleton with a backwards cap and gold chain. Streetwear on a skeleton frame.
- **Lore:** "Been playing since before you were alive. Literally."
- **Signature emote:** Bone Rattle (shakes like bones are loose)
- **Sidekick build:** Skeleton species, cap accessory, gold chain if available

### 3. Pixel
- **Species:** Goblin
- **Look:** Small green goblin in a hoodie with oversized headphones. Tech gremlin energy.
- **Lore:** "Hacked the leaderboard once. Got caught. Now proves it legit."
- **Signature emote:** Glitch Dance (robotic stutter-step)
- **Sidekick build:** Goblin species, hoodie top, headphone accessory

### 4. Luna
- **Species:** Elf
- **Look:** Elegant elf with silver hair, flowing robe-jacket hybrid. Calm energy.
- **Lore:** "Sees three moves ahead. Doesn't need to rush."
- **Signature emote:** Moonrise (hands glow upward gesture)
- **Sidekick build:** Elf species, silver/white hair, robe top, cool blue tones

### 5. Tank
- **Species:** Human
- **Look:** Big build, construction worker vest, hard hat, work boots. Imposing.
- **Lore:** "Plays like he builds — strong foundation, no shortcuts."
- **Signature emote:** Ground Pound (stomps the floor)
- **Sidekick build:** Human, heavy body type, construction/worker outfit, hard hat

---

## CHAPTER 1 — BROOKLYN "THE REC" (Levels 1-12)

Easy difficulty ramp. Friendly faces. Learning the game.

### 6. Rookie Ron (Level 1)
- **Species:** Human
- **Look:** Nervous teen in a varsity jacket, messy hair, untied shoes.
- **Lore:** "Your first opponent. Go easy on him."
- **Signature emote:** Nervous Shuffle
- **Sidekick build:** Human, teen body, varsity jacket top, messy hair

### 7. Beginner Ben (Level 2)
- **Species:** Human
- **Look:** Preppy kid with glasses, polo shirt, khakis. Overachiever energy.
- **Lore:** "He's learning too! Studies the rulebook between games."
- **Signature emote:** Book Smart (adjusts glasses proudly)
- **Sidekick build:** Human, glasses accessory, polo top, neat hair

### 8. Casual Carl (Level 3)
- **Species:** Human
- **Look:** Laid-back guy in a Hawaiian shirt, sandals, sunglasses on head.
- **Lore:** "Always plays the edges. Punish him for it."
- **Signature emote:** Beach Vibes (surfer hand gesture)
- **Sidekick build:** Human, Hawaiian shirt, sandals, sunglasses accessory

### 9. Speedy Sam (Level 4 — Timed)
- **Species:** Human
- **Look:** Lean sprinter in a tracksuit with racing stripes, running shoes, windswept hair.
- **Lore:** "Plays fast, thinks faster. The 15-second timer is his comfort zone."
- **Signature emote:** Speed Dash + Victory Lap
- **Sidekick build:** Human, athletic body, tracksuit, running shoes

### 10. Tiny Tim (Level 5 — Connect 3, Small Board)
- **Species:** Goblin
- **Look:** Tiny goblin in oversized clothes, big eyes, mischievous grin.
- **Lore:** "Small board, big brain. Don't underestimate the little guy."
- **Signature emote:** Tiny Dance (bouncy celebration)
- **Sidekick build:** Goblin species, oversized hoodie, big eyes expression

### 11. Lucky Luke (Level 6 — Go Second)
- **Species:** Human
- **Look:** Cowboy hat, denim jacket, lucky horseshoe necklace. Western swagger.
- **Lore:** "Can you win going second? Luke bets you can't."
- **Signature emote:** Coin Flip
- **Sidekick build:** Human, cowboy hat, denim jacket, western boots

### 12. Defensive Dee (Level 7 — Preset Board)
- **Species:** Human
- **Look:** Athletic woman in a basketball jersey, headband, high-tops. Defensive stance.
- **Lore:** "She starts with an advantage! Three pieces already placed."
- **Signature emote:** Block Party (defensive arm cross)
- **Sidekick build:** Human, female, basketball jersey, headband, athletic shoes

### 13. Flash Fiona (Level 8 — Speed 5s)
- **Species:** Elf
- **Look:** Elf with lightning-streak hair, futuristic jacket, speed lines in her design.
- **Lore:** "Blink and you lose. 5 seconds per turn."
- **Signature emote:** Lightning Strike
- **Sidekick build:** Elf species, female, streak hair color, futuristic jacket

### 14. Big Board Bob (Level 9 — 8x9 Board)
- **Species:** Human
- **Look:** Big guy in overalls, hard hat, carpenter's belt. Builder aesthetic.
- **Lore:** "More space, more possibilities. Bob built this board himself."
- **Signature emote:** Blueprint Unroll
- **Sidekick build:** Human, large body type, overalls, hard hat, tool belt

### 15. Tricky Tara (Level 10 — Medium AI)
- **Species:** Human
- **Look:** Street magician — top hat, vest, card-themed accessories.
- **Lore:** "She sets traps everywhere. Watch for the double threat."
- **Signature emote:** Card Trick (flourishes hands)
- **Sidekick build:** Human, female, top hat, vest, card-themed colors

### 16. Iron Ivan (Level 11 — Connect 5, 7x8)
- **Species:** Human
- **Look:** Russian strongman — tank top, thick arms, handlebar mustache.
- **Lore:** "Five in a row? Good luck. Ivan doesn't break."
- **Signature emote:** Iron Flex
- **Sidekick build:** Human, heavy build, tank top, mustache, military boots

### 17. King Kyle (Level 12 — BOSS)
- **Species:** Human
- **Look:** Crown, purple robe over streetwear, gold chain, confident smirk.
- **Lore:** "Beat the king to advance! The Rookie King awaits."
- **Signature emote:** Royal Wave + Crown Tap
- **Sidekick build:** Human, crown accessory, purple robe/jacket, gold chain, royal colors

---

## CHAPTER 2 — VENICE BEACH "THE BOARDWALK" (Levels 13-24)

Medium difficulty. Creative modes. Wilder boards.

### 18. Stretch Stevens (Level 13 — Connect 5, 8x9)
- **Species:** Human
- **Look:** Tall lanky skater — beanie, graphic tee, torn jeans, skateboard accessory.
- **Lore:** "Five connects. New rules. Stretch adapts to any board size."
- **Signature emote:** Kickflip
- **Sidekick build:** Human, tall/thin body, beanie, skater outfit

### 19. Puzzle Pete (Level 14 — Puzzle)
- **Species:** Goblin
- **Look:** Goblin with professor glasses, lab coat over goblin clothes, wild hair.
- **Lore:** "Solve the puzzle! Pete designed this board specifically to mess with you."
- **Signature emote:** Eureka (lightbulb gesture)
- **Sidekick build:** Goblin species, glasses, lab coat/smart clothes

### 20. Blitz Betty (Level 15 — Speed 3s)
- **Species:** Human
- **Look:** Roller derby girl — helmet, knee pads, aggressive stance, neon colors.
- **Lore:** "Think FAST. Three seconds or you lose your turn."
- **Signature emote:** Derby Spin
- **Sidekick build:** Human, female, helmet, athletic/derby outfit, neon colors

### 21. Micro Max (Level 16 — Connect 3, Hard AI, Small Board)
- **Species:** Goblin
- **Look:** Tiny goblin in a mech suit — oversized robot arms, glowing visor.
- **Lore:** "Small board, hard bot. Max compensates with tech."
- **Signature emote:** Mech Stomp
- **Sidekick build:** Goblin species, armor/tech outfit, glowing accessories

### 22. Stone Cold Steve (Level 17 — Center Column Blocked)
- **Species:** Zombie
- **Look:** Zombie in a leather jacket, stone-gray skin, expressionless face.
- **Lore:** "The center column is blocked. Deal with it. Steve doesn't care."
- **Signature emote:** Stone Stare (crosses arms, doesn't move)
- **Sidekick build:** Zombie species, leather jacket, gray tones

### 23. Copy Cat Clara (Level 18 — Medium AI)
- **Species:** Human
- **Look:** Mirror-themed — reflective jacket, one side of hair is mirrored color of the other.
- **Lore:** "She copies your strategy. Every move you make, she studies."
- **Signature emote:** Mirror Dance (mimics the opponent)
- **Sidekick build:** Human, female, asymmetric hair colors, reflective/metallic jacket

### 24. Mega Mike (Level 19 — 9x9 Board)
- **Species:** Human
- **Look:** Pro wrestler aesthetic — mask, cape, championship belt.
- **Lore:** "Biggest board yet. Mike's arena, Mike's rules."
- **Signature emote:** Belt Raise (holds up championship belt)
- **Sidekick build:** Human, large body, wrestling mask, cape accessory, belt

### 25. Six-Pack Sam (Level 20 — Connect 6, 9x9)
- **Species:** Human
- **Look:** Beach lifeguard — red shorts, whistle, sunburn, strong jawline.
- **Lore:** "Six in a row to win! Sam guards this board like it's his beach."
- **Signature emote:** Whistle Blow
- **Sidekick build:** Human, athletic body, lifeguard outfit, whistle accessory

### 26. Clock Crusher (Level 21 — Timed 10s, Hard AI)
- **Species:** Skeleton
- **Look:** Skeleton in a clockwork outfit — gears on shoulders, clock face on chest.
- **Lore:** "Tick tock... the Clock Crusher doesn't feel time pressure. You do."
- **Signature emote:** Time Stop (freezes mid-pose)
- **Sidekick build:** Skeleton species, clockwork/steampunk outfit, gear accessories

### 27. Chaos Karen (Level 22 — Puzzle with Scattered Pattern)
- **Species:** Human
- **Look:** Wild punk rock — mohawk, ripped clothes, safety pins, chaotic energy.
- **Lore:** "Chaos is her middle name. This preset board makes no sense. That's the point."
- **Signature emote:** Chaos Scream
- **Sidekick build:** Human, female, mohawk hair, punk outfit, bright clashing colors

### 28. Marathon Mel (Level 23 — Timed 30s, 8x9, Hard AI)
- **Species:** Human
- **Look:** Marathon runner — sweatband, running number bib, water bottle.
- **Lore:** "Long game, short fuse. Mel's been running since dawn."
- **Signature emote:** Finish Line (crosses invisible tape)
- **Sidekick build:** Human, athletic body, marathon outfit, running bib

### 29. Grandmaster Grace (Level 24 — BOSS)
- **Species:** Elf
- **Look:** Elegant elf in a chess-themed suit — black/white color scheme, crown-like tiara, calculating eyes.
- **Lore:** "She's 3 moves ahead of you. The Strategist doesn't guess."
- **Signature emote:** Three Moves Ahead + Grandmaster Bow
- **Sidekick build:** Elf species, female, chess-themed outfit, tiara, black/white colors

---

## CHAPTER 3 — HARLEM "THE CATHEDRAL" (Levels 25-36)

Hard difficulty. No mercy. Legend tier.

### 30. Nightmare Nick (Level 25 — Go Second + Preset)
- **Species:** Zombie
- **Look:** Zombie in a nightmare-themed hoodie — dark circles, torn clothes, eerie glow.
- **Lore:** "Opponent goes first AND has a head start. Welcome to the nightmare."
- **Signature emote:** Night Terror (spooky hand wave)
- **Sidekick build:** Zombie species, dark hoodie, eerie glow effects, dark colors

### 31. Lightning Lisa (Level 26 — Speed 5s, Connect 5, 8x9)
- **Species:** Human
- **Look:** Storm chaser — weather jacket, goggles on forehead, wind-blown hair.
- **Lore:** "Five in a row with a five-second clock. Lisa thrives in the storm."
- **Signature emote:** Thunder Clap
- **Sidekick build:** Human, female, weather jacket, goggles, windblown hair

### 32. Maze Master Matt (Level 27 — Puzzle with Maze Pattern)
- **Species:** Skeleton
- **Look:** Skeleton in an architect's outfit — blueprint rolled under arm, compass pendant.
- **Lore:** "Navigate the maze. Matt designed it, and he knows every dead end."
- **Signature emote:** Maze Solve (traces pattern in air)
- **Sidekick build:** Skeleton species, architect/formal outfit, compass accessory

### 33. Quick Draw Quinn (Level 28 — Speed 3s, Connect 3, 5x5)
- **Species:** Human
- **Look:** Wild West gunslinger — poncho, cowboy hat, twin holsters.
- **Lore:** "Fastest game mode. Quinn draws first every time."
- **Signature emote:** Quick Draw (finger guns)
- **Sidekick build:** Human, poncho, cowboy hat, western outfit

### 34. Upside-Down Uma (Level 29 — Hard AI)
- **Species:** Zombie
- **Look:** Zombie acrobat — circus outfit, gravity-defying hair, upside-down accessories.
- **Lore:** "Everything you know is wrong. Uma plays by different rules."
- **Signature emote:** Gravity Flip
- **Sidekick build:** Zombie species, circus/acrobat outfit, wild hair

### 35. Arena Alex (Level 30 — 7x8, Preset Board)
- **Species:** Human
- **Look:** Gladiator — Roman armor, shield arm guard, war paint.
- **Lore:** "Pre-placed chaos on a big board. Alex's colosseum."
- **Signature emote:** Gladiator Salute
- **Sidekick build:** Human, gladiator/warrior outfit, shield accessory, war paint

### 36. Storm Surge Sara (Level 31 — Connect 6, 9x9, Timed 10s)
- **Species:** Human
- **Look:** Navy captain — peacoat, captain's hat, compass tattoo.
- **Lore:** "The hardest combo. Sara navigates storms for a living."
- **Signature emote:** Storm Call (arms raised, dramatic)
- **Sidekick build:** Human, female, naval/captain outfit, captain's hat

### 37. Old Guard Otto (Level 32 — Connect 5, 8x9)
- **Species:** Human
- **Look:** Old veteran — gray beard, military medals, worn leather jacket, cane.
- **Lore:** "Been playing since before you were born. Respect the veteran."
- **Signature emote:** Medal Flash (shows medals)
- **Sidekick build:** Human, elderly body type if available, military jacket, medals, gray hair

### 38. Grim Reaper Gina (Level 33 — Speed 5s)
- **Species:** Skeleton
- **Look:** Skeleton in a hooded cloak — scythe-themed staff, glowing eye sockets.
- **Lore:** "One mistake and you're done. Gina doesn't give second chances."
- **Signature emote:** Reaper Slice
- **Sidekick build:** Skeleton species, hooded cloak, dark outfit, glowing accents

### 39. Ghost Greg (Level 34 — Connect 5 on Standard Board)
- **Species:** Zombie
- **Look:** Translucent/pale zombie — white clothes, faded features, ghostly aesthetic.
- **Lore:** "Connect 5 on a standard board. Can you even do it? Greg's a phantom."
- **Signature emote:** Phase Through (walks through invisible wall)
- **Sidekick build:** Zombie species, all-white outfit, pale/ghostly color scheme

### 40. Final Boss Frank (Level 35 — Go Second + Preset)
- **Species:** Human
- **Look:** Military commander — full uniform, beret, stern expression, tactical vest.
- **Lore:** "The last regular challenge. Frank's been waiting for you."
- **Signature emote:** Commander's Orders
- **Sidekick build:** Human, military uniform, beret, tactical vest

### 41. The Dark Lord (Level 36 — FINAL BOSS)
- **Species:** Zombie
- **Look:** Black cloak, glowing red eyes, dark matter energy swirling. The final villain.
- **Lore:** "The ultimate test. Nobody has beaten The Dark Lord. Yet."
- **Signature emote:** Dark Aura + Reality Break + Sinister Laugh
- **Sidekick build:** Zombie species, black cloak/robe, red glowing accents, dark matter color scheme
- **Board:** Connect 5, 9x9, 10s timer, Go Second. 4 modifiers stacked.

---

## Level rule variety (already implemented, just documenting)

| Rule | Levels using it | Feel |
|---|---|---|
| Standard 6x7 Connect 4 | 1,2,3,6,7,10,18,29 | Classic baseline |
| Connect 3 (small board 5x5) | 5,16,28 | Quick, tactical |
| Connect 5 (big board) | 11,13,26,32,34 | Strategic, slow burn |
| Connect 6 (huge board 9x9) | 20,31 | Marathon, rare |
| Timed (15-30s) | 4,21,23 | Pressure without panic |
| Speed (3-5s) | 8,15,26,28,33 | Reflex, adrenaline |
| Go Second (disadvantage) | 6,25,35,36 | Comeback king feel |
| Puzzle (preset board) | 14,22,27 | Problem-solving, unique |
| Preset + other modifier | 7,17,25,30,35 | Wild combos |
| Boss (multiple modifiers stacked) | 12,24,36 | Climactic, epic |

### Future rule ideas (post-launch content for new cities)
- **Gravity Flip** — pieces fall UP instead of down
- **Blind Mode** — opponent's pieces are hidden until they form a line of 3+
- **Fog of War** — only pieces within 2 spaces of your last drop are visible
- **Mirror Board** — every piece you drop, a mirror piece drops on the opposite side
- **Shrinking Board** — columns lock after N turns, board gets smaller over time
- **Power-ups** — earn bombs/blocks/wildcards by completing rows of 3
- **Tag Team** — alternate between two characters per side, each with different AI personality

---

## Rendering priority for Unity batch export

### Phase 1 — Ship blockers (5 characters, do first)
1. Rookie (Default Player) — seen on every screen
2. King Kyle — Chapter 1 boss, first prestige unlock
3. Grandmaster Grace — Chapter 2 boss
4. The Dark Lord — Final boss, most dramatic
5. Bones — Starter skeleton, proves species variety works

### Phase 2 — Chapter 1 roster (12 characters)
All of Brooklyn "The Rec" opponents. These are what 100% of new players see first.

### Phase 3 — Chapter 2 roster (12 characters)
Venice Beach opponents. Players reach these after ~2 hours of play.

### Phase 4 — Chapter 3 + remaining starters (16 characters)
Harlem opponents + Pixel/Luna/Tank starters. By the time players see these, you can ship them in an update.
