import {
  TIKTOK_SAFE_ZONE,
  REELS_SAFE_ZONE,
  SHORTS_SAFE_ZONE,
  UNIVERSAL_SAFE_ZONE,
  CENTER_SAFE_ZONE,
  SOCIAL_SAFE_ZONES,
  REFERENCE_PILL_STANDARDS,
  getSafeZone,
  createSafeZone,
  scaleSafeZone,
  getNormalizedSafeZone,
  getSafeOverlayCss,
  getSafeCorridor,
  isWithinSafeZone,
  clampToSafeZone,
  doBoxesCollide,
  getASSSubtitlePlacement,
  getSafeAssStyles,
  getSubtitleAnchorY,
  type SafeZoneGeometry,
  type BoundingBox,
} from "../../src/lib/safe-zone";

import { TIKTOK_SAFE_ZONE as CAROUSEL_TIKTOK_SAFE_ZONE } from "../../src/lib/render-carousel";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`AUDIT FAIL: ${msg}`);
  }
}

console.log("=== INDEPENDENT FORENSIC INTEGRITY AUDIT SUITE ===");

// 1. Check object references and re-exports
assert(CAROUSEL_TIKTOK_SAFE_ZONE === TIKTOK_SAFE_ZONE, "render-carousel must re-export exact reference from safe-zone");

// 2. Strict Immutability Test (Attempting mutations in strict mode or checking Object.isFrozen)
assert(Object.isFrozen(TIKTOK_SAFE_ZONE), "TIKTOK_SAFE_ZONE must be frozen");
assert(Object.isFrozen(REELS_SAFE_ZONE), "REELS_SAFE_ZONE must be frozen");
assert(Object.isFrozen(SHORTS_SAFE_ZONE), "SHORTS_SAFE_ZONE must be frozen");
assert(Object.isFrozen(UNIVERSAL_SAFE_ZONE), "UNIVERSAL_SAFE_ZONE must be frozen");
assert(Object.isFrozen(CENTER_SAFE_ZONE), "CENTER_SAFE_ZONE must be frozen");
assert(Object.isFrozen(SOCIAL_SAFE_ZONES), "SOCIAL_SAFE_ZONES must be frozen");
assert(Object.isFrozen(REFERENCE_PILL_STANDARDS), "REFERENCE_PILL_STANDARDS must be frozen");

// 3. Mathematical Invariants Audit
const allProfiles = [
  { name: "tiktok", g: TIKTOK_SAFE_ZONE, expW: 760, expH: 1220, expCenterX: 480, expBottomMax: 1520, expTopMin: 300 },
  { name: "reels", g: REELS_SAFE_ZONE, expW: 840, expH: 1340, expCenterX: 500, expBottomMax: 1580, expTopMin: 240 },
  { name: "shorts", g: SHORTS_SAFE_ZONE, expW: 820, expH: 1320, expCenterX: 490, expBottomMax: 1540, expTopMin: 220 },
  { name: "universal", g: UNIVERSAL_SAFE_ZONE, expW: 760, expH: 1220, expCenterX: 480, expBottomMax: 1520, expTopMin: 300 },
  { name: "center", g: CENTER_SAFE_ZONE, expW: 880, expH: 1320, expCenterX: 540, expBottomMax: 1620, expTopMin: 300 },
];

for (const p of allProfiles) {
  assert(p.g.W === 1080, `${p.name} W is 1080`);
  assert(p.g.H === 1920, `${p.name} H is 1920`);
  assert(p.g.W_SAFE === p.expW, `${p.name} W_SAFE derivation`);
  assert(p.g.H_SAFE === p.expH, `${p.name} H_SAFE derivation`);
  assert(p.g.CENTER_X === p.expCenterX, `${p.name} CENTER_X derivation`);
  assert(p.g.BOTTOM_MAX_Y === p.expBottomMax, `${p.name} BOTTOM_MAX_Y derivation`);
  assert(p.g.TOP_MIN_Y === p.expTopMin, `${p.name} TOP_MIN_Y derivation`);
  assert(p.g.W_SAFE === p.g.W - p.g.SAFE_LEFT - p.g.SAFE_RIGHT, `${p.name} algebraic W_SAFE match`);
  assert(p.g.H_SAFE === p.g.H - p.g.SAFE_TOP - p.g.SAFE_BOTTOM, `${p.name} algebraic H_SAFE match`);
  assert(p.g.CENTER_X === p.g.SAFE_LEFT + p.g.W_SAFE / 2, `${p.name} algebraic CENTER_X match`);
  assert(p.g.BOTTOM_MAX_Y === p.g.H - p.g.SAFE_BOTTOM, `${p.name} algebraic BOTTOM_MAX_Y match`);
}

// 4. Boundary & Clamping Extreme Stress Test (10,000 iterations)
console.log("Running 10,000 randomized adversarial fuzzing trials...");
for (let i = 0; i < 10000; i++) {
  const profileName = ["tiktok", "reels", "shorts", "universal", "center"][i % 5] as any;
  const geom = SOCIAL_SAFE_ZONES[profileName];
  
  const rx = (Math.random() - 0.5) * 5000;
  const ry = (Math.random() - 0.5) * 5000;
  const rw = Math.random() * 3000;
  const rh = Math.random() * 3000;

  const raw: BoundingBox = { x: rx, y: ry, width: rw, height: rh };
  const clamped = clampToSafeZone(raw, profileName);

  // Clamped box must be 100% inside safe zone
  assert(isWithinSafeZone(clamped, profileName), `Trial ${i}: Clamped box must be within safe zone for ${profileName}`);
  assert(clamped.width <= geom.W_SAFE + 1e-6, `Trial ${i}: Clamped width must not exceed W_SAFE`);
  assert(clamped.height <= geom.H_SAFE + 1e-6, `Trial ${i}: Clamped height must not exceed H_SAFE`);
  assert(clamped.x >= geom.SAFE_LEFT - 1e-6, `Trial ${i}: Clamped x >= SAFE_LEFT`);
  assert(clamped.x + clamped.width <= geom.W - geom.SAFE_RIGHT + 1e-6, `Trial ${i}: Clamped right <= W - SAFE_RIGHT`);
  assert(clamped.y >= geom.TOP_MIN_Y - 1e-6, `Trial ${i}: Clamped y >= TOP_MIN_Y`);
  assert(clamped.y + clamped.height <= geom.BOTTOM_MAX_Y + 1e-6, `Trial ${i}: Clamped bottom <= BOTTOM_MAX_Y`);
}

// 5. Exact Boundary Edge Precision Tests
assert(isWithinSafeZone({ x: 100, y: 300, width: 0, height: 0 }, "tiktok"), "Point at top-left corner is inside");
assert(isWithinSafeZone({ x: 860, y: 1520, width: 0, height: 0 }, "tiktok"), "Point at bottom-right corner is inside");
assert(!isWithinSafeZone({ x: 99.9, y: 300, width: 10, height: 10 }, "tiktok"), "Point just outside left boundary fails");
assert(!isWithinSafeZone({ x: 850.1, y: 300, width: 10, height: 10 }, "tiktok"), "Point just outside right boundary fails");
assert(!isWithinSafeZone({ x: 100, y: 299.9, width: 10, height: 10 }, "tiktok"), "Point just outside top boundary fails");
assert(!isWithinSafeZone({ x: 100, y: 1510.1, width: 10, height: 10 }, "tiktok"), "Point just outside bottom boundary fails");

// 6. Collision Matrix Check
// Adjacent boxes with minGap
const b1: BoundingBox = { x: 100, y: 100, width: 100, height: 100 };
const b2_touching: BoundingBox = { x: 200, y: 100, width: 100, height: 100 }; // touch at x=200
assert(!doBoxesCollide(b1, b2_touching, 0), "Touching edges with gap 0 do not collide");
assert(doBoxesCollide(b1, b2_touching, 1), "Touching edges with gap 1 DO collide");

const b2_overlap: BoundingBox = { x: 199, y: 100, width: 100, height: 100 }; // overlap by 1px
assert(doBoxesCollide(b1, b2_overlap, 0), "1px overlap collides");

// 7. ASS & Anchor Calculation Determinism Check
const ttASS = getASSSubtitlePlacement("tiktok", "lower-third");
assert(ttASS.posX === 480, "ASS TikTok posX optical center");
assert(ttASS.posY === 1420, "ASS TikTok posY lower-third");
assert(ttASS.marginL === 100, "ASS TikTok marginL");
assert(ttASS.marginR === 220, "ASS TikTok marginR");
assert(ttASS.marginV === 500, "ASS TikTok marginV");

const reelsASS = getASSSubtitlePlacement("reels", "lower-third");
assert(reelsASS.posX === 500, "ASS Reels posX optical center");
assert(reelsASS.posY === 1421, "ASS Reels posY lower-third");
assert(reelsASS.marginL === 80, "ASS Reels marginL");
assert(reelsASS.marginR === 160, "ASS Reels marginR");
assert(reelsASS.marginV === 499, "ASS Reels marginV");

console.log("=== ALL FORENSIC AUDIT CHECKS PASSED EMPIRICALLY (100%) ===");
