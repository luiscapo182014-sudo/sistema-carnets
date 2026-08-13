import jsPDF from 'jspdf'
import QRCode from 'qrcode'

export async function generateCarnet(player, teamName) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [85, 130] // tamaño tipo carnet, más alto que ancho
  })

  // Fondo
  doc.setFillColor(22, 78, 99)
  doc.rect(0, 0, 85, 25, 'F')

  // Título torneo
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont(undefined, 'bold')
  doc.text('CARNET DE JUGADOR', 42.5, 15, { align: 'center' })

  // Foto (si existe)
  if (player.photo_url) {
    try {
      const imgData = await loadImageAsBase64(player.photo_url)
      doc.addImage(imgData, 'JPEG', 27.5, 30, 30, 30)
    } catch (e) {
      console.warn('No se pudo cargar la foto', e)
    }
  }

  // Datos del jugador
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(13)
  doc.setFont(undefined, 'bold')
  doc.text(`${player.first_name} ${player.last_name}`, 42.5, 68, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.text(teamName || '', 42.5, 75, { align: 'center' })
  doc.text(`N.° ${player.jersey_number || '-'}`, 42.5, 81, { align: 'center' })

  // QR
  const qrDataUrl = await QRCode.toDataURL(`${window.location.origin}/jugador/${player.short_id}`)
  doc.addImage(qrDataUrl, 'PNG', 27.5, 86, 30, 30)

  // ID
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text(`ID: ${player.short_id}`, 42.5, 120, { align: 'center' })

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
      resolve(canvas.toDataURL('image/jpeg'))
    }
    img.onerror = reject
    img.src = url
  })
}