import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext({})

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider')
  }
  return context
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Tenta recuperar o tema salvo no localStorage
    const savedTheme = localStorage.getItem('theme')
    return savedTheme || 'dark'
  })

  // Aplica o tema ao documento
  useEffect(() => {
    const root = document.documentElement

    if (theme === 'light') {
      root.classList.add('light-theme')
    } else {
      root.classList.remove('light-theme')
    }

    // Salva no localStorage
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

  const setDarkTheme = useCallback(() => {
    setTheme('dark')
  }, [])

  const setLightTheme = useCallback(() => {
    setTheme('light')
  }, [])

  const value = {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    toggleTheme,
    setDarkTheme,
    setLightTheme
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
