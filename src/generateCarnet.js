import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import { supabase } from './supabaseClient'

const RED = [200, 30, 30]
const BLACK = [15, 15, 15]
const WHITE = [255, 255, 255]
const GRAY = [140, 140, 140]

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

  const W = 81, H = 144
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [W, H] })

  // ---------- FONDO GENERAL ----------
  doc.setFillColor(...BLACK)
  doc.rect(0, 0, W, H, 'F')

  // Franja diagonal roja de fondo (detrás del logo)
  doc.setFillColor(...RED)
  doc.triangle(0, 0, W, 0, W, 30, 'F')
  doc.triangle(0, 0, 0, 30, W, 30, 'F')

  // ---------- LOGO ----------
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

  // ---------- BANNER "JUGADOR" ----------
  const bannerY = 36
  doc.setFillColor(...RED)
  doc.rect(0, bannerY, W, 11, 'F')
  doc.setFillColor(...WHITE)
  doc.rect(0, bannerY, W, 0.6, 'F')
  doc.rect(0, bannerY + 10.4, W, 0.6, 'F')

  doc.setTextColor(...WHITE)
  doc.setFontSize(15)
  doc.setFont(undefined, 'bold')
  doc.text('JUGADOR', W / 2, bannerY + 8, { align: 'center' })

  // ---------- FOTO + QR ----------
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

  // ---------- NOMBRE DEL JUGADOR ----------
  let y = rowY + photoH + 12
  doc.setTextColor(...WHITE)
  doc.setFontSize(13)
  doc.setFont(undefined, 'bold')
  doc.text(`${player.first_name} ${player.last_name}`.toUpperCase(), W / 2, y, { align: 'center', maxWidth: W - 10 })

  // ---------- EQUIPO ----------
  y += 12
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.setFont(undefined, 'normal')
  doc.text('EQUIPO', W / 2, y, { align: 'center' })
  y += 6
  doc.setFontSize(12)
  doc.setTextColor(...WHITE)
  doc.setFont(undefined, 'bold')
  doc.text((teamName || '-').toUpperCase(), W / 2, y, { align: 'center', maxWidth: W - 10 })

  // ---------- DNI ----------
  y += 10
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.setFont(undefined, 'normal')
  doc.text('DNI', W / 2, y, { align: 'center' })
  y += 6
  doc.setFontSize(12)
  doc.setTextColor(...WHITE)
  doc.setFont(undefined, 'bold')
  doc.text(formatDNI(player.dni), W / 2, y, { align: 'center' })

  // ---------- FOOTER DEPORTIVO ----------
  const footerY = H - 22
  doc.setFillColor(...RED)
  doc.triangle(0, footerY, W, footerY + 8, 0, H, 'F')
  doc.setFillColor(...BLACK)
  doc.triangle(W, footerY, W, H, 0, H, 'F')

  // Balón simplificado
  const ballR = 3.5
  const ballX = W / 2
  const ballY = H - 8
  doc.setFillColor(...WHITE)
  doc.circle(ballX, ballY, ballR, 'F')
  doc.setDrawColor(...BLACK)
  doc.setLineWidth(0.3)
  doc.circle(ballX, ballY, ballR)
  doc.setFillColor(...BLACK)
  doc.circle(ballX, ballY, 1, 'F')

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