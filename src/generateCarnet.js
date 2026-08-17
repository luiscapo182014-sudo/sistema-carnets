import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import { supabase } from './supabaseClient'

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
  const CW = 1080, CH = 1920

  const canvas = document.createElement('canvas')
  canvas.width = CW
  canvas.height = CH
  const ctx = canvas.getContext('2d')

  // 1. Plantilla de fondo
  const template = await loadImg(tournament.carnet_template_url)
  ctx.drawImage(template, 0, 0, CW, CH)

  // 2. Logo del torneo (arriba)
  if (tournament.logo_url) {
    try {
      const logo = await loadImg(tournament.logo_url)
      ctx.drawImage(logo, 340, 150, 400, 400)
    } catch (e) {
      console.warn('No se pudo cargar el logo', e)
    }
  }

  // 3. Foto del jugador (cover, recortada al marco)
  if (player.photo_url) {
    try {
      const photo = await loadImg(player.photo_url)
      drawImageCover(ctx, photo, 150, 880, 360, 460)
    } catch (e) {
      console.warn('No se pudo cargar la foto', e)
    }
  }

  // 4. QR
  const qrDataUrl = await QRCode.toDataURL(`${window.location.origin}/jugador/${player.short_id}`, {
    color: { dark: '#141414', light: '#ffffff' },
    margin: 0
  })
  const qrImg = await loadImg(qrDataUrl)
  ctx.drawImage(qrImg, 580, 930, 360, 360)

  // 5. Textos
  ctx.fillStyle = '#000000'
  ctx.textBaseline = 'alphabetic'

  ctx.font = 'bold 30px Arial'
  ctx.fillText('EQUIPO', 280, 1420)

  ctx.font = 'bold 55px Arial'
  ctx.fillText((teamName || '-').toUpperCase(), 280, 1480)

  ctx.font = 'bold 30px Arial'
  ctx.fillText('DNI', 280, 1560)

  ctx.font = 'bold 55px Arial'
  ctx.fillText(formatDNI(player.dni), 280, 1620)

  // 6. Convertir canvas a PDF
  const imgData = canvas.toDataURL('image/png')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'px', format: [CW, CH] })
  doc.addImage(imgData, 'PNG', 0, 0, CW, CH)
  doc.save(`carnet_${player.first_name}_${player.last_name}.pdf`)
}

// Dibuja una imagen "cover" (recorta para llenar el rectángulo sin deformar)
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
      const img = await loadImg(player.photo_url)
      const c = document.createElement('canvas')
      c.width = img.width; c.height = img.height
      c.getContext('2d').drawImage(img, 0, 0)
      doc.addImage(c.toDataURL('image/png'), 'PNG', photoX + 1, rowY + 1, photoW - 2, photoH - 2)
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