import { useSyncExternalStore, useCallback } from 'react'

const STORAGE_KEY = 't-file-settings'

interface Settings {
  server: string
  devMode: boolean
}

const defaultSettings: Settings = {
  server: '',
  devMode: import.meta.env.DEV,
}

// 缓存当前设置，避免每次返回新对象导致无限循环
let cachedSettings: Settings = defaultSettings
let cachedRaw: string | null = null

function getSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    // 只有当存储内容变化时才更新缓存
    if (stored !== cachedRaw) {
      cachedRaw = stored
      cachedSettings = stored ? JSON.parse(stored) : defaultSettings
    }
  } catch {
    // ignore
  }
  return cachedSettings
}

function setSettings(settings: Settings) {
  const json = JSON.stringify(settings)
  localStorage.setItem(STORAGE_KEY, json)
  // 立即更新缓存
  cachedRaw = json
  cachedSettings = settings
  window.dispatchEvent(new Event('settings-change'))
}

function subscribe(callback: () => void) {
  window.addEventListener('settings-change', callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener('settings-change', callback)
    window.removeEventListener('storage', callback)
  }
}

export function useSettings() {
  const settings = useSyncExternalStore(subscribe, getSettings, getSettings)

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings({ ...getSettings(), ...newSettings })
  }, [])

  const isConfigured = settings.server.trim() !== ''

  const getApiUrl = useCallback(() => {
    const server = settings.server.trim()
    if (!server) return ''
    // 根据调试模式选择协议
    const protocol = settings.devMode ? 'http' : 'https'
    return `${protocol}://${server}`
  }, [settings.server, settings.devMode])

  const getWsUrl = useCallback(() => {
    const server = settings.server.trim()
    if (!server) return ''
    // 根据调试模式选择协议
    const protocol = settings.devMode ? 'ws' : 'wss'
    return `${protocol}://${server}/_ws`
  }, [settings.server, settings.devMode])

  return {
    settings,
    updateSettings,
    isConfigured,
    getApiUrl,
    getWsUrl,
  }
}

// 非 hook 版本，用于非组件代码
export function getSettingsSnapshot(): Settings {
  return getSettings()
}

export function getApiUrlSnapshot(): string {
  const settings = getSettings()
  const server = settings.server.trim()
  if (!server) return ''
  const protocol = settings.devMode ? 'http' : 'https'
  return `${protocol}://${server}`
}

export function getWsUrlSnapshot(): string {
  const settings = getSettings()
  const server = settings.server.trim()
  if (!server) return ''
  const protocol = settings.devMode ? 'ws' : 'wss'
  return `${protocol}://${server}/_ws`
}
