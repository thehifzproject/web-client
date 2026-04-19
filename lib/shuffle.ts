// Fisher-Yates shuffle. Returns a new array; does not mutate the input.
// Replaces the biased `arr.sort(() => Math.random() - 0.5)` pattern, which
// produces non-uniform distributions and can be unstable across engines.
export function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
