import { ColorValue } from 'react-native';

export const DEFAULT_PROFILE_COLOR = '#9B4DFF' as const;

/**
 * Generates a gradient based on a base color
 * @param baseColor - The base color in hex format (e.g., '#FF5A5F')
 * @param count - Number of gradient steps to generate (min 2, max 5)
 * @returns Tuple of ColorValue for use with LinearGradient
 */
export function generateGradient(baseColor: string, count: number = 3): [ColorValue, ColorValue, ...ColorValue[]] {
  // Parse the base color
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const gradient = [];
  
  // Generate gradient colors
  for (let i = 0; i < count; i++) {
    // Calculate brightness factor (darker to lighter)
    const factor = 0.5 + (i / (count - 1)) * 0.5; // 0.5 to 1.0
    
    // Apply brightness to each channel
    const newR = Math.round(r * factor);
    const newG = Math.round(g * factor);
    const newB = Math.round(b * factor);
    
    // Convert back to hex
    const toHex = (c: number) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0');
    gradient.push(`#${toHex(newR)}${toHex(newG)}${toHex(newB)}`);
  }
  
  // Ensure we return at least 2 colors and at most 5
  const safeCount = Math.min(5, Math.max(2, count));
  const result = gradient.slice(0, safeCount) as [ColorValue, ColorValue, ...ColorValue[]];
  return result;
}

/**
 * Gets a random color from the app's theme colors
 * @returns A random color in hex format
 */
export function getRandomThemeColor(): `#${string}` {
  const themeColors = [
    '#FF5A5F', // Tint color
    '#FF8A80', // Lighter red
    '#FF3D00', // Deeper red
    '#FF6E40', // Orange-red
    '#FF5252', // Red-pink
  ] as const;
  return themeColors[Math.floor(Math.random() * themeColors.length)] as `#${string}`;
}

export function getProfileBaseColor(input: {
  id?: string;
  avatar?: string;
  profileColor?: string;
}): `#${string}` {
  const explicit = (input.profileColor ?? '').trim();
  if (explicit.startsWith('#') && explicit.length === 7) {
    return explicit as `#${string}`;
  }

  const hasAvatar = typeof input.avatar === 'string' && input.avatar.trim().length > 0;
  if (!hasAvatar) {
    return DEFAULT_PROFILE_COLOR;
  }

  const seedKey = `profile:${input.id ?? input.avatar ?? 'default'}`;
  const rand = seededRandom(seedKey);
  const palette = [
    '#FF4D8D',
    '#FF5A5F',
    '#D946EF',
    '#B026FF',
    '#7B2FFF',
    '#9B4DFF',
  ] as const;
  return palette[Math.floor(rand() * palette.length)] as `#${string}`;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRandom(seedKey: string) {
  return mulberry32(hashStringToSeed(seedKey));
}

export function hashStringToSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mixChannel(c: number, target: number, amount: number) {
  return Math.round(c + (target - c) * clamp01(amount));
}

function toHexColor(r: number, g: number, b: number): `#${string}` {
  const toHex = (c: number) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}` as `#${string}`;
}

function parseHexColor(hexColor: string) {
  const hex = hexColor.replace('#', '').trim();
  if (hex.length !== 6) {
    return { r: 255, g: 90, b: 95 };
  }
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

export function hexToRgba(hexColor: string, alpha: number) {
  const { r, g, b } = parseHexColor(hexColor);
  const a = clamp01(alpha);
  return `rgba(${r},${g},${b},${a})`;
}

export function generateMonochromeGradient(
  baseColor: string,
  seedKey: string,
  count: number = 4
): [ColorValue, ColorValue, ...ColorValue[]] {
  const safeCount = Math.min(6, Math.max(2, count));
  const { r, g, b } = parseHexColor(baseColor);

  const rand = mulberry32(hashStringToSeed(seedKey));
  const darkBias = 0.65 + rand() * 0.15;
  const lightBias = 0.15 + rand() * 0.15;

  const colors: `#${string}`[] = [];
  for (let i = 0; i < safeCount; i++) {
    const t = safeCount === 1 ? 0 : i / (safeCount - 1);
    const towardsLight = t;
    const lightAmount = lightBias + towardsLight * (1 - lightBias);
    const darkAmount = darkBias * (1 - towardsLight);

    const rr = mixChannel(mixChannel(r, 0, darkAmount), 255, lightAmount);
    const gg = mixChannel(mixChannel(g, 0, darkAmount), 255, lightAmount);
    const bb = mixChannel(mixChannel(b, 0, darkAmount), 255, lightAmount);
    colors.push(toHexColor(rr, gg, bb));
  }

  return colors as unknown as [ColorValue, ColorValue, ...ColorValue[]];
}

export function generateDarkMonochromeGradient(
  baseColor: string,
  seedKey: string,
  count: number = 5
): [ColorValue, ColorValue, ...ColorValue[]] {
  const safeCount = Math.min(6, Math.max(2, count));
  const { r, g, b } = parseHexColor(baseColor);

  const rand = mulberry32(hashStringToSeed(`dark:${seedKey}`));
  const darkBase = 0.78 + rand() * 0.12;
  const liftMax = 0.08 + rand() * 0.06;

  const colors: `#${string}`[] = [];
  for (let i = 0; i < safeCount; i++) {
    const t = safeCount === 1 ? 0 : i / (safeCount - 1);
    const lift = liftMax * (0.35 + 0.65 * t);
    const rr = mixChannel(mixChannel(r, 0, darkBase), 255, lift);
    const gg = mixChannel(mixChannel(g, 0, darkBase), 255, lift);
    const bb = mixChannel(mixChannel(b, 0, darkBase), 255, lift);
    colors.push(toHexColor(rr, gg, bb));
  }

  return colors as unknown as [ColorValue, ColorValue, ...ColorValue[]];
}

export function getSeededGradientDirection(seedKey: string) {
  const rand = mulberry32(hashStringToSeed(seedKey));
  const dirs = [
    { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    { start: { x: 1, y: 0 }, end: { x: 0, y: 1 } },
    { start: { x: 0, y: 1 }, end: { x: 1, y: 0 } },
    { start: { x: 1, y: 1 }, end: { x: 0, y: 0 } },
    { start: { x: 0, y: 0.2 }, end: { x: 1, y: 0.8 } },
    { start: { x: 0.2, y: 0 }, end: { x: 0.8, y: 1 } },
  ] as const;

  return dirs[Math.floor(rand() * dirs.length)];
}
