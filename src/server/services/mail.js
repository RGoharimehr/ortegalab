'use strict';

const nodemailer = require('nodemailer');

function createMailService(config, logger = console) {
  const smtp = config.smtp;
  const mailer = smtp.host
    ? nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        ...(smtp.user ? { auth: { user: smtp.user, pass: smtp.pass } } : {}),
      })
    : null;
  function sendMail(to, subject, text) {
    if (!mailer) return;
    mailer.sendMail({ from: smtp.from, to, subject, text }).catch((error) => {
      logger.warn('[email] send failed:', error.message);
    });
  }
  return { mailer, sendMail, close: () => mailer?.close() };
}

module.exports = { createMailService };
