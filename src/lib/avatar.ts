/**
 * Màu nền avatar fallback chọn theo hash của tên — ổn định cho cùng một người,
 * lấy từ palette token (không hardcode hex). Chữ luôn trắng.
 */
const AVATAR_BG = [
  'bg-avatar-1',
  'bg-avatar-2',
  'bg-avatar-3',
  'bg-avatar-4',
  'bg-avatar-5',
  'bg-avatar-6',
] as const;

/**
 * Soft tinted tile (nền mờ + màu icon) từ cùng một palette avatar — dùng cho ô
 * icon vuông (vd. workspace card). Full literal strings để Tailwind quét được.
 */
const AVATAR_TILE = [
  'bg-avatar-1/12 text-avatar-1',
  'bg-avatar-2/12 text-avatar-2',
  'bg-avatar-3/12 text-avatar-3',
  'bg-avatar-4/12 text-avatar-4',
  'bg-avatar-5/12 text-avatar-5',
  'bg-avatar-6/12 text-avatar-6',
] as const;

/**
 * Chip mềm (nền mờ + viền + chữ cùng hue) cho nhãn thực thể lấy màu theo tên —
 * vd chi nhánh trong `BranchChip`. Cùng hash với {@link getAvatarColor} nên chip
 * của một tên khớp màu avatar của tên đó. Full literal strings để Tailwind quét được.
 */
const AVATAR_CHIP = [
  'border-avatar-1/25 bg-avatar-1/10 text-avatar-1',
  'border-avatar-2/25 bg-avatar-2/10 text-avatar-2',
  'border-avatar-3/25 bg-avatar-3/10 text-avatar-3',
  'border-avatar-4/25 bg-avatar-4/10 text-avatar-4',
  'border-avatar-5/25 bg-avatar-5/10 text-avatar-5',
  'border-avatar-6/25 bg-avatar-6/10 text-avatar-6',
] as const;

/** Stable 32-bit string hash → index in [0, mod). Tên rỗng/null luôn về index 0. */
function hashIndex(name: string | null | undefined, mod: number): number {
  const str = name ?? '';
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // ép về 32-bit
  }
  return Math.abs(hash) % mod;
}

/** Solid avatar background (chữ trắng) — dùng cho Avatar tròn. */
export function getAvatarColor(name: string | null | undefined): string {
  return AVATAR_BG[hashIndex(name, AVATAR_BG.length)];
}

/**
 * Soft tinted tile classes (nền mờ + màu icon cùng hue) — cùng hash với
 * {@link getAvatarColor} nên tile của một tên khớp màu avatar của tên đó.
 */
export function getAvatarTile(name: string | null | undefined): string {
  return AVATAR_TILE[hashIndex(name, AVATAR_TILE.length)];
}

/** Soft chip classes (viền + nền mờ + chữ cùng hue) — cùng hash với {@link getAvatarColor}. */
export function getAvatarChip(name: string | null | undefined): string {
  return AVATAR_CHIP[hashIndex(name, AVATAR_CHIP.length)];
}
