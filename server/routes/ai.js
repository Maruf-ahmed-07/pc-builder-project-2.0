const express = require('express');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Test route to verify mounting
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'AI route is working!' });
});

// POST /api/ai/chat
// Body: { message: string, history?: [{ role: 'user'|'ai', content: string }] }
// Uses Gemini 1.5 Flash (free tier compatible)
router.post('/chat', protect, async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[AI] Missing GEMINI_API_KEY');
      return res.status(500).json({ success: false, message: 'AI not configured' });
    }

    // Build contents for Gemini: map history (limit last 8 turns)
    const limited = history.slice(-8);
    const contents = [];
    limited.forEach(item => {
      if (!item || !item.content) return;
      const role = item.role === 'user' ? 'user' : 'model';
      contents.push({ role, parts: [{ text: item.content.slice(0, 5000) }] });
    });
    contents.push({ role: 'user', parts: [{ text: message.slice(0, 6000) }] });

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('[AI] Upstream error', resp.status, text.slice(0,300));
      return res.status(502).json({ success: false, message: 'AI service error', detail: text.slice(0, 500) });
    }
    const data = await resp.json();
    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';

    res.json({ success: true, reply: aiText });
  } catch (err) {
    console.error('AI chat error', err);
    res.status(500).json({ success: false, message: 'AI request failed' });
  }
});

module.exports = router;
