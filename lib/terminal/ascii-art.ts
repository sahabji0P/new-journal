/**
 * ASCII art helper functions for terminal output
 */

/**
 * Draws an ASCII box around content using box-drawing characters.
 */
export function drawBox(title: string, lines: string[], width = 44): string[] {
  const inner = width - 4 // account for ║  ...  ║
  const top = `╔${"═".repeat(width - 2)}╗`
  const bottom = `╚${"═".repeat(width - 2)}╝`
  const separator = `║  ${"─".repeat(inner)}  ║`

  const padLine = (text: string) => {
    const truncated = text.length > inner ? text.slice(0, inner - 1) + "…" : text
    return `║  ${truncated.padEnd(inner)}  ║`
  }

  const titleLine = padLine(title)

  const contentLines = lines.map(padLine)

  return [top, titleLine, separator, ...contentLines, bottom]
}

/**
 * Draws an aligned ASCII table with headers and rows.
 */
export function drawTable(headers: string[], rows: string[][]): string[] {
  const colWidths = headers.map((h, i) => {
    const maxRow = rows.reduce((m, r) => Math.max(m, (r[i] ?? "").length), 0)
    return Math.max(h.length, maxRow)
  })

  const formatRow = (cells: string[]) =>
    cells.map((c, i) => c.padEnd(colWidths[i])).join("  ")

  const separator = colWidths.map((w) => "─".repeat(w)).join("  ")

  return [formatRow(headers), separator, ...rows.map(formatRow)]
}

/**
 * Draws an ASCII tree from nested items.
 */
export function drawTree(
  items: { name: string; children?: { name: string }[] }[]
): string[] {
  const result: string[] = []

  items.forEach((item, i) => {
    const isLast = i === items.length - 1
    result.push(`${isLast ? "└──" : "├──"} ${item.name}`)

    if (item.children) {
      item.children.forEach((child, j) => {
        const childIsLast = j === item.children!.length - 1
        const prefix = isLast ? "    " : "│   "
        result.push(`${prefix}${childIsLast ? "└──" : "├──"} ${child.name}`)
      })
    }
  })

  return result
}

/**
 * Generates cowsay ASCII art.
 */
export function cowsayArt(text: string): string[] {
  const maxLen = 40
  // Word-wrap text into lines
  const words = text.split(" ")
  const wrappedLines: string[] = []
  let current = ""
  for (const word of words) {
    if ((current + " " + word).trim().length > maxLen) {
      if (current) wrappedLines.push(current)
      current = word
    } else {
      current = current ? current + " " + word : word
    }
  }
  if (current) wrappedLines.push(current)

  const maxLineLen = Math.max(...wrappedLines.map((l) => l.length))
  const border = "_".repeat(maxLineLen + 2)

  const speechLines: string[] = [`  ${"_".repeat(maxLineLen + 2)}`]

  if (wrappedLines.length === 1) {
    speechLines.push(`< ${wrappedLines[0].padEnd(maxLineLen)} >`)
  } else {
    wrappedLines.forEach((line, i) => {
      const padded = line.padEnd(maxLineLen)
      if (i === 0) speechLines.push(`/ ${padded} \\`)
      else if (i === wrappedLines.length - 1) speechLines.push(`\\ ${padded} /`)
      else speechLines.push(`| ${padded} |`)
    })
  }

  speechLines.push(`  ${"-".repeat(maxLineLen + 2)}`)
  void border

  return [
    ...speechLines,
    "        \\   ^__^",
    "         \\  (oo)\\_______",
    "            (__)\\       )\\/\\",
    "                ||----w |",
    "                ||     ||",
  ]
}
