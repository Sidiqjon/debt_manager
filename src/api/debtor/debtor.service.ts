import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma/prisma.service';
import { unlinkFile } from '../../common/utils/unlink-file';
import { CreateDebtorDto } from './dto/create-debtor.dto';
import { UpdateDebtorDto } from './dto/update-debtor.dto';

@Injectable()
export class DebtorService {
  constructor(private readonly prisma: PrismaService) {}

  async createDebtor(createDebtorDto: CreateDebtorDto, sellerId: string) {
    try {
      const debtor = await this.prisma.debtor.create({
        data: {
          fullName: createDebtorDto.fullName,
          address: createDebtorDto.address,
          notice: createDebtorDto.notice,
          sellerId,
          phoneNumbers: {
            create: createDebtorDto.phoneNumbers.map(number => ({ number })),
          },
          debtorImages: createDebtorDto.images ? {
            create: createDebtorDto.images.map(image => ({ image })),
          } : undefined,
        },
        include: {
          phoneNumbers: {
            select: {
              number: true,
            },
          },
          debtorImages: {
            select: {
              image: true,
            },
          },
        },
      });

      return {
        statusCode: 201,
        message: 'Debtor created successfully',
        data: debtor,
      };
    } catch (error) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to create debtor',
      });
    }
  }

  async getAllDebtors(page: number = 1, limit: number = 10, search?: string, requesterId?: string, requesterRole?: string) {
    try {
      const skip = (page - 1) * limit;
      let where: any = {};

      if (requesterRole === 'SELLER') {
        where.sellerId = requesterId;
      }

      if (search) {
        where.OR = [
          { fullName: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
          { phoneNumbers: { some: { number: { contains: search } } } },
        ];
      }

      const [debtors, total] = await Promise.all([
        this.prisma.debtor.findMany({
          where,
          skip,
          take: limit,
          include: {
            debts: true,
            phoneNumbers: {
              select: {
                number: true,
              },
            },
            debtorImages: 
            {
              select: {
                image: true,
              },
            },
            seller: {
              select: {
                id: true,
                fullName: true,
                username: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.debtor.count({ where }),
      ]);

      return {
        statusCode: 200,
        message: 'Debtors retrieved successfully',
        data: {
          debtors,
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
        message: 'Failed to retrieve debtors',
      });
    }
  }

  async getDebtorById(id: string, requesterId?: string, requesterRole?: string) {
    try {
      const debtor = await this.prisma.debtor.findUnique({
        where: { id },
        include: {
          debts: true,
          phoneNumbers: {
            select: {
              number: true,
            },
          },
          debtorImages: {
            select: {
              image: true,
            },
          },
          seller: {
            select: {
              id: true,
              fullName: true,
              username: true,
            },
          },
        },
      });

      if (!debtor) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Debtor not found',
        });
      }

      if (requesterRole === 'SELLER' && requesterId !== debtor.sellerId) {
        throw new UnauthorizedException({
          statusCode: 403,
          message: 'Access denied. Seller can only access their own debtors',
        });
      }

      return {
        statusCode: 200,
        message: 'Debtor retrieved successfully',
        data: debtor,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to retrieve debtor',
      });
    }
  }

  async updateDebtor(id: string, updateDebtorDto: UpdateDebtorDto, requesterId?: string, requesterRole?: string) {
    try {
      const existingDebtor = await this.prisma.debtor.findUnique({
        where: { id },
        include: {
          phoneNumbers: true,
          debtorImages: true,
        },
      });

      if (!existingDebtor) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Debtor not found',
        });
      }

      if (requesterRole === 'SELLER' && requesterId !== existingDebtor.sellerId) {
        throw new UnauthorizedException({
          statusCode: 403,
          message: 'Access denied. Seller can only update their own debtors',
        });
      }

      const updateData: any = {
        fullName: updateDebtorDto.fullName,
        address: updateDebtorDto.address,
        notice: updateDebtorDto.notice,
      };

      if (updateDebtorDto.phoneNumbers) {
        updateData.phoneNumbers = {
          deleteMany: {},
          create: updateDebtorDto.phoneNumbers.map(number => ({ number })),
        };
      }

      if (updateDebtorDto.images !== undefined) {
        if (existingDebtor.debtorImages.length > 0) {
          existingDebtor.debtorImages.forEach(img => {
            unlinkFile(img.image);
          });
        }

        updateData.debtorImages = {
          deleteMany: {},
          create: updateDebtorDto.images?.map(image => ({ image })) || [],
        };
      }

      const updatedDebtor = await this.prisma.debtor.update({
        where: { id },
        data: updateData,
        include: {
          phoneNumbers: {
            select: {
              number: true,
            },
          },
          debtorImages: 
          {
            select: {
              image: true,
            },
          },
        },
      });

      return {
        statusCode: 200,
        message: 'Debtor updated successfully',
        data: updatedDebtor,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to update debtor',
      });
    }
  }

  async deleteDebtor(id: string, requesterId?: string, requesterRole?: string) {
    try {
      const debtor = await this.prisma.debtor.findUnique({
        where: { id },
        include: {
          debtorImages: true,
        },
      });

      if (!debtor) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Debtor not found',
        });
      }

      if (requesterRole === 'SELLER' && requesterId !== debtor.sellerId) {
        throw new UnauthorizedException({
          statusCode: 403,
          message: 'Access denied. Seller can only delete their own debtors',
        });
      }

      if (debtor.debtorImages.length > 0) {
        debtor.debtorImages.forEach(img => {
          unlinkFile(img.image);
        });
      }

      await this.prisma.debtor.delete({
        where: { id },
      });

      return {
        statusCode: 200,
        message: 'Debtor deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to delete debtor',
      });
    }
  }
}