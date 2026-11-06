export const LOGO_SCROLL_MIN_HEIGHT = 40
export const LOGO_SCROLL_MAX_HEIGHT = 400
export const LOGO_SCROLL_DEFAULT_HEIGHT = 80

export const resolveLogoScrollHeight = (props: Record<string, unknown> = {}): number => {
  const value = props.height ?? props.logoHeight ?? props.heightOption
  // Preserve saved pages that still use the original height presets.
  if (value === 'high') return 160
  if (value === 'low' || value === 'medium') return LOGO_SCROLL_DEFAULT_HEIGHT
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '') {
    return LOGO_SCROLL_DEFAULT_HEIGHT
  }
  const height = Number(value)
  return Number.isFinite(height)
    ? Math.min(LOGO_SCROLL_MAX_HEIGHT, Math.max(LOGO_SCROLL_MIN_HEIGHT, Math.round(height)))
    : LOGO_SCROLL_DEFAULT_HEIGHT
}
