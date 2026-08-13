import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import { supabase } from './supabaseClient'

export async function generateCarnet(player, teamName) {
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [85, 135]
  })

  // Fondo degradado simulado con rectángulos
  doc.setFillColor(15, 23, 42) // azul oscuro
  doc.rect(0, 0, 85, 135, 'F')

  doc.setFillColor(255, 255, 255)
  doc.roundedRect(4, 30, 77, 101, 4, 4, 'F')

  // Header con logo del torneo
  if (tournament?.logo_url) {
    try {
      const logoData = await loadImageAsBase64(tournament.logo_url)
      doc.addImage(logoData, 'PNG', 32.5, 6, 20, 20)
    } catch (e) {
      console.warn('No se pudo cargar el logo', e)
    }
  }

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont(undefined, 'bold')
  doc.text((tournament?.name || 'TORNEO').toUpperCase(), 42.5, 27, { align: 'center' })

  // Foto del jugador (círculo simulado con recorte cuadrado, jsPDF no recorta circular nativo)
  if (player.photo_url) {
    try {
      const imgData = await loadImageAsBase64(player.photo_url)
      doc.addImage(imgData, 'JPEG', 27.5, 36, 30, 30)
      doc.setDrawColor(15, 23, 42)
      doc.setLineWidth(0.8)
      doc.rect(27.5, 36, 30, 30)
    } catch (e) {
      console.warn('No se pudo cargar la foto', e)
    }
  }

  // Datos del jugador
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(13)
  doc.setFont(undefined, 'bold')
  doc.text(`${player.first_name} ${player.last_name}`, 42.5, 74, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text(teamName || '', 42.5, 80, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(`N.° ${player.jersey_number || '-'}`, 42.5, 87, { align: 'center' })

  // Línea separadora
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(14, 93, 71, 93)

  // QR
  const qrDataUrl = await QRCode.toDataURL(`${window.location.origin}/jugador/${player.short_id}`, {
    color: { dark: '#0f172a', light: '#ffffff' }
  })
  doc.addImage(qrDataUrl, 'PNG', 27.5, 97, 30, 30)

  // ID
  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.text(`ID: ${player.short_id}`, 42.5, 130, { align: 'center' })

  doc.save(`carnet_${player.first_name}_${player.last_name}.pdf`)
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