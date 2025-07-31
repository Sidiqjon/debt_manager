import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const rounds = 10;

export class BcryptEncryption {
  static async encrypt(password: string) {
    try {
      return await bcrypt.hash(password, rounds);
    } catch (error) {
      throw new BadRequestException(`Error on encrypt: ${error}`);
    }
  }

  static async compare(password: string, hash: string) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new BadRequestException(`Error on decrypt: ${error}`);
    }
  }
}
