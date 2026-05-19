import { useEffect, useState } from "react"
import { createContext, use } from "react"
import type { PropsWithChildren } from "react"
import type { Theme } from "@/lib/theme"
import { setThemeServerFn } from "@/lib/theme"

type ThemeContextVal = { theme: Theme; setTheme: (val: Theme) => void }

const ThemeContext = createContext<ThemeContextVal | null>(null)

export const ThemeProvider = ({
  children,
  theme: initialTheme,
}: PropsWithChildren<{ theme: Theme }>) => {
  const [theme, setThemeState] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.className = theme
  }, [theme])

  function setTheme(val: Theme) {
    setThemeState(val)
    void setThemeServerFn({ data: val })
  }

  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>
}

export const useTheme = () => {
  const val = use(ThemeContext)
  if (!val) throw new Error("useTheme must be used within a ThemeProvider")
  return val
}
