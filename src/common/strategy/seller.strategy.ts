import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/database/prisma/prisma.service';
import { config } from '../../config';

@Injectable()
export class SellerJwtStrategy extends PassportStrategy(Strategy, 'seller-jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    if (payload.role !== 'SELLER') {
      throw new UnauthorizedException('Invalid token type');
    }

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
    };
  }
}