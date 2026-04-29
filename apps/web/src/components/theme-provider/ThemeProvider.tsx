import { useRouter } from "@tanstack/react-router"
import { createContext, use } from "react"
import type { PropsWithChildren } from "react"
import type { Theme } from "@/lib/theme"
import { setThemeServerFn } from "@/lib/theme"

type ThemeContextVal = { theme: Theme; setTheme: (val: Theme) => void }

const ThemeContext = createContext<ThemeContextVal | null>(null)

export const ThemeProvider = ({
  children,
  theme,
}: PropsWithChildren<{ theme: Theme }>) => {
  const router = useRouter()

  function setTheme(val: Theme) {
    setThemeServerFn({ data: val }).then(() => router.invalidate())
  }

  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>
}

export const useTheme = () => {
  const val = use(ThemeContext)
  if (!val) throw new Error("useTheme must be used within a ThemeProvider")
  return val
}
