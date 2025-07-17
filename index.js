require("dotenv").config();
const { Boom } = require('@hapi/boom');
const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: { level: 'silent' },
    defaultQueryTimeoutMs: undefined
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("connection closed due to ", lastDisconnect.error, ", reconnecting ", shouldReconnect);
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log("✅ Bot is now connected to WhatsApp!");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    const msg = messages[0];

    if (!msg.message) return;
    const sender = msg.key.remoteJid;

    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

    if (text?.toLowerCase() === "hi") {
      await sock.sendMessage(sender, { text: "👋 Hello! Welcome to Blaze Bot." });
    }
  });
}

connectToWhatsApp();
