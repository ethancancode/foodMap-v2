import { ref } from 'vue'

// Shared reactive clock updated once per second
export const currentTimestamp = ref(Date.now())

if (typeof window !== 'undefined') {
  setInterval(() => {
    currentTimestamp.value = Date.now()
  }, 1000)
}

/**
 * Returns reactive countdown details for any food item.
 * Ticks down second-by-second and automatically switches to 'Ready now' when time elapses.
 */
export function getCookingCountdown(item) {
  if (!item) {
    return { text: 'Ready now', shortText: 'Ready', isReady: true, secondsLeft: 0 }
  }

  const rawStatus = String(item.cookingStatus || item.timeReady || item.time || '').trim()

  if (/^(ready\s*now|now)$/i.test(rawStatus)) {
    return { text: 'Ready now', shortText: 'Ready', isReady: true, secondsLeft: 0 }
  }

  let targetMs = null

  if (item.readyAt) {
    const parsed = new Date(item.readyAt).getTime()
    if (!isNaN(parsed) && parsed > 0) {
      targetMs = parsed
    }
  }

  // If no explicit readyAt, calculate from status text and item timestamp
  if (!targetMs) {
    const hrMatch = rawStatus.match(/(\d+)\s*(?:hr|hour|h)/i)
    const minMatch = rawStatus.match(/(\d+)\s*(?:min|m)/i)
    const totalMinutes = (hrMatch ? parseInt(hrMatch[1], 10) * 60 : 0) + (minMatch ? parseInt(minMatch[1], 10) : 0)

    if (totalMinutes > 0) {
      const baseMs = item.updatedAt
        ? new Date(item.updatedAt).getTime()
        : item.createdAt
        ? new Date(item.createdAt).getTime()
        : null

      if (baseMs && !isNaN(baseMs)) {
        targetMs = baseMs + totalMinutes * 60 * 1000
      }
    }
  }

  // If we couldn't determine a countdown target, return the static status
  if (!targetMs) {
    return {
      text: rawStatus || 'Ready now',
      shortText: rawStatus || 'Ready',
      isReady: /ready/i.test(rawStatus),
      secondsLeft: 0
    }
  }

  const diffMs = targetMs - currentTimestamp.value

  if (diffMs <= 0) {
    return { text: 'Ready now', shortText: 'Ready', isReady: true, secondsLeft: 0 }
  }

  const secondsLeft = Math.floor(diffMs / 1000)
  const hours = Math.floor(secondsLeft / 3600)
  const minutes = Math.floor((secondsLeft % 3600) / 60)
  const secs = secondsLeft % 60

  let formatted = ''
  let short = ''

  if (hours > 0) {
    formatted = `Ready in ${hours}h ${minutes}m ${secs < 10 ? '0' : ''}${secs}s`
    short = `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    formatted = `Ready in ${minutes}m ${secs < 10 ? '0' : ''}${secs}s`
    short = `${minutes}m ${secs}s`
  } else {
    formatted = `Ready in ${secs}s`
    short = `${secs}s`
  }

  return {
    text: formatted,
    shortText: short,
    isReady: false,
    secondsLeft,
    hours,
    minutes,
    seconds: secs
  }
}
