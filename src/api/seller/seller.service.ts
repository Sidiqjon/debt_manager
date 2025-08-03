import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/database/prisma/prisma.service';
import { BcryptEncryption } from '../../infrastructure/lib/bcrypt';
import { OtpService } from '../../infrastructure/lib/services/otp.service';
import { unlinkFile } from '../../common/utils/unlink-file';
import { CreateSellerDto, SellerRole } from './dto/create-seller.dto';
import { UpdateSellerDto, UpdateSellerPasswordDto, RequestPasswordResetDto, VerifyOtpDto } from './dto/update-seller.dto';
import { SellerLoginDto } from './dto/seller-login.dto';
import { config } from '../../config';
import { Response } from 'express'; 

@Injectable()
export class SellerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
  ) {}

  async createSeller(createSellerDto: CreateSellerDto) {
    try {
      const existingUser = await this.prisma.seller.findFirst({
        where: {
          OR: [
            { email: createSellerDto.email },
            { username: createSellerDto.username },
            { phoneNumber: createSellerDto.phoneNumber },
          ],
        },
      });

      if (existingUser) {
        let conflictField = 'field';
        if (existingUser.email === createSellerDto.email) conflictField = 'email';
        else if (existingUser.username === createSellerDto.username) conflictField = 'username';
        else if (existingUser.phoneNumber === createSellerDto.phoneNumber) conflictField = 'phone number';

        throw new ConflictException({
          statusCode: 409,
          message: `Seller with this ${conflictField} already exists`,
        });
      }

      const hashedPassword = await BcryptEncryption.encrypt(createSellerDto.password);

      const seller = await this.prisma.seller.create({
        data: {
          ...createSellerDto,
          password: hashedPassword,
        },
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          email: true,
          username: true,
          image: true,
          balance: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        statusCode: 201,
        message: 'Seller created successfully',
        data: seller,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to create seller',
        data: null,
      });
    }
  }

  async loginSeller(loginDto: SellerLoginDto) {
    try {
      const seller = await this.prisma.seller.findUnique({
        where: { username: loginDto.username },
      });

      if (!seller) {
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'Invalid credentials',
        });
      }

      if (!seller.isActive) {
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'Account is deactivated',
        });
      }

      const isPasswordValid = await BcryptEncryption.compare(
        loginDto.password,
        seller.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'Invalid credentials',
        });
      }

      const payload = { sub: seller.id, username: seller.username, role: SellerRole.SELLER };
      const accessToken = this.jwtService.sign(payload, {
        secret: config.JWT_SECRET,
        expiresIn: config.JWT_ACCESS_EXPIRES_IN,
      });

      const refreshToken = this.jwtService.sign(payload, {
        secret: config.JWT_SECRET,
        expiresIn: config.JWT_REFRESH_EXPIRES_IN,
      });

      return {
        statusCode: 200,
        message: 'Login successful',
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException({
        statusCode: 400,
        message: 'Login failed',
      });
    }
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: config.JWT_SECRET,
      });

      const seller = await this.prisma.seller.findUnique({
        where: { id: payload.sub },
      });

      if (!seller || !seller.isActive) {
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'Invalid refresh token',
        });
      }

      const newPayload = { sub: seller.id, username: seller.username, role: 'SELLER' };
      const accessToken = this.jwtService.sign(newPayload, {
        secret: config.JWT_SECRET,
        expiresIn: config.JWT_ACCESS_EXPIRES_IN,
      });

      return {
        statusCode: 200,
        message: 'Token refreshed successfully',
        data: { accessToken },
      };
    } catch (error) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Invalid refresh token',
      });
    }
  }


  async getAllSellers(page: number = 1, limit: number = 10, search?: string) {
    try {
      const skip = (page - 1) * limit;
      const where = search
        ? {
            OR: [
              { username: { contains: search, mode: 'insensitive' as const } },
              { fullName: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { phoneNumber: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {};

      const [sellers, total] = await Promise.all([
        this.prisma.seller.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
            username: true,
            image: true,
            balance: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.seller.count({ where }),
      ]);

      // Get statistics for each seller
      const sellersWithStats = await Promise.all(
        sellers.map(async (seller) => {
          const [totalDebtBalance, totalDebtorsCount, delayedPaymentsCount] = await Promise.all([
            // Total debt balance (sum of all unpaid debts)
            this.prisma.debt.aggregate({
              where: {
                debtor: { sellerId: seller.id },
                paid: false
              },
              _sum: {
                amount: true
              }
            }),

            // Total number of debtors
            this.prisma.debtor.count({
              where: { sellerId: seller.id }
            }),

            // Count of delayed payment schedules (overdue and unpaid)
            this.prisma.paymentSchedule.count({
              where: {
                debt: {
                  debtor: { sellerId: seller.id }
                },
                isPaid: false,
                dueDate: {
                  lt: new Date() // Past due date
                }
              }
            })
          ]);

          return {
            ...seller,
            statistics: {
              totalDebtBalance: totalDebtBalance._sum.amount || 0,
              totalDebtorsCount,
              delayedPaymentsCount
            }
          };
        })
      );

      return {
        statusCode: 200,
        message: 'Sellers retrieved successfully',
        data: {
          sellers: sellersWithStats,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to retrieve sellers',
      });
    }
  }  


  // async getAllSellers(page: number = 1, limit: number = 10, search?: string) {
  //   try {
  //     const skip = (page - 1) * limit;
  //     const where = search
  //       ? {
  //           OR: [
  //             { username: { contains: search, mode: 'insensitive' as const } },
  //             { fullName: { contains: search, mode: 'insensitive' as const } },
  //             { email: { contains: search, mode: 'insensitive' as const } },
  //             { phoneNumber: { contains: search, mode: 'insensitive' as const } },
  //           ],
  //         }
  //       : {};

  //     const [sellers, total] = await Promise.all([
  //       this.prisma.seller.findMany({
  //         where,
  //         skip,
  //         take: limit,
  //         select: {
  //           id: true,
  //           fullName: true,
  //           phoneNumber: true,
  //           email: true,
  //           username: true,
  //           image: true,
  //           balance: true,
  //           isActive: true,
  //           createdAt: true,
  //           updatedAt: true,
  //         },
  //         orderBy: { createdAt: 'desc' },
  //       }),
  //       this.prisma.seller.count({ where }),
  //     ]);

  //     return {
  //       statusCode: 200,
  //       message: 'Sellers retrieved successfully',
  //       data: {
  //         sellers,
  //         pagination: {
  //           page,
  //           limit,
  //           total,
  //           pages: Math.ceil(total / limit),
  //         },
  //       },
  //     };
  //   } catch (error) {
  //     throw new BadRequestException({
  //       statusCode: 400,
  //       message: 'Failed to retrieve sellers',
  //     });
  //   }
  // }

  async getSellerById(id: string, requesterId?: string, requesterRole?: string) {
    try {
      const seller = await this.prisma.seller.findUnique({
        where: { id },
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          email: true,
          username: true,
          image: true,
          balance: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!seller) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Seller not found',
        });
      }

      if (requesterRole === 'SELLER' && requesterId !== id) {
        throw new UnauthorizedException({
          statusCode: 403,
          message: "Access denied.Seller can not get other seller's details",
        });
      }

      // Get additional seller statistics
      const [totalDebtBalance, totalDebtorsCount, delayedPaymentsCount] = await Promise.all([
        // Total debt balance (sum of all unpaid debts)
        this.prisma.debt.aggregate({
          where: {
            debtor: { sellerId: id },
            paid: false
          },
          _sum: {
            amount: true
          }
        }),

        // Total number of debtors
        this.prisma.debtor.count({
          where: { sellerId: id }
        }),

        // Count of delayed payment schedules (overdue and unpaid)
        this.prisma.paymentSchedule.count({
          where: {
            debt: {
              debtor: { sellerId: id }
            },
            isPaid: false,
            dueDate: {
              lt: new Date() // Past due date
            }
          }
        })
      ]);

      return {
        statusCode: 200,
        message: 'Seller retrieved successfully',
        data: {
          ...seller,
          statistics: {
            totalDebtBalance: totalDebtBalance._sum.amount || 0,
            totalDebtorsCount,
            delayedPaymentsCount
          }
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to retrieve seller',
      });
    }
  }

  // async getSellerById(id: string, requesterId?: string, requesterRole?: string) {
  //   try {
  //     const seller = await this.prisma.seller.findUnique({
  //       where: { id },
  //       select: {
  //         id: true,
  //         fullName: true,
  //         phoneNumber: true,
  //         email: true,
  //         username: true,
  //         image: true,
  //         balance: true,
  //         isActive: true,
  //         createdAt: true,
  //         updatedAt: true,
  //       },
  //     });

  //     if (!seller) {
  //       throw new NotFoundException({
  //         statusCode: 404,
  //         message: 'Seller not found',
  //       });
  //     }

  //     if (requesterRole === 'SELLER' && requesterId !== id) {
  //       throw new UnauthorizedException({
  //         statusCode: 403,
  //         message: "Access denied.Seller can not get other seller's details",
  //       });
  //     }

  //     return {
  //       statusCode: 200,
  //       message: 'Seller retrieved successfully',
  //       data: seller,
  //     };
  //   } catch (error) {
  //     if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
  //       throw error;
  //     }
  //     throw new BadRequestException({
  //       statusCode: 400,
  //       message: 'Failed to retrieve seller',
  //     });
  //   }
  // }

  async updateSeller(id: string, updateSellerDto: UpdateSellerDto, requesterId?: string, requesterRole?: string) {
    try {
      const existingSeller = await this.prisma.seller.findUnique({
        where: { id },
      });

      if (!existingSeller) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Seller not found',
        });
      }

      if (requesterRole === 'SELLER' && requesterId !== id) {
        throw new UnauthorizedException({
          statusCode: 403,
          message: "Access denied.Seller can not update other seller's details",
        });
      }

      if (requesterRole === 'SELLER' && updateSellerDto.isActive) {
        throw new UnauthorizedException({
          statusCode: 403,
          message: "Access denied.Seller can not update itself's status",
        })
      }

      const allowedFields = requesterRole === 'SELLER' 
        ? ['fullName', 'phoneNumber', 'username', 'image']
        : Object.keys(updateSellerDto);

      const updateData: any = {};
      for (const key of allowedFields) {
        if (updateSellerDto[key] !== undefined) {
          updateData[key] = updateSellerDto[key];
        }
      }

      if (updateData.username || updateData.email || updateData.phoneNumber) {
        const conflictWhere: any = {
          AND: [
            { id: { not: id } },
            {
              OR: [],
            },
          ],
        };

        if (updateData.username) conflictWhere.AND[1].OR.push({ username: updateData.username });
        if (updateData.email) conflictWhere.AND[1].OR.push({ email: updateData.email });
        if (updateData.phoneNumber) conflictWhere.AND[1].OR.push({ phoneNumber: updateData.phoneNumber });

        const existingConflict = await this.prisma.seller.findFirst({
          where: conflictWhere,
        });

        if (existingConflict) {
          let conflictField = 'field';
          if (updateData.username && existingConflict.username === updateData.username) conflictField = 'username';
          else if (updateData.email && existingConflict.email === updateData.email) conflictField = 'email';
          else if (updateData.phoneNumber && existingConflict.phoneNumber === updateData.phoneNumber) conflictField = 'phone number';

          throw new ConflictException({
            statusCode: 409,
            message: `Seller with this ${conflictField} already exists`,
          });
        }
      }

      if (updateData.image && existingSeller.image) {
        console.log(existingSeller.image);
        unlinkFile(existingSeller.image);
      }

      const updatedSeller = await this.prisma.seller.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          email: true,
          username: true,
          image: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        statusCode: 200,
        message: 'Seller updated successfully',
        data: updatedSeller,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to update seller',
      });
    }
  }

  async requestPasswordReset(requestDto: RequestPasswordResetDto) {
    try {
      const seller = await this.prisma.seller.findFirst({
        where: { email: requestDto.email },
      });

      if (!seller) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Seller with this email not found',
        });
      }

      const otp = await this.otpService.sendOTP(requestDto.email);

      return {
        statusCode: 200,
        message: 'OTP sent to your email successfully',
        otp
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to send OTP',
      });
    }
  }

  async resetPassword(resetDto: UpdateSellerPasswordDto) {
    try {
      const seller = await this.prisma.seller.findFirst({
        where: { email: resetDto.email },
      });

      if (!seller) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Seller with this email not found',
        });
      }

      const hashedPassword = await BcryptEncryption.encrypt(resetDto.newPassword);

      await this.prisma.seller.update({
        where: { id: seller.id },
        data: { password: hashedPassword },
      });

      return {
        statusCode: 200,
        message: 'Password reset successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to reset password',
      });
    }
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const seller = await this.prisma.seller.findFirst({
      where: { email: verifyOtpDto.email },
    });
    
    if (!seller) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Seller with this email not found',
      });
    }
    
    return this.otpService.verifyOTP(verifyOtpDto.email, verifyOtpDto.otp);
  }

  async deleteSeller(id: string) {
    try {
      const seller = await this.prisma.seller.findUnique({
        where: { id },
      });

      if (!seller) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Seller not found',
        });
      }

      if (seller.image) {
        unlinkFile(seller.image);
      }

      await this.prisma.seller.delete({
        where: { id },
      });

      return {
        statusCode: 200,
        message: 'Seller deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to delete seller',
      });
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
    res.clearCookie('refresh_token_seller');
    return { message: 'Logged out successfully' };
  }
}
