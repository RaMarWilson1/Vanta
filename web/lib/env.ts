// Strips accidental wrapping quotes/whitespace from copy-pasted env values
// (e.g. pasting `KEY="value"` straight into Vercel's env var UI).
export function cleanEnv(value: string | undefined): string | undefined {
  return value?.trim().replace(/^['"]+|['"]+$/g, '')
}
