import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { totp } from 'otplib';
import { config } from '../../../config';

@Injectable()
export class OtpService {
  private transporter: nodemailer.Transporter;
  private OTPSECRET = config.OTPSECRET 

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

    totp.options = { step: 1800, digits: 6 };
  }

  generateOTP(email: string): string {
    return totp.generate(`${this.OTPSECRET}${email}`);
  }

  async sendOTP(email: string): Promise<string> {
    const otp = this.generateOTP(email);

    const subject = 'Password Reset OTP';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; text-align: center; margin-bottom: 30px;">
            Password Reset Request
          </h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
            You have requested to reset your password. Use the OTP code below to proceed:
          </p>
          <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; letter-spacing: 5px; margin: 0; font-family: 'Courier New', monospace;">
              ${otp}
            </h1>
          </div>
          <p style="color: #999; font-size: 14px; text-align: center; margin-top: 20px;">
            This OTP will expire in 30 minutes.
          </p>
          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: config.SMTP_FROM,
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

  verifyOTP(email: string, otp: string): boolean {
    return totp.verify({ token: otp, secret: `${this.OTPSECRET}${email}` });
  }
}