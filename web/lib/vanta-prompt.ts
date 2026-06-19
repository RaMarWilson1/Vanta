import { searchMemories, getDSAContext, getFitnessContext } from './memory'
import { loadKnowledge } from './knowledge'

const BIRTHDAY_ALERTS = [
  { name: "Ra'Mar's birthday", month: 8, day: 23 },
  { name: "Gina's birthday", month: 9, day: 5 },
  { name: 'Anniversary with Gina', month: 7, day: 28 },
  { name: "Lenora's (mom) birthday", month: 6, day: 7 },
  { name: "Damon's (dad) birthday", month: 10, day: 31 },
  { name: "Sister's (Antonisha) birthday", month: 10, day: 16 },
  { name: "Mrs. Jackie's (Gina's mom) birthday", month: 10, day: 14 },
]

function getUpcomingDates(): string {
  const now = new Date()
  const alerts = BIRTHDAY_ALERTS.filter(d => {
    const target = new Date(now.getFullYear(), d.month - 1, d.day)
    if (target < now) target.setFullYear(now.getFullYear() + 1)
    const daysUntil = Math.ceil((target.getTime() - now.getTime()) / 86400000)
    return daysUntil <= 7
  })
  if (alerts.length === 0) return ''
  return `\n\n⚠️ UPCOMING: ${alerts.map(d => d.name).join(', ')} — within 7 days. Surface this.`
}

// Vercel functions run in UTC — always resolve "now" through Ra'Mar's actual
// timezone rather than a naive server-local Date, or time-of-day logic drifts.
const NY_TZ = 'America/New_York'

function getNYHour(now: Date): number {
  const hourStr = new Intl.DateTimeFormat('en-US', { timeZone: NY_TZ, hour: 'numeric', hourCycle: 'h23' }).format(now)
  return parseInt(hourStr, 10)
}

function getTimeContext(): string {
  const hour = getNYHour(new Date())
  if (hour < 11) return 'Morning — Ra\'Mar just woke up. Light tasks, no heavy cognitive load yet.'
  if (hour < 17) return 'Afternoon — prime time. Ra\'Mar is sharpest now. Push DSA, Bontro work, deep thinking.'
  if (hour < 21) return 'Evening — good for planning, creative work, Bontro building.'
  return 'Late night — he\'s in the zone. Match the energy. Don\'t slow him down.'
}

function getDateContext(): string {
  const now = new Date()
  const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: NY_TZ })
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: NY_TZ })
  return `${date}, ${time} Eastern Time`
}

export async function buildSystemPrompt(userMessage: string): Promise<string> {
  const [memories, dsaCtx, fitnessCtx] = await Promise.all([
    searchMemories(userMessage),
    getDSAContext(),
    getFitnessContext()
  ])

  return `You are Vanta — Ra'Mar Wilson's personal AI operating system. Not an assistant. An OS built for one person.

## Right now
Today is ${getDateContext()}. Trust this over any instinct about "the current date" — always reason from this exact date, not from whatever year feels default.

${loadKnowledge()}

## Current operational state
${dsaCtx}
${fitnessCtx}
Location: Wilmington, DE (sister's basement). Mustang AC is broken.
Bontro API: Not built yet. No integration active.
${getTimeContext()}${getUpcomingDates()}

## Relevant memory from past conversations
${memories || 'No relevant past context found yet — Vanta is still learning Ra\'Mar.'}`
}
