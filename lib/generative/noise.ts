// Seeded pseudo-random number generator
export function seededRandom(seed: number): () => number {
  // Mulberry32 PRNG
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Convert strings to a deterministic numeric hash
export function contentHash(strings: string[]): number {
  let hash = 0
  const str = strings.join("|")
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return Math.abs(hash)
}

// Simple 2D value noise using seeded random
export function seededNoise2D(seed: number): (x: number, y: number) => number {
  const grid: Record<string, number> = {}

  function getGrid(ix: number, iy: number): number {
    const key = `${ix},${iy}`
    if (!(key in grid)) {
      const tempRand = seededRandom(seed + ix * 374761393 + iy * 668265263)
      grid[key] = tempRand() * 2 - 1
    }
    return grid[key]
  }

  // Cosine interpolation
  function interpolate(a: number, b: number, t: number): number {
    const ft = t * Math.PI
    const f = (1 - Math.cos(ft)) * 0.5
    return a * (1 - f) + b * f
  }

  return function (x: number, y: number): number {
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const fx = x - ix
    const fy = y - iy

    const v1 = getGrid(ix, iy)
    const v2 = getGrid(ix + 1, iy)
    const v3 = getGrid(ix, iy + 1)
    const v4 = getGrid(ix + 1, iy + 1)

    const i1 = interpolate(v1, v2, fx)
    const i2 = interpolate(v3, v4, fx)
    return interpolate(i1, i2, fy)
  }
}
