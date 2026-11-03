/** Tiny screen registry. Screens register themselves; callers never import them. */

/** @type {Map<string, (player: any, payload?: any) => Promise<void>>} */
const screens = new Map();

export function registerScreen(id, handler) {
  screens.set(id, handler);
}

export async function openScreen(id, player, payload) {
  const handler = screens.get(id);
  if (!handler) {
    console.warn(`[ATLAS] Unknown screen: ${id}`);
    return;
  }
  try {
    await handler(player, payload);
  } catch (error) {
    console.warn(`[ATLAS] Screen "${id}" failed: ${error}`);
  }
}
