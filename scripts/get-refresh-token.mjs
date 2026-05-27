import { google } from 'googleapis'
import http from 'node:http'
import { URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const PORT = 3001
const REDIRECT_URI = `http://localhost:${PORT}`

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ חסרים GOOGLE_CLIENT_ID או GOOGLE_CLIENT_SECRET ב-.env.local')
  process.exit(1)
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/calendar'],
})

console.log('\n📋 פתח את הלינק הזה בדפדפן והתחבר עם ron@digim.co.il:\n')
console.log(authUrl)
console.log('\n⏳ ממתין לאישור...\n')

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url, `http://localhost:${PORT}`)
    const code = reqUrl.searchParams.get('code')
    const error = reqUrl.searchParams.get('error')

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(`<h1>שגיאה: ${error}</h1>`)
      console.error('❌ שגיאה:', error)
      server.close()
      process.exit(1)
    }

    if (!code) {
      res.end('Waiting for authorization...')
      return
    }

    const { tokens } = await oauth2Client.getToken(code)
    const refreshToken = tokens.refresh_token

    if (!refreshToken) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end('<h1>לא התקבל Refresh Token. נסה שוב.</h1>')
      console.error('❌ לא התקבל Refresh Token')
      server.close()
      process.exit(1)
    }

    // עדכן את .env.local
    const envPath = path.join(process.cwd(), '.env.local')
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const updated = envContent.replace(
      /GOOGLE_REFRESH_TOKEN=.*/,
      `GOOGLE_REFRESH_TOKEN=${refreshToken}`,
    )
    fs.writeFileSync(envPath, updated)

    console.log('\n✅ הצלחה! Refresh Token נשמר ב-.env.local')
    console.log('\n🔑 Refresh Token:', refreshToken, '\n')

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`
      <html dir="rtl">
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1 style="color: green;">✅ הצלחה!</h1>
          <p>Refresh Token נשמר ב-.env.local</p>
          <p>אפשר לסגור את החלון ולחזור לטרמינל.</p>
        </body>
      </html>
    `)

    setTimeout(() => {
      server.close()
      process.exit(0)
    }, 1000)
  } catch (err) {
    console.error('❌ שגיאה:', err.message)
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`<h1>שגיאה: ${err.message}</h1>`)
    server.close()
    process.exit(1)
  }
})

server.listen(PORT, () => {
  console.log(`🌐 שרת מקומי פועל על ${REDIRECT_URI}`)
})
