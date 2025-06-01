/**
 * Strips box-drawing and decoration characters from text
 * Removes Unicode box drawing characters and other decorative elements
 */
export function stripBoxChars(text: string): string {
  const boxDrawingRegex = /[\u2500-\u257F]/g
  return text.replace(boxDrawingRegex, '')
}
