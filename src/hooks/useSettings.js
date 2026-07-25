import React, { useState, useEffect, useCallback } from 'react'

const SETTINGS_KEY = 'pdf-master-settings'

const defaultSettings = {
  theme: 'system',
  locale: 'zh-CN',
  historyLimit: 20,
  defaultSavePath: '',
}

export function useSettings() {
  const [settings, setSettings] = useState(defaultSettings)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setSettings({ ...defaultSettings, ...parsed })
      }
    } catch {
      // ignore
    }
  }, [])

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const updateSettings = useCallback((partial) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { settings, updateSetting, updateSettings }
}

export default useSettings
