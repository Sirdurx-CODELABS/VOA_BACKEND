const express = require('express');
const router = express.Router();
const webhook = require('./whatsapp.webhook');

// GET /whatsapp/webhook — Meta verification challenge
router.get('/webhook', webhook.verify);

// POST /whatsapp/webhook — Incoming messages
router.post('/webhook', webhook.receive);

module.exports = router;
