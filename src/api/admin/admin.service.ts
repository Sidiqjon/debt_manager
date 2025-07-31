import { Injectable, ConflictException, NotFoundException, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/database/prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { Admin } from '@prisma/client';
import { AdminRole } from './dto/create-admin.dto';
import { config } from 'src/config';
import { Response } from 'express'; 

@Injectable()
export class AdminService {
  private refreshTokens: Set<string> = new Set();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async createSuperAdmin(createAdminDto: CreateAdminDto): Promise<Admin> {
    const existingSuperAdmin = await this.prisma.admin.findFirst({
      where: { role: AdminRole.SUPER }
    });

    if (existingSuperAdmin) {
      throw new ConflictException('Super admin already exists');
    }

    const existingUsername = await this.prisma.admin.findUnique({
      where: { username: createAdminDto.username }
    });

    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    const existingEmail = await this.prisma.admin.findFirst({
      where: { email: createAdminDto.email }
    });

    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createAdminDto.password, 12);

    const superAdmin = await this.prisma.admin.create({
      data: {
        ...createAdminDto,
        password: hashedPassword,
        role: AdminRole.SUPER,
        isActive: true,
      },
    });

    let superAdminWithoutPassword = { ...superAdmin, password: "" };
    return superAdminWithoutPassword;

  }

  async createAdmin(createAdminDto: CreateAdminDto, currentAdminId: string): Promise<Admin> {
    const currentAdmin = await this.findOne(currentAdminId);
    
    if (currentAdmin.role !== AdminRole.SUPER) {
      throw new ForbiddenException('Only SUPER admin can create other admins');
    }

    const existingUsername = await this.prisma.admin.findUnique({
      where: { username: createAdminDto.username }
    });

    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    const existingEmail = await this.prisma.admin.findFirst({
      where: { email: createAdminDto.email }
    });

    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createAdminDto.password, 12);

    const admin = await this.prisma.admin.create({
      data: {
        ...createAdminDto,
        password: hashedPassword,
        role: AdminRole.ADMIN,
      },
    });

    const adminWithoutPassword = { ...admin, password: "" };
    return adminWithoutPassword;
  }

  async findAll(): Promise<Admin[]> {
    const admins = await this.prisma.admin.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return admins.map(admin => {
      admin.password = "";
      return admin;
    });
  }

  async findOne(id: string): Promise<Admin> {
    const admin = await this.prisma.admin.findUnique({
      where: { id }
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    admin.password = "";
    return admin;
  }

  async update(id: string, updateAdminDto: UpdateAdminDto, currentAdminId: string): Promise<Admin> {
    const adminToUpdate = await this.prisma.admin.findUnique({
      where: { id }
    });

    if (!adminToUpdate) {
      throw new NotFoundException('Admin not found');
    }

    const currentAdmin = await this.prisma.admin.findUnique({
      where: { id: currentAdminId }
    });

    if (updateAdminDto.isActive !== undefined && currentAdmin?.role !== AdminRole.SUPER) {
      throw new ForbiddenException('Only SUPER admin can change admin status');
    }

    if (updateAdminDto.username) {
      const existingUsername = await this.prisma.admin.findUnique({
        where: { username: updateAdminDto.username }
      });

      if (existingUsername && existingUsername.id !== id) {
        throw new ConflictException('Username already exists');
      }
    }

    if (updateAdminDto.email) {
      const existingEmail = await this.prisma.admin.findFirst({
        where: { email: updateAdminDto.email }
      });

      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictException('Email already exists');
      }
    }

    const updateData: any = { ...updateAdminDto };

    // if (updateAdminDto.password) {
    //   updateData.password = await bcrypt.hash(updateAdminDto.password, 12);
    // }

    const updatedAdmin = await this.prisma.admin.update({
      where: { id },
      data: updateData,
    });

    updatedAdmin.password = "";
    return updatedAdmin;
  }

  async remove(id: string, currentAdminId: string): Promise<Admin> {
    const currentAdmin = await this.prisma.admin.findUnique({
      where: { id: currentAdminId }
    });

    if (currentAdmin?.role !== AdminRole.SUPER) {
      throw new ForbiddenException('Only SUPER admin can delete admins');
    }

    const adminToDelete = await this.prisma.admin.findUnique({
      where: { id }
    });

    if (!adminToDelete) {
      throw new NotFoundException('Admin not found');
    }

    if (adminToDelete.role === AdminRole.SUPER) {
      throw new ForbiddenException('Cannot delete SUPER admin');
    }

    const deletedAdmin = await this.prisma.admin.delete({
      where: { id }
    });

    deletedAdmin.password = "";
    return deletedAdmin;
  }

  async login(loginDto: LoginDto, res: Response) {
    const admin = await this.prisma.admin.findUnique({
      where: { username: loginDto.username }
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, admin.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!admin.isActive && admin.role !== AdminRole.SUPER) {
      throw new UnauthorizedException('Admin account is inactive');
    }

    const payload = {
      sub: admin.id,
      username: admin.username,
      role: admin.role,
      isActive: admin.isActive
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: config.JWT_ACCESS_EXPIRES_IN || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    res.cookie('refresh_token_admin', refreshToken, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production', 
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 
    });

    return {
      accessToken,
      refreshToken
    };
  }


  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);

      const admin = await this.prisma.admin.findUnique({
        where: { id: payload.sub }
      });

      if (!admin) {
        throw new UnauthorizedException('Admin not found');
      }

      if (!admin.isActive && admin.role !== AdminRole.SUPER) {
        throw new UnauthorizedException('Admin account is inactive');
      }

      const newPayload = {
        sub: admin.id,
        username: admin.username,
        role: admin.role,
        isActive: admin.isActive
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: config.JWT_ACCESS_EXPIRES_IN || '15m',
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refresh_token: string, res: Response) {
    let data: any;
    try {
      data = await this.jwtService.verify(refresh_token, {
        secret: config.JWT_SECRET || 'secret-key',
      });
    } catch (error) {
      throw new BadRequestException(`Error on refresh token: ${error}`);
    }
    res.clearCookie('refresh_token_admin');
    return { message: 'Logged out successfully' };
  }

}