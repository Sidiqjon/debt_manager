import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { config } from '../../../config';

interface OTPData {
  otp: string;
  expiresAt: Date;
}

@Injectable()
export class OtpService {
  private otpStorage = new Map<string, OTPData>();
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: false,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    });
  }

  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOTP(email: string, purpose: 'password_reset' | 'verification' = 'password_reset'): Promise<string> {
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); 

    this.otpStorage.set(`${email}_${purpose}`, { otp, expiresAt });

    const subject = purpose === 'password_reset' ? 'Password Reset OTP' : 'Account Verification OTP';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; text-align: center; margin-bottom: 30px;">
            ${purpose === 'password_reset' ? 'Password Reset Request' : 'Account Verification'}
          </h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
            ${purpose === 'password_reset' 
              ? 'You have requested to reset your password. Use the OTP code below to proceed:'
              : 'Please use the OTP code below to verify your account:'
            }
          </p>
          <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; letter-spacing: 5px; margin: 0; font-family: 'Courier New', monospace;">
              ${otp}
            </h1>
          </div>
          <p style="color: #999; font-size: 14px; text-align: center; margin-top: 20px;">
            This OTP will expire in 10 minutes.
          </p>
          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: config.SMTP_FROM ,
      to: email,
      subject: subject,
      html: htmlContent,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return otp;
    } catch (error) {
      throw new Error(`Failed to send OTP email: ${error.message}`);
    }
  }

  verifyOTP(email: string, otp: string, purpose: 'password_reset' | 'verification' = 'password_reset'): boolean {
    const key = `${email}_${purpose}`;
    const storedData = this.otpStorage.get(key);

    if (!storedData) {
      return false;
    }

    if (new Date() > storedData.expiresAt) {
      this.otpStorage.delete(key);
      return false;
    }

    const isValid = storedData.otp === otp;
    if (isValid) {
      this.otpStorage.delete(key);
    }

    return isValid;
  }

  invalidateOTP(email: string, purpose: 'password_reset' | 'verification' = 'password_reset'): void {
    const key = `${email}_${purpose}`;
    this.otpStorage.delete(key);
  }

  isOTPValid(email: string, purpose: 'password_reset' | 'verification' = 'password_reset'): boolean {
    const key = `${email}_${purpose}`;
    const storedData = this.otpStorage.get(key);

    if (!storedData) {
      return false;
    }

    return new Date() <= storedData.expiresAt;
  }
}