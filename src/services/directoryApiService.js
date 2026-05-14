import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'

const SETTINGS_DOC = 'settings/directoryApi'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

let apiSettings = null

async function getApiSettings() {
  if (apiSettings) return apiSettings
  try {
    const snap = await getDoc(doc(db, 'settings', 'directoryApi'))
    apiSettings = snap.exists() ? snap.data() : { endpoint: '', apiKey: '', enabled: false }
  } catch {
    apiSettings = { endpoint: '', apiKey: '', enabled: false }
  }
  return apiSettings
}

export const directoryApiService = {
  async lookup(fullName, mobileNumber) {
    const settings = await getApiSettings()
    if (!settings.enabled || !settings.endpoint) {
      return null
    }
    try {
      const response = await fetch(`${settings.endpoint}/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({ full_name: fullName, mobile_number: mobileNumber }),
        signal: AbortSignal.timeout(5000),
      })
      if (!response.ok) return null
      return await response.json()
    } catch {
      return null
    }
  },

  async saveSettings(settings, adminUid) {
    apiSettings = null
    await setDoc(doc(db, 'settings', 'directoryApi'), {
      ...settings, updatedAt: new Date().toISOString(), updatedBy: adminUid,
    })
  },

  async getSettings() {
    return getApiSettings()
  },

  invalidateCache() {
    apiSettings = null
  },
}
