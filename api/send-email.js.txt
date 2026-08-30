export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const { to, booking } = req.body || {};

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    res.status(400).json({ error: 'Email no válido' });
    return;
  }
  if (!booking) {
    res.status(400).json({ error: 'Faltan datos de la reserva' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Falta configurar RESEND_API_KEY en el servidor' });
    return;
  }

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#2A1B12;">La Barbería — Cita confirmada</h2>
      <p>Hola ${booking.name || ''},</p>
      <p>Tu cita ha quedado confirmada con estos datos:</p>
      <table style="width:100%; border-collapse: collapse;">
        <tr><td style="padding:4px 0; color:#555;">Servicio</td><td style="padding:4px 0; text-align:right;"><strong>${booking.service_name || ''}</strong></td></tr>
        <tr><td style="padding:4px 0; color:#555;">Fecha</td><td style="padding:4px 0; text-align:right;"><strong>${booking.date_label || ''}</strong></td></tr>
        <tr><td style="padding:4px 0; color:#555;">Hora</td><td style="padding:4px 0; text-align:right;"><strong>${booking.time_label || ''}</strong></td></tr>
        <tr><td style="padding:4px 0; color:#555;">Precio</td><td style="padding:4px 0; text-align:right;"><strong>${booking.price || ''}€</strong></td></tr>
      </table>
      <p style="margin-top:20px; color:#777; font-size:13px;">Si necesitas cambiar la cita, contáctanos por WhatsApp o por Instagram (@labarberia.breda).</p>
    </div>
  `;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'La Barbería <onboarding@resend.dev>',
        to: [to],
        subject: `Confirmación de tu cita — ${booking.service_name || ''}`,
        html,
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      res.status(r.status).json({ error: data.message || 'Error al enviar el email' });
      return;
    }
    res.status(200).json({ ok: true, id: data.id });
  } catch (err) {
    res.status(500).json({ error: 'Error de conexión con el servicio de email' });
  }
}