import Typography from "typography"
import kirkhamTheme from "typography-theme-kirkham"

kirkhamTheme.headerFontFamily = ["SimHei", "Universe", "sans-serif"]
kirkhamTheme.headerWeight = 500

kirkhamTheme.bodyFontFamily = ["SimSun", "Helvetica", "serif"]

const typography = new Typography(kirkhamTheme)

export default typography
export const rhythm = typography.rhythm