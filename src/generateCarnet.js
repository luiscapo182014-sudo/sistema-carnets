import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import { supabase } from './supabaseClient'

// Tamaño real de credencial (formato ID-1, tipo tarjeta de crédito/DNI), vertical
const PDF_W = 54  // mm
const PDF_H = 86  // mm

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

  if (tournament?.id === 2 && tournament?.carnet_template_url) {
    await renderFromTemplate(player, teamName, tournament)
  } else {
    await renderDesignDefault(player, teamName, tournament)
  }
}

// ============ DISEÑO CON PLANTILLA (Canvas) ============
async function renderFromTemplate(player, teamName, tournament) {
  // Mantenemos alta resolución en el canvas para que el PNG no salga pixelado
  // al escalarlo al tamaño real de la credencial (54x86mm)
  const CW = 1080
  const CH = Math.round(CW * (PDF_H / PDF_W)) // proporción exacta 54:86

  const canvas = document.createElement('canvas')
  canvas.width = CW
  canvas.height = CH
  const ctx = canvas.getContext('2d')

  const template = await loadImg(tournament.carnet_template_url)
  ctx.drawImage(template, 0, 0, CW, CH)

  if (tournament.logo_url) {
    try {
      const logo = await loadImg(tournament.logo_url)
      ctx.drawImage(logo, 340, 150, 400, 400)
    } catch (e) {
      console.warn('No se pudo cargar el logo', e)
    }
  }

  if (player.photo_url) {
    try {
      const photo = await loadImg(player.photo_url)
      drawImageCover(ctx, photo, 150, 880, 360, 460)
    } catch (e) {
      console.warn('No se pudo cargar la foto', e)
    }
  }

  const qrDataUrl = await QRCode.toDataURL(`${window.location.origin}/jugador/${player.short_id}`, {
    color: { dark: '#141414', light: '#ffffff' },
    margin: 0
  })
  const qrImg = await loadImg(qrDataUrl)
  ctx.drawImage(qrImg, 580, 930, 360, 360)

  // Íconos + Textos
  ctx.textBaseline = 'alphabetic'

  drawTeamIconCanvas(ctx, 220, 1330)

  ctx.font = 'bold 28px Arial'
  drawTextWithOutline(ctx, 'EQUIPO', 280, 1340, '#ffffff', '#000000', 3)

  ctx.font = '900 50px Arial'
  drawTextWithOutline(ctx, (teamName || '-').toUpperCase(), 280, 1400, '#ffffff', '#000000', 5)

  drawIdIconCanvas(ctx, 220, 1460)

  ctx.font = 'bold 28px Arial'
  drawTextWithOutline(ctx, 'DNI', 280, 1470, '#ffffff', '#000000', 3)

  ctx.font = '900 50px Arial'
  drawTextWithOutline(ctx, formatDNI(player.dni), 280, 1530, '#ffffff', '#000000', 5)

  const imgData = canvas.toDataURL('image/png')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PDF_W, PDF_H] })
  doc.addImage(imgData, 'PNG', 0, 0, PDF_W, PDF_H)
  doc.save(`carnet_${player.first_name}_${player.last_name}.pdf`)
}

// Dibuja texto con contorno para que sea legible sobre cualquier fondo (claro u oscuro)
function drawTextWithOutline(ctx, text, x, y, fillColor = '#ffffff', strokeColor = '#000000', lineWidth = 4) {
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2
  ctx.lineWidth = lineWidth
  ctx.strokeStyle = strokeColor
  ctx.strokeText(text, x, y)
  ctx.fillStyle = fillColor
  ctx.fillText(text, x, y)
}

function drawTeamIconCanvas(ctx, x, y) {
  ctx.strokeStyle = '#c81e28'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(x - 12, y, 10, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x + 12, y, 10, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y - 10, 11, 0, Math.PI * 2)
  ctx.stroke()
}

function drawIdIconCanvas(ctx, x, y) {
  ctx.strokeStyle = '#c81e28'
  ctx.lineWidth = 4
  ctx.strokeRect(x - 22, y - 22, 44, 44)
  ctx.beginPath()
  ctx.arc(x, y - 6, 8, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 12, y + 12)
  ctx.lineTo(x + 12, y + 12)
  ctx.stroke()
}

function drawImageCover(ctx, img, x, y, w, h) {
  const imgRatio = img.width / img.height
  const boxRatio = w / h
  let sx, sy, sw, sh

  if (imgRatio > boxRatio) {
    sh = img.height
    sw = sh * boxRatio
    sx = (img.width - sw) / 2
    sy = 0
  } else {
    sw = img.width
    sh = sw / boxRatio
    sx = 0
    sy = (img.height - sh) / 2
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function loadImg(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

// ============ DISEÑO POR DEFECTO (otros torneos, sin plantilla) ============
async function renderDesignDefault(player, teamName, tournament) {
  const RED2 = [200, 30, 30]
  const BLACK2 = [15, 15, 15]
  const WHITE = [255, 255, 255]

  // Tamaño real de credencial
  const W = PDF_W, H = PDF_H
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [W, H] })

  doc.setFillColor(...BLACK2)
  doc.rect(0, 0, W, H, 'F')

  doc.setFillColor(...RED2)
  doc.triangle(0, 0, W, 0, W, 18, 'F')
  doc.triangle(0, 0, 0, 18, W, 18, 'F')

  const logoSize = 15
  const logoX = W / 2 - logoSize / 2
  const logoY = 4

  doc.setFillColor(...WHITE)
  doc.circle(W / 2, logoY + logoSize / 2, logoSize / 2 + 1, 'F')

  if (tournament?.logo_url) {
    try {
      const img = await loadImg(tournament.logo_url)
      const c = document.createElement('canvas')
      c.width = 300; c.height = 300
      const cctx = c.getContext('2d')
      cctx.beginPath()
      cctx.arc(150, 150, 150, 0, Math.PI * 2)
      cctx.closePath()
      cctx.clip()
      const scale = Math.max(300 / img.width, 300 / img.height)
      const w = img.width * scale, h = img.height * scale
      cctx.drawImage(img, (300 - w) / 2, (300 - h) / 2, w, h)
      doc.addImage(c.toDataURL('image/png'), 'PNG', logoX, logoY, logoSize, logoSize)
    } catch (e) {
      console.warn('No se pudo cargar el logo', e)
    }
  }

  const bannerY = 21
  doc.setFillColor(...RED2)
  doc.rect(0, bannerY, W, 7, 'F')
  doc.setFillColor(...WHITE)
  doc.rect(0, bannerY, W, 0.4, 'F')
  doc.rect(0, bannerY + 6.6, W, 0.4, 'F')

  doc.setTextColor(...WHITE)
  doc.setFontSize(9)
  doc.setFont(undefined, 'bold')
  doc.text('JUGADOR', W / 2, bannerY + 5, { align: 'center' })

  const rowY = 32
  const photoW = 19, photoH = 23
  const photoX = 4

  doc.setFillColor(30, 30, 30)
  doc.roundedRect(photoX - 0.6, rowY - 0.6, photoW + 1.2, photoH + 1.2, 1.2, 1.2, 'F')
  doc.setFillColor(...WHITE)
  doc.roundedRect(photoX, rowY, photoW, photoH, 1, 1, 'F')

  if (player.photo_url) {
    try {
      const img = await loadImg(player.photo_url)
      const c = document.createElement('canvas')
      c.width = img.width; c.height = img.height
      c.getContext('2d').drawImage(img, 0, 0)
      doc.addImage(c.toDataURL('image/png'), 'PNG', photoX + 0.6, rowY + 0.6, photoW - 1.2, photoH - 1.2)
    } catch (e) {
      console.warn('No se pudo cargar la foto', e)
    }
  }

  const qrSize = 19
  const qrX = W - 4 - qrSize
  const qrY = rowY + (photoH - qrSize) / 2

  doc.setFillColor(30, 30, 30)
  doc.roundedRect(qrX - 0.6, qrY - 0.6, qrSize + 1.2, qrSize + 1.2, 1.2, 1.2, 'F')
  doc.setFillColor(...WHITE)
  doc.roundedRect(qrX, qrY, qrSize, qrSize, 1, 1, 'F')

  const qrDataUrl = await QRCode.toDataURL(`${window.location.origin}/jugador/${player.short_id}`, {
    color: { dark: '#0f0f0f', light: '#ffffff' },
    margin: 0
  })
  doc.addImage(qrDataUrl, 'PNG', qrX + 1, qrY + 1, qrSize - 2, qrSize - 2)

  let y = rowY + photoH + 7
  doc.setTextColor(...WHITE)
  doc.setFontSize(8.5)
  doc.setFont(undefined, 'bold')
  doc.text(`${player.first_name} ${player.last_name}`.toUpperCase(), W / 2, y, { align: 'center', maxWidth: W - 6 })

  y += 7
  doc.setFontSize(5.5)
  doc.setTextColor(140, 140, 140)
  doc.setFont(undefined, 'normal')
  doc.text('EQUIPO', W / 2, y, { align: 'center' })
  y += 4
  doc.setFontSize(7.5)
  doc.setTextColor(...WHITE)
  doc.setFont(undefined, 'bold')
  doc.text((teamName || '-').toUpperCase(), W / 2, y, { align: 'center', maxWidth: W - 6 })

  y += 6
  doc.setFontSize(5.5)
  doc.setTextColor(140, 140, 140)
  doc.setFont(undefined, 'normal')
  doc.text('DNI', W / 2, y, { align: 'center' })
  y += 4
  doc.setFontSize(7.5)
  doc.setTextColor(...WHITE)
  doc.setFont(undefined, 'bold')
  doc.text(formatDNI(player.dni), W / 2, y, { align: 'center' })

  const footerY = H - 13
  doc.setFillColor(...RED2)
  doc.triangle(0, footerY, W, footerY + 5, 0, H, 'F')
  doc.setFillColor(...BLACK2)
  doc.triangle(W, footerY, W, H, 0, H, 'F')

  const ballR = 2.2
  doc.setFillColor(...WHITE)
  doc.circle(W / 2, H - 5, ballR, 'F')
  doc.setDrawColor(...BLACK2)
  doc.setLineWidth(0.2)
  doc.circle(W / 2, H - 5, ballR)
  doc.setFillColor(...BLACK2)
  doc.circle(W / 2, H - 5, 0.6, 'F')

  doc.save(`carnet_${player.first_name}_${player.last_name}.pdf`)
}

function formatDNI(dni) {
  if (!dni) return '-'
  const clean = String(dni).replace(/\D/g, '')
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}