import Typography from "typography"

import gray from "gray-percentage"
import {
  MOBILE_MEDIA_QUERY,
} from "typography-breakpoint-constants"

const theme = {
  title: "Kirkham",
  baseFontSize: "18px",
  baseLineHeight: 1.44,
  scaleRatio: 2.15,
  blockMarginBottom: 0.75,
  headerFontFamily: ["SimHei", "Quattrocento Sans", "sans-serif"],
  bodyFontFamily: ["SimSun", "Quattrocento Sans", "serif"],
  googleFonts: [
    {
      name: "Quattrocento Sans",
      styles: ["Regular 400", "Bold 700"],
    }
  ],
  headerColor: "hsla(0,0%,0%,1)",
  bodyColor: "hsla(0,0%,0%,0.8)",
  headerWeight: 500,
  bodyWeight: 400,
  boldWeight: 700,
  overrideStyles: ({ adjustFontSizeTo, scale, rhythm }, options) => ({
    a: {
      color: "#9f392b",
    },
    blockquote: {
      color: gray(41),
      paddingLeft: rhythm(13 / 16),
      marginLeft: 0,
      borderLeft: `${rhythm(3 / 16)} solid ${gray(80)}`,
    },
    "blockquote > :last-child": {
      marginBottom: 0,
    },
    "blockquote cite": {
      ...adjustFontSizeTo(options.baseFontSize),
      color: options.bodyColor,
      fontWeight: options.bodyWeight,
    },
    "blockquote cite:before": {
      content: '"— "',
    },
    [MOBILE_MEDIA_QUERY]: {
      blockquote: {
        marginLeft: rhythm(-3 / 4),
        marginRight: 0,
        paddingLeft: rhythm(9 / 16),
      },
    },
  }),
}

const typography = new Typography(theme)

export default typography
export const rhythm = typography.rhythm