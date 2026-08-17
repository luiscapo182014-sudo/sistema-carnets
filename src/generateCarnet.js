import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import { supabase } from './supabaseClient'

const RED = [200, 30, 40]
const BLACK = [20, 20, 20]
const WHITE = [255, 255, 255]
const GRAY = [90, 90, 90]
const LIGHTGRAY = [230, 230, 230]

export async function generateCarnet(player, teamName, tournamentOverride) {
  let tournament = tournamentOverride

  if (!tournament) {
    const result = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    tournament = result.data
  }

  // Elegir diseño según el torneo
  if (tournament?.id === 2) {
    await renderDesignADN(player, teamName, tournament)
  } else {
    await renderDesignDefault(player, teamName, tournament)
  }
}

// ============ DISEÑO "AMIGOS DEL NORTE" (torneo id 2) ============
async function renderDesignADN(player, teamName, tournament) {
  const W = 81, H = 144
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [W, H] })

  doc.setFillColor(...WHITE)
  doc.rect(0, 0, W, H, 'F')

  doc.setFillColor(...BLACK)
  doc.triangle(0, 0, 34, 0, 0, 34, 'F')
  doc.setFillColor(...RED)
  doc.triangle(0, 10, 44, 0, 0, 44, 'F')
  doc.setFillColor(...WHITE)
  doc.triangle(0, 20, 54, 0, 0, 54, 'F')
  doc.setFillColor(...BLACK)
  doc.rect(0, 0, W, 6, 'F')

  const logoSize = 30
  const logoX = W / 2 - logoSize / 2
  const logoY = 10

  if (tournament?.logo_url) {
    try {
      const logoData = await loadImageAsBase64(tournament.logo_url)
      doc.addImage(logoData, 'PNG', logoX, logoY, logoSize, logoSize)
    } catch (e) {
      console.warn('No se pudo cargar el logo', e)
    }
  }

  const bannerY = 44
  const bannerH = 10
  doc.setFillColor(...RED)
  doc.rect(4, bannerY, W - 8, bannerH, 'F')
  doc.setFillColor(...WHITE)
  doc.triangle(0, bannerY, 4, bannerY, 4, bannerY + bannerH, 'F')
  doc.triangle(0, bannerY + bannerH, 4, bannerY + bannerH, 0, bannerY, 'F')
  doc.triangle(W, bannerY, W - 4, bannerY, W - 4, bannerY + bannerH, 'F')
  doc.triangle(W, bannerY + bannerH, W - 4, bannerY + bannerH, W, bannerY, 'F')

  doc.setTextColor(...WHITE)
  doc.setFontSize(15)
  doc.setFont(undefined, 'bolditalic')
  doc.text('JUGADOR', W / 2, bannerY + 7.2, { align: 'center' })

  const rowY = bannerY + bannerH + 10
  const photoW = 30, photoH = 36
  const photoX = 6

  doc.setDrawColor(...LIGHTGRAY)
  doc.setLineWidth(0.4)
  doc.roundedRect(photoX, rowY, photoW, photoH, 2, 2)

  if (player.photo_url) {
    try {
      const imgData = await loadImageAsBase64(player.photo_url)
      doc.addImage(imgData, 'JPEG', photoX + 0.8, rowY + 0.8, photoW - 1.6, photoH - 1.6)
    } catch (e) {
      console.warn('No se pudo cargar la foto', e)
    }
  }

  const dividerX = photoX + photoW + 5
  doc.setDrawColor(...GRAY)
  doc.setLineWidth(0.2)
  doc.line(dividerX, rowY + 2, dividerX, rowY + photoH - 2)

  const qrSize = 28
  const qrX = W - 6 - qrSize
  const qrY = rowY + (photoH - qrSize) / 2

  doc.setDrawColor(...RED)
  doc.setLineWidth(0.5)
  doc.roundedRect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 2, 2)

  const qrDataUrl = await QRCode.toDataURL(`${window.location.origin}/jugador/${player.short_id}`, {
    color: { dark: '#141414', light: '#ffffff' },
    margin: 0
  })
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

  let y = rowY + photoH + 12
  doc.setFillColor(...RED)
  doc.circle(9, y - 1.5, 2.2, 'F')
  doc.setTextColor(...GRAY)
  doc.setFontSize(8)
  doc.setFont(undefined, 'normal')
  doc.text('EQUIPO', 15, y - 3)
  doc.setTextColor(...BLACK)
  doc.setFontSize(13)
  doc.setFont(undefined, 'bold')
  doc.text((teamName || '-').toUpperCase(), 15, y + 3, { maxWidth: W - 20 })

  doc.setDrawColor(...LIGHTGRAY)
  doc.setLineWidth(0.3)
  doc.line(6, y + 8, W - 6, y + 8)

  y += 18
  doc.setFillColor(...RED)
  doc.circle(9, y - 1.5, 2.2, 'F')
  doc.setTextColor(...GRAY)
  doc.setFontSize(8)
  doc.setFont(undefined, 'normal')
  doc.text('DNI', 15, y - 3)
  doc.setTextColor(...BLACK)
  doc.setFontSize(13)
  doc.setFont(undefined, 'bold')
  doc.text(formatDNI(player.dni), 15, y + 3)

  const footerY = H - 14
  doc.setFillColor(...RED)
  doc.rect(0, footerY, W, 14, 'F')
  doc.setFillColor(...BLACK)
  doc.triangle(0, footerY, 16, footerY, 0, footerY + 14, 'F')
  doc.triangle(W, footerY, W - 16, footerY, W, footerY + 14, 'F')

  const ballR = 4
  doc.setFillColor(...WHITE)
  doc.circle(W / 2, footerY + 7, ballR, 'F')
  doc.setDrawColor(...BLACK)
  doc.setLineWidth(0.3)
  doc.circle(W / 2, footerY + 7, ballR)
  doc.setFillColor(...BLACK)
  doc.circle(W / 2, footerY + 7, 1.1, 'F')

  doc.save(`carnet_${player.first_name}_${player.last_name}.pdf`)
}

// ============ DISEÑO POR DEFECTO (torneo id 1 y otros) ============
async function renderDesignDefault(player, teamName, tournament) {
  const RED2 = [200, 30, 30]
  const BLACK2 = [15, 15, 15]

  const W = 81, H = 144
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [W, H] })

  doc.setFillColor(...BLACK2)
  doc.rect(0, 0, W, H, 'F')

  doc.setFillColor(...RED2)
  doc.triangle(0, 0, W, 0, W, 30, 'F')
  doc.triangle(0, 0, 0, 30, W, 30, 'F')

  const logoSize = 26
  const logoX = W / 2 - logoSize / 2
  const logoY = 6

  doc.setFillColor(...WHITE)
  doc.circle(W / 2, logoY + logoSize / 2, logoSize / 2 + 1.5, 'F')

  if (tournament?.logo_url) {
    try {
      const logoData = await loadImageAsBase64(tournament.logo_url)
      const circularLogo = await makeCircularImage(logoData, 300)
      doc.addImage(circularLogo, 'PNG', logoX, logoY, logoSize, logoSize)
    } catch (e) {
      console.warn('No se pudo cargar el logo', e)
    }
  }

  const bannerY = 36
  doc.setFillColor(...RED2)
  doc.rect(0, bannerY, W, 11, 'F')
  doc.setFillColor(...WHITE)
  doc.rect(0, bannerY, W, 0.6, 'F')
  doc.rect(0, bannerY + 10.4, W, 0.6, 'F')

  doc.setTextColor(...WHITE)
  doc.setFontSize(15)
  doc.setFont(undefined, 'bold')
  doc.text('JUGADOR', W / 2, bannerY + 8, { align: 'center' })

  const rowY = 54
  const photoW = 32, photoH = 38
  const photoX = 6

  doc.setFillColor(30, 30, 30)
  doc.roundedRect(photoX - 1, rowY - 1, photoW + 2, photoH + 2, 2, 2, 'F')
  doc.setFillColor(...WHITE)
  doc.roundedRect(photoX, rowY, photoW, photoH, 1.5, 1.5, 'F')

  if (player.photo_url) {
    try {
      const imgData = await loadImageAsBase64(player.photo_url)
      doc.addImage(imgData, 'JPEG', photoX + 1, rowY + 1, photoW - 2, photoH - 2)
    } catch (e) {
      console.warn('No se pudo cargar la foto', e)
    }
  }

  const qrSize = 32
  const qrX = W - 6 - qrSize
  const qrY = rowY + (photoH - qrSize) / 2

  doc.setFillColor(30, 30, 30)
  doc.roundedRect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 2, 2, 'F')
  doc.setFillColor(...WHITE)
  doc.roundedRect(qrX, qrY, qrSize, qrSize, 1.5, 1.5, 'F')

  const qrDataUrl = await QRCode.toDataURL(`${window.location.origin}/jugador/${player.short_id}`, {
    color: { dark: '#0f0f0f', light: '#ffffff' },
    margin: 0
  })
  doc.addImage(qrDataUrl, 'PNG', qrX + 1.5, qrY + 1.5, qrSize - 3, qrSize - 3)

  let y = rowY + photoH + 12
  doc.setTextColor(...WHITE)
  doc.setFontSize(13)
  doc.setFont(undefined, 'bold')
  doc.text(`${player.first_name} ${player.last_name}`.toUpperCase(), W / 2, y, { align: 'center', maxWidth: W - 10 })

  y += 12
  doc.setFontSize(8)
  doc.setTextColor(140, 140, 140)
  doc.setFont(undefined, 'normal')
  doc.text('EQUIPO', W / 2, y, { align: 'center' })
  y += 6
  doc.setFontSize(12)
  doc.setTextColor(...WHITE)
  doc.setFont(undefined, 'bold')
  doc.text((teamName || '-').toUpperCase(), W / 2, y, { align: 'center', maxWidth: W - 10 })

  y += 10
  doc.setFontSize(8)
  doc.setTextColor(140, 140, 140)
  doc.setFont(undefined, 'normal')
  doc.text('DNI', W / 2, y, { align: 'center' })
  y += 6
  doc.setFontSize(12)
  doc.setTextColor(...WHITE)
  doc.setFont(undefined, 'bold')
  doc.text(formatDNI(player.dni), W / 2, y, { align: 'center' })

  const footerY = H - 22
  doc.setFillColor(...RED2)
  doc.triangle(0, footerY, W, footerY + 8, 0, H, 'F')
  doc.setFillColor(...BLACK2)
  doc.triangle(W, footerY, W, H, 0, H, 'F')

  const ballR = 3.5
  doc.setFillColor(...WHITE)
  doc.circle(W / 2, H - 8, ballR, 'F')
  doc.setDrawColor(...BLACK2)
  doc.setLineWidth(0.3)
  doc.circle(W / 2, H - 8, ballR)
  doc.setFillColor(...BLACK2)
  doc.circle(W / 2, H - 8, 1, 'F')

  doc.save(`carnet_${player.first_name}_${player.last_name}.pdf`)
}

function formatDNI(dni) {
  if (!dni) return '-'
  const clean = String(dni).replace(/\D/g, '')
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function makeCircularImage(base64, size) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      const scale = Math.max(size / img.width, size / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
      resolve(canvas.toDataURL('image/png'))
    }
    img.src = base64
  })
}

function loadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = url
  })
}