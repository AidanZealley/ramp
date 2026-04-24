import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import { z } from 'zod'

const themeSchema = z.enum(['light', 'dark'])
export type Theme = z.infer<typeof themeSchema>

const storageKey = '_gather-preferred-theme'

export const getThemeServerFn = createServerFn().handler(
  () => (getCookie(storageKey) || 'light') as Theme,
)

export const setThemeServerFn = createServerFn({ method: 'POST' })
  .inputValidator(themeSchema)
  .handler(({ data }) => setCookie(storageKey, data))
