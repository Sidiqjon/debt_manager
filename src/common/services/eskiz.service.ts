import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { config } from '../../config';

@Injectable()
export class EskizService {
  private token: string | null = null;
  private baseUrl = config.ESKIZ_BASE_URL;
  private email = config.ESKIZ_EMAIL;
  private password = config.ESKIZ_PASSWORD;

  constructor() {
    this.auth();
  }

  async auth() {
    try {
      const { data: response } = await axios.post(`${this.baseUrl}/auth/login`, {
        email: this.email,
        password: this.password,
      });
      this.token = response?.data?.token;
    } catch (error) {
      throw new BadRequestException(`Eskiz authentication failed: ${error.message}`);
    }
  }

  async sendSMS(message: string, phone: string): Promise<boolean> {
    console.log(message, phone);
    try {
      const { data: response } = await axios.post(
        `${this.baseUrl}/message/sms/send`,
        {
          mobile_phone: phone,
          message: "This is test from Eskiz",
          from: '4546',
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        },
      );
      
      return response?.status === 'success' || response?.status === 'waiting';
    } catch (error) {
      if (error.response?.status === 401) {
        await this.auth();
        return this.sendSMS(message, phone);
      }
      console.error('SMS sending failed:', error.message);
      return false;
    }
  }
}
