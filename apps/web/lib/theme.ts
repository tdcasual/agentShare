// Theme management utilities

export type Theme = 'light' | 'dark' | 'system'

const THEME_KEY = 'acp-theme'

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  return (localStorage.getItem(THEME_KEY) as Theme) || 'system'
}

export function setStoredTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme)
  applyTheme(theme)
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  } else {
    root.classList.toggle('dark', theme === 'dark')
  }
}

export function initTheme() {
  const theme = getStoredTheme()
  applyTheme(theme)
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (getStoredTheme() === 'system') {
      applyTheme('system')
    }
  })
}

export function toggleTheme() {
  const current = getStoredTheme()
  const next = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light'
  setStoredTheme(next)
  return next
}
