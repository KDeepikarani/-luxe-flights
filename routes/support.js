const express = require('express');
const router = express.Router();
const Support = require('../models/Support');
const { protect, adminOnly } = require('../middleware/auth');
const nodemailer = require('nodemailer');

function getMailer() {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes('your_')) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
}

async function sendEmail(to, subject, html) {
  const mailer = getMailer();
  if (!mailer) { console.log('📧 Email not configured, skipping:', subject); return false; }
  try {
    await mailer.sendMail({ from: `"Luxe Flights Support" <${process.env.EMAIL_USER}>`, to, subject, html });
    return true;
  } catch (e) { console.error('Email error:', e.message); return false; }
}

// Create support ticket
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, category, message, bookingRef } = req.body;
    if (!name || !email || !subject || !message) return res.status(400).json({ success: false, message: 'Required fields missing' });

    const ticket = await Support.create({
      userId: req.user?._id || null, name, email, phone: phone || '',
      subject, category: category || 'other', bookingRef: bookingRef || '',
      messages: [{ sender: 'user', senderName: name, content: message }]
    });

    // Auto-reply email
    await sendEmail(email, `Support Ticket Received — ${ticket.ticketRef}`,
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#f0f0f5;padding:40px;border-radius:12px">
        <h2 style="color:#c9a84c">Luxe Flights Support</h2>
        <p>Hi ${name}, we've received your support request.</p>
        <div style="background:#1e1e2a;padding:20px;border-radius:8px;margin:20px 0">
          <p><strong>Ticket Ref:</strong> ${ticket.ticketRef}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong> ${message}</p>
        </div>
        <p>Our team will review your query and respond within 24 hours.</p>
        <p style="color:#666">— Luxe Flights Support Team</p>
      </div>`
    );

    res.status(201).json({ success: true, message: 'Ticket created', ticketRef: ticket.ticketRef, ticket });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Get user's tickets
router.get('/my', protect, async (req, res) => {
  try {
    const tickets = await Support.find({ $or: [{ userId: req.user._id }, { email: req.user.email }] }).sort({ updatedAt: -1 });
    res.json({ success: true, tickets });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Add message to ticket
router.post('/:id/message', protect, async (req, res) => {
  try {
    const { message } = req.body;
    const ticket = await Support.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    ticket.messages.push({ sender: 'user', senderName: req.user.name, content: message });
    ticket.status = 'in_progress';
    await ticket.save();
    res.json({ success: true, ticket });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// AI chat response
router.post('/ai-chat', async (req, res) => {
  try {
    const { message, sessionId, history = [] } = req.body;
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('your_')) {
      return res.json({ success: true, message: "Hi! I'm the Luxe Flights AI assistant. I can help with booking questions, refund policies, and flight information. How can I assist you today?" });
    }

    const msgs = [...history, { role: 'user', content: message }];
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 800,
        system: `You are a helpful customer support agent for Luxe Flights, a premium airline booking platform.
Help users with: flight bookings, cancellations, refund policies, baggage queries, check-in, and general travel.
Refund policy: 100% if cancelled 7+ days before, 90% if 3-7 days, 75% if 1-3 days, 50% if within 24 hours, 0% after departure.
Always be warm, professional, and concise. If user wants to escalate, suggest they submit a support ticket.
When you need their email to follow up, ask: "Could you please share your email address so our team can follow up with you?"`,
        messages: msgs
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'AI error');
    res.json({ success: true, message: data.content[0].text });
  } catch (e) {
    res.json({ success: true, message: "I'm here to help! For booking questions, refunds, or any flight-related queries, please ask away. If you need immediate assistance, you can also submit a support ticket and our team will email you back." });
  }
});

// ===== ADMIN ROUTES =====
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};
    const tickets = await Support.find(query).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Support.countDocuments(query);
    const unread = await Support.countDocuments({ adminViewed: false });
    res.json({ success: true, tickets, total, unread });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/admin/:id', protect, adminOnly, async (req, res) => {
  try {
    const ticket = await Support.findByIdAndUpdate(req.params.id, { adminViewed: true }, { new: true });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, ticket });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Admin reply (in-platform + email)
router.post('/admin/:id/reply', protect, adminOnly, async (req, res) => {
  try {
    const { message, sendEmail: doSendEmail } = req.body;
    const ticket = await Support.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    ticket.messages.push({ sender: 'admin', senderName: req.user.name, content: message, isRead: false });
    ticket.status = 'in_progress';
    ticket.adminReplied = true;

    let emailSent = false;
    if (doSendEmail !== false) {
      emailSent = await sendEmail(ticket.email,
        `Re: ${ticket.subject} [${ticket.ticketRef}]`,
        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#f0f0f5;padding:40px;border-radius:12px">
          <h2 style="color:#c9a84c">✈️ Luxe Flights Support</h2>
          <p>Hi ${ticket.name}, our support team has responded to your query.</p>
          <div style="background:#1e1e2a;border-left:4px solid #c9a84c;padding:20px;margin:20px 0;border-radius:0 8px 8px 0">
            <p style="font-size:13px;color:#a0a0b8;margin-bottom:8px">TICKET: ${ticket.ticketRef} | ${ticket.subject}</p>
            <p>${message}</p>
          </div>
          <p style="font-size:13px;color:#666680">You can reply to this email or log in to your account to continue the conversation.</p>
          <p style="color:#c9a84c">— ${req.user.name}, Luxe Flights Support</p>
        </div>`
      );
      if (emailSent) ticket.emailReplySent = true;
    }

    await ticket.save();
    res.json({ success: true, message: emailSent ? 'Reply sent via platform and email' : 'Reply sent via platform', ticket });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/admin/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const ticket = await Support.findByIdAndUpdate(req.params.id, { status: req.body.status, priority: req.body.priority || undefined }, { new: true });
    res.json({ success: true, ticket });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/admin/:id', protect, adminOnly, async (req, res) => {
  try {
    await Support.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Ticket deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
