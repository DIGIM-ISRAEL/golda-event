import nodemailer from 'nodemailer'

function getTransporter() {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    return null
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendEmail(params: {
  to: string | string[]
  subject: string
  html: string
  text?: string
}): Promise<boolean> {
  const transporter = getTransporter()
  if (!transporter) {
    console.warn('SMTP not configured - email skipped')
    return false
  }

  try {
    await transporter.sendMail({
      from: `"גולדה אירועים" <${process.env.SMTP_USER}>`,
      to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    })
    return true
  } catch (err) {
    console.error('Email send failed:', err)
    return false
  }
}
