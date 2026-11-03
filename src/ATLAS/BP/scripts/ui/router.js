/** Tiny screen registry. Screens register themselves; callers never import them. */

import { featureIdForScreen } from "../compatibilityModel.js";
import { markFeatureError, markFeatureSuccess } from "../compatibility.js";

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
  const featureId = featureIdForScreen(id);
  try {
    await handler(player, payload);
    if (featureId) markFeatureSuccess(player, featureId, `screen ${id}`);
  } catch (error) {
    console.warn(`[ATLAS] Screen "${id}" failed: ${error}`);
    markFeatureError(player, featureId, error, "form");
  }
}
