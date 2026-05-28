// פלטת צבעי המותג של גולדה — נדגמה מספר המותג הרשמי
export const BRAND = {
  gold: '#84764F',      // Pantone 871 C — לוגו, דקל, כותרות
  olive: '#B0A97D',     // Pantone 452 C — זהב משני
  peach: '#E7B9A9',     // Pantone 7415 C — רקעים, פסים
  tan: '#DDC8B7',       // Pantone 482 C — פסים
  mint: '#D0E1D7',      // Pantone 621 C — רקע רך
  maroon: '#5C2A2B',    // Pantone 490 C — טקסט וכותרות
  magenta: '#C82FBF',   // Real Purple C — הדגשות
  green: '#44D62D',     // Pantone 802 C — הדגשות
  cream: '#F5F0E8',     // רקע קרם
  white: '#FFFFFF',
  ink: '#3A2E2E',       // טקסט גוף כהה
  gray: '#8A7F7A',      // טקסט משני
} as const

// סדר הפסים האנכיים של המותג (מוטיב חוזר על האריזות)
export const BRAND_STRIPES = [
  BRAND.peach,
  BRAND.tan,
  BRAND.gold,
  BRAND.magenta,
  BRAND.mint,
  BRAND.maroon,
  BRAND.peach,
  BRAND.olive,
]

export const BRAND_TAGLINE = 'WE MAKE FABULOUS GELATO SINCE 2012'
