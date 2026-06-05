import type { ModelId } from "../types";

/**
 * Heuristic that recognises an image-generation request. Mirrors the prototype:
 * an action verb followed by an image noun, an explicit /image command, or a
 * "nano banana" mention.
 */
export const IMAGE_INTENT =
  /\b(generate|create|make|draw|paint|render|design|produce|imagine)\b[^.?!]*\b(image|picture|photo|art|artwork|illustration|logo|icon|wallpaper|poster|drawing|painting|render|graphic|scene|portrait|sketch)\b|^\/(image|img|imagine)\b|\bnano banana\b/i;

/**
 * Decide which concrete model handles a message.
 * When the user has pinned a model (anything but "auto") we respect it;
 * otherwise: image intent → image, any attachment → pro, else → flash.
 */
export function routeModel(
  selectedModel: ModelId,
  text: string,
  hasFiles: boolean,
): Exclude<ModelId, "auto"> {
  if (selectedModel !== "auto") return selectedModel;
  if (IMAGE_INTENT.test(text)) return "image";
  if (hasFiles) return "pro";
  return "flash";
}
