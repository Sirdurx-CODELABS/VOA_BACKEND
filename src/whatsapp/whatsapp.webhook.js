/**
 * WhatsAppWebhook — Meta Cloud API webhook receiver.
 *
 * GET  /whatsapp/webhook  — Verification challenge (Meta calls this on setup)
 * POST /whatsapp/webhook  — Incoming messages
 *
 * All incoming messages are parsed and dispatched to the message handler.
 */

const logger = require('../utils/logger');
const whatsappService = require('./whatsapp.service');
const messageHandler = require('./message.handler');
const session = require('./whatsapp.session');

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'voa_health_verify_2024';

/**
 * GET — Webhook verification.
 * Meta sends hub.mode, hub.verify_token, hub.challenge.
 * We must respond with hub.challenge if verify_token matches.
 */
exports.verify = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified successfully');
    return res.type('text/plain').status(200).send(String(challenge));
  }

  logger.warn(`WhatsApp verify failed: mode=${mode} token=${token}`);
  return res.status(403).send('Verification failed');
};

/**
 * POST — Incoming messages from WhatsApp.
 */
exports.receive = async (req, res) => {
  // Always respond 200 immediately to prevent Meta retries
  res.status(200).json({ success: true });

  try {
    const body = req.body;

    // Validate webhook event
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;

        if (value.messaging_product !== 'whatsapp') continue;

        for (const msg of value.messages || []) {
          await handleIncomingMessage(msg, value.contacts?.[0]);
        }
      }
    }
  } catch (err) {
    logger.error(`WhatsApp webhook error: ${err.message}`);
  }
};

/**
 * Parse an incoming message and dispatch to the appropriate handler.
 */
async function handleIncomingMessage(msg, contact) {
  const from = msg.from; // phone number
  const msgId = msg.id;
  const msgType = msg.type;

  // Mark as read
  whatsappService.markRead(msgId).catch(() => {});

  // Extract message text or interactive reply
  let text = '';
  let interactiveId = null;

  switch (msgType) {
    case 'text':
      text = (msg.text?.body || '').trim();
      break;

    case 'interactive':
      if (msg.interactive?.type === 'button_reply') {
        interactiveId = msg.interactive.button_reply.id;
        text = msg.interactive.button_reply.title;
      } else if (msg.interactive?.type === 'list_reply') {
        interactiveId = msg.interactive.list_reply.id;
        text = msg.interactive.list_reply.title;
      }
      break;

    case 'button':
      text = msg.button?.text || '';
      interactiveId = msg.button?.payload || '';
      break;

    case 'location':
      text = `lat:${msg.location.latitude},lng:${msg.location.longitude}`;
      break;

    default:
      text = '';
  }

  if (!text && !interactiveId) return;

  // Build contact info
  const contactName = contact?.profile?.name || from;

  // Dispatch to handler
  try {
    await messageHandler.handle(from, contactName, text, interactiveId, msgType);
  } catch (err) {
    logger.error(`Message handler error for ${from}: ${err.message}`);
    try {
      await whatsappService.sendText(from, 'Sorry, I ran into an issue. Please try again.');
    } catch {}
  }
}
