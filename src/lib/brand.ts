// פלטת צבעי המותג של גולדה — הערכים הרשמיים מתוך golda_color_palette.json
export const BRAND = {
  gold: '#C0A058',      // זהב המותג — לוגו, כותרות, קווי מתאר
  goldDeep: '#8A6E3C',  // זהב כהה לטקסט על רקע בהיר
  paleGold: '#CDBF93',  // זהב משני, מסגרות עדינות
  cream: '#FAF4E9',     // רקע קרם ראשי
  blush: '#EBC7B1',     // בלאש — רקעים רכים, פסים
  sand: '#E6D8C0',      // חול — רקעים, פסים
  tan: '#E6D8C0',       // כינוי ל-sand (שימוש ב-PDF)
  mint: '#D8E7DD',      // מנטה — רקע רך, סטטוסים
  burgundy: '#5E2A33',  // בורדו עשיר — אקצנט, CTA, סרגל צד
  maroon: '#5E2A33',    // כינוי ל-burgundy (שימוש ב-PDF)
  maroonDark: '#48202A',
  magenta: '#2F4634',   // ירוק עמוק — נקודת הדגשה (במשורה)
  green: '#4A6B41',     // סייג' — הצלחה / חיובי
  white: '#FFFFFF',
  ink: '#33262B',       // טקסט גוף כהה
  muted: '#90817B',     // טקסט משני
  gray: '#90817B',      // כינוי ל-muted (שימוש ב-PDF)
  line: '#ECE2D2',      // קווי הפרדה עדינים
} as const

// סדר הפסים האנכיים של המותג (מוטיב חוזר על האריזות) — נדגם מ-stripes.svg
export const BRAND_STRIPES = [
  '#EBC7B1', // blush
  '#E6D8C0', // sand
  '#C0A058', // gold
  '#D8E7DD', // mint
  '#2F4634', // ירוק עמוק
  '#5E2A33', // burgundy
  '#CDBF93', // pale gold
  '#CFA5B2', // dusty rose
  '#FAF4E9', // cream
] as const

export const BRAND_TAGLINE = 'WE MAKE FABULOUS GELATO'
export const BRAND_TAGLINE_FULL = 'WE MAKE FABULOUS GELATO SINCE 2012'
