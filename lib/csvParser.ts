import type { ParsedEmployee } from '@/types'

export function parseEmployeeCSV(text: string): ParsedEmployee[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one employee.')

  const header = lines[0].split(',').map(h => h.trim().toLowerCase())
  const required = ['name', 'email', 'department', 'previous_employers']
  for (const col of required) {
    if (!header.includes(col)) throw new Error(`Missing required CSV column: "${col}"`)
  }

  const idx = (col: string) => header.indexOf(col)

  return lines.slice(1).map((line, i) => {
    const cols = splitCSVLine(line)
    const name = cols[idx('name')]?.trim()
    const email = cols[idx('email')]?.trim()
    const department = cols[idx('department')]?.trim()
    const rawEmployers = cols[idx('previous_employers')]?.trim() ?? ''
    const education = idx('education') >= 0 ? cols[idx('education')]?.trim() : undefined
    const region = idx('region') >= 0 ? cols[idx('region')]?.trim() : undefined

    if (!name || !email || !department) {
      throw new Error(`Row ${i + 2}: name, email, and department are required.`)
    }

    return {
      name,
      email,
      department,
      previousEmployers: parseEmployers(rawEmployers),
      education: education || undefined,
      region: region || undefined,
    }
  })
}

function parseEmployers(raw: string): { company: string; from: number; to: number | null }[] {
  if (!raw) return []
  return raw
    .split('|')
    .map(s => s.trim())
    .filter(Boolean)
    .map(entry => {
      const parts = entry.split(':')
      if (parts.length >= 3) {
        const company = parts[0].trim()
        const from = parseInt(parts[1], 10)
        const toRaw = parts[2].trim().toLowerCase()
        const to = toRaw === 'present' || toRaw === '' ? null : parseInt(toRaw, 10)
        return { company, from: isNaN(from) ? 2020 : from, to: isNaN(to as number) ? null : to }
      }
      return { company: entry.trim(), from: 2020, to: null }
    })
}

function splitCSVLine(line: string): string[] {
  const cols: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { cols.push(current); current = '' }
    else { current += ch }
  }
  cols.push(current)
  return cols
}

export function generateCSVTemplate(): string {
  const header = 'name,email,department,previous_employers,education,region'
  const example = 'Jane Smith,jane@firm.com,Infrastructure,Network Rail:2019:2023|Atkins:2015:2019,University of Manchester,Manchester'
  return `${header}\n${example}\n`
}
