import type { ModelId } from "../types";

/**
 * Heuristic that recognises an image-generation request. Mirrors the prototype:
 * an action verb followed by an image noun, an explicit /image command, or a
 * "nano banana" mention.
 */
export const IMAGE_INTENT =
  /\b(generate|create|make|draw|paint|render|design|produce|imagine)\b[^.?!]*\b(image|picture|photo|art|artwork|illustration|logo|icon|wallpaper|poster|drawing|painting|render|graphic|scene|portrait|sketch)\b|^\/(image|img|imagine)\b|\bnano banana\b/i;

const IMAGE_EDIT_FOLLOW_UP =
  /\b(edit|modify|update|change|alter|revise|adjust|transform|convert|turn|make|recolor|colour|color|stylize|style|cartoonify|replace|swap|remove|erase|add|put|give)\b/i;

const IMAGE_FOLLOW_UP_CUE =
  /\b(it|this|that|image|picture|photo|background|foreground|subject|scene|style|cartoon|anime|realistic|cinematic|lighting|color|colour|black|white|red|blue|green|yellow|purple|pink|orange|hat|glasses|shirt|person|face|sky|another|again|one more|variation|version)\b/i;

const ANOTHER_IMAGE_FOLLOW_UP =
  /\b(make|create|generate|draw|render|do|try)\b[^.?!]*\b(another|again|one more|new one|different one|variation|version)\b|\b(another|one more|again)\b/i;

export function isImageGenerationRequest(text: string): boolean {
  return IMAGE_INTENT.test(text);
}

export function isImageEditFollowUp(text: string, hasRecentGeneratedImage: boolean): boolean {
  if (!hasRecentGeneratedImage) return false;
  const trimmed = text.trim();
  if (!trimmed || isImageGenerationRequest(trimmed)) return false;
  return (
    (IMAGE_EDIT_FOLLOW_UP.test(trimmed) && IMAGE_FOLLOW_UP_CUE.test(trimmed)) ||
    ANOTHER_IMAGE_FOLLOW_UP.test(trimmed)
  );
}

export function shouldRouteToImageModel(
  text: string,
  hasRecentGeneratedImage = false,
): boolean {
  return isImageGenerationRequest(text) || isImageEditFollowUp(text, hasRecentGeneratedImage);
}

/**
 * Decide which concrete model handles a message.
 * When the user has pinned a model (anything but "auto") we respect it;
 * otherwise: image intent → image, any attachment → pro, else → flash.
 */
export function routeModel(
  selectedModel: ModelId,
  text: string,
  hasFiles: boolean,
  options: { hasRecentGeneratedImage?: boolean } = {},
): Exclude<ModelId, "auto"> {
  if (selectedModel !== "auto") return selectedModel;
  if (shouldRouteToImageModel(text, options.hasRecentGeneratedImage)) return "image";
  if (hasFiles) return "pro";
  return "flash";
}
