import { Injectable, ConflictException, NotFoundException, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { Admin } from '@prisma/client';
import { AdminRole } from './dto/create-admin.dto';
import { config } from 'src/config';
import { Response } from 'express'; 
import { unlinkFile } from 'src/common/utils/unlink-file';
import { BcryptEncryption } from 'src/infrastructure/lib/bcrypt/index';

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

    const existingPhoneNumber = await this.prisma.admin.findFirst({
      where: { phoneNumber: createAdminDto.phoneNumber }
    });

    if (existingPhoneNumber) {
      throw new ConflictException('Phone number already exists');
    }

    const hashedPassword = await BcryptEncryption.encrypt(createAdminDto.password);

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

    const existingPhoneNumber = await this.prisma.admin.findFirst({
      where: { phoneNumber: createAdminDto.phoneNumber }
    });

    if (existingPhoneNumber) {
      throw new ConflictException('Phone number already exists');
    }

    const hashedPassword = await BcryptEncryption.encrypt(createAdminDto.password);

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

  async update(id: string, updateAdminDto: UpdateAdminDto, currentAdminId: string, currentAdminRole: AdminRole): Promise<Admin> {

    const adminToUpdate = await this.prisma.admin.findUnique({
      where: { id }
    });

    if (!adminToUpdate) {
      throw new NotFoundException('Admin not found');
    }

    if (id !== currentAdminId && adminToUpdate.role === AdminRole.SUPER) {
      throw new ForbiddenException('Cannot update SUPER admin');
    }

	if (id !== currentAdminId && currentAdminRole !== AdminRole.SUPER) {
		throw new ForbiddenException('Only SUPER admin can update other admins');
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

    if (updateAdminDto.phoneNumber) {
      const existingPhoneNumber = await this.prisma.admin.findFirst({
        where: { phoneNumber: updateAdminDto.phoneNumber }
      });

      if (existingPhoneNumber && existingPhoneNumber.id !== id) {
        throw new ConflictException('Phone number already exists');
      }
    }

    const updateData: any = { ...updateAdminDto };

	if (updateAdminDto.image) {
		unlinkFile(adminToUpdate.image ?? "");
	}

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

	if (adminToDelete.image) {
		unlinkFile(adminToDelete.image ?? "");
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

    const isPasswordValid = await BcryptEncryption.compare(loginDto.password, admin.password);

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
      expiresIn: config.JWT_ACCESS_EXPIRES_IN,
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN,
    });

    res.clearCookie('refresh_token_admin', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/', 
    });


    res.cookie('refresh_token_admin', refreshToken, {
    httpOnly: true,
    secure: false, 
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, 
    path: '/',
    });

    return {
      accessToken,
      refreshToken
    };
  }


  async refreshAccessToken(refreshTokenAdmin: string) {
    try {
      const payloadAdmin = this.jwtService.verify(refreshTokenAdmin);

      const admin = await this.prisma.admin.findUnique({
        where: { id: payloadAdmin.sub }
      });

      if (!admin) {
        throw new UnauthorizedException('Admin not found');
      }

      if (admin && !admin.isActive && admin.role !== AdminRole.SUPER) {
        throw new UnauthorizedException('Admin account is inactive');
      }

      const newPayload = {
          sub: admin.id,
          username: admin.username,
          role: admin.role,
          isActive: admin.isActive
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: config.JWT_ACCESS_EXPIRES_IN,
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
        secret: config.JWT_SECRET,
      });
    } catch (error) {
      throw new BadRequestException(`Error on refresh token: ${error}`);
    }

    res.clearCookie('refresh_token_admin', {
      httpOnly: true,
      secure: false, 
      sameSite: 'lax',
      path: '/',
    });
  

    return { message: 'Logged out successfully' };
  }

}