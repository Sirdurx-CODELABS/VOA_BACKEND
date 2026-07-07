/**
 * WhatsAppService — Sends messages via Meta Cloud API.
 * Handles text, interactive buttons, lists, and media messages.
 */

const logger = require('../utils/logger');

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

class WhatsAppService {
  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.enabled = !!(this.phoneNumberId && this.accessToken);
  }

  /**
   * Low-level POST to Meta API.
   */
  async send(recipient, payload) {
    if (!this.enabled) {
      logger.warn(`WhatsApp disabled: cannot send to ${recipient}`);
      return null;
    }
    const url = `${BASE_URL}/${this.phoneNumberId}/messages`;
    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      ...payload,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      logger.error(`WhatsApp API error (${response.status}): ${err}`);
      throw new Error(`WhatsApp API error: ${err}`);
    }

    return response.json();
  }

  /**
   * Send a plain text message.
   */
  async sendText(to, text) {
    const parts = this.chunkText(text, 4096);
    for (const part of parts) {
      await this.send(to, {
        type: 'text',
        text: { preview_url: false, body: part },
      });
    }
  }

  /**
   * Send interactive buttons (max 3 per group, can send multiple groups).
   */
  async sendButtons(to, header, bodyText, buttons, footer) {
    const maxPerGroup = 3;
    for (let i = 0; i < buttons.length; i += maxPerGroup) {
      const group = buttons.slice(i, i + maxPerGroup);
      await this.send(to, {
        type: 'interactive',
        interactive: {
          type: 'button',
          header: header ? { type: 'text', text: header } : undefined,
          body: { text: bodyText },
          footer: footer ? { text: footer } : undefined,
          action: {
            buttons: group.map((b, idx) => ({
              type: 'reply',
              reply: { id: b.id || `btn_${i + idx}`, title: b.title.slice(0, 20) },
            })),
          },
        },
      });
    }
  }

  /**
   * Send a list (for selecting from many options).
   */
  async sendList(to, header, bodyText, sections, footer) {
    const maxRows = 10;
    const flatRows = sections.flatMap(s => s.rows);
    if (flatRows.length <= maxRows) {
      await this.send(to, {
        type: 'interactive',
        interactive: {
          type: 'list',
          header: header ? { type: 'text', text: header } : undefined,
          body: { text: bodyText },
          footer: footer ? { text: footer } : undefined,
          action: {
            button: 'Select option',
            sections,
          },
        },
      });
    } else {
      // Split into multiple list messages
      for (let i = 0; i < sections.length; i++) {
        await this.send(to, {
          type: 'interactive',
          interactive: {
            type: 'list',
            body: { text: `${bodyText}\n(${i + 1}/${sections.length})` },
            action: {
              button: 'Select option',
              sections: [sections[i]],
            },
          },
        });
      }
    }
  }

  /**
   * Mark a message as read.
   */
  async markRead(messageId) {
    if (!this.enabled) return;
    try {
      await fetch(`${BASE_URL}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      });
    } catch { /* non-critical */ }
  }

  /**
   * Send typing indicator (useful for delays).
   */
  async sendTyping(to) {
    if (!this.enabled) return;
    try {
      await fetch(`${BASE_URL}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { body: '⏳' },
        }),
      });
    } catch { /* non-critical */ }
  }

  /**
   * Send a "quick reply" style menu (text + buttons for menu items).
   */
  async sendMenu(to, header, items) {
    const buttons = items.map((item, i) => ({
      id: item.id || `menu_${i}`,
      title: `${i + 1}️⃣ ${item.label}`.slice(0, 20),
    }));
    await this.sendButtons(to, header, 'Choose an option:', buttons, 'VOA Health Assistant');
  }

  /**
   * Send a location request (placeholder — sends a text prompt).
   */
  async requestLocation(to) {
    await this.sendText(to, '📍 Please share your location or tell me your state and LGA.');
  }

  /**
   * Split long text into WhatsApp-compatible chunks (4096 char limit).
   */
  chunkText(text, maxLen) {
    if (text.length <= maxLen) return [text];
    const parts = [];
    let remaining = text;
    while (remaining.length > 0) {
      let chunk = remaining.slice(0, maxLen);
      // Try to break at a sentence boundary
      const breakAt = chunk.lastIndexOf('. ');
      if (breakAt > maxLen * 0.5) chunk = chunk.slice(0, breakAt + 1);
      parts.push(chunk);
      remaining = remaining.slice(chunk.length).trim();
    }
    return parts;
  }
}

module.exports = new WhatsAppService();
