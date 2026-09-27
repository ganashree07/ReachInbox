import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

let transporter: nodemailer.Transporter | null = null;

export async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  let user = process.env.ETHEREAL_USER;
  let pass = process.env.ETHEREAL_PASS;

  if (!user || !pass) {
    const account = await nodemailer.createTestAccount();
    user = account.user;
    pass = account.pass;
    console.log('📧 Ethereal account created');
    console.log('   User:', user);
    console.log('   Pass:', pass);
    console.log('   → Add these to .env to reuse across restarts');
  }

  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user, pass },
  });

  return transporter;
}
