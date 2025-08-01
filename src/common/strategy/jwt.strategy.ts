import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma/prisma.service';
import { config } from 'src/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.JWT_SECRET
    });
  }

  async validate(payload: any) {
    if (payload.role === 'ADMIN' || payload.role === 'SUPER') {
      const admin = await this.prisma.admin.findUnique({
        where: { id: payload.sub }
      });
      
      if (!admin) {
        throw new UnauthorizedException('Admin not found');
      }
      
      if (!admin.isActive && admin.role !== 'SUPER') {
        throw new UnauthorizedException('Admin account is inactive');
      }
      
      return {
        sub: payload.sub,
        username: payload.username,
        role: payload.role,
        isActive: payload.isActive,
        userType: 'ADMIN'
      };
    }
    
    if (payload.role === 'SELLER') {
      const seller = await this.prisma.seller.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          username: true,
          email: true,
          isActive: true,
        },
      });
      
      if (!seller || !seller.isActive) {
        throw new UnauthorizedException('Seller not found or inactive');
      }
      
      return {
        sub: seller.id,
        username: seller.username,
        email: seller.email,
        role: payload.role,
        userType: 'SELLER'
      };
    }
    
    throw new UnauthorizedException('Invalid token type');
  }
}