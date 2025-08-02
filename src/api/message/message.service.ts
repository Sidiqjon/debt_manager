import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma/prisma.service';
import { EskizService } from '../../common/services/eskiz.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eskizService: EskizService,
  ) {}

  async createMessage(createMessageDto: CreateMessageDto, sellerId: string) {
    try {
      const debtor = await this.prisma.debtor.findUnique({
        where: { id: createMessageDto.to },
        include: {
          phoneNumbers: true,
        },
      });

      if (!debtor) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Debtor not found',
        });
      }

      if (debtor.sellerId !== sellerId) {
        throw new UnauthorizedException({
          statusCode: 403,
          message: 'Access denied. Seller can only send messages to their own debtors',
        });
      }

      if (!debtor.phoneNumbers || debtor.phoneNumbers.length === 0) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'Debtor has no phone numbers available for messaging',
        });
      }

      const primaryPhone = debtor.phoneNumbers[0].number;
      let messageSent = false;

      try {
        messageSent = true
        // messageSent = await this.eskizService.sendSMS(createMessageDto.message, primaryPhone);
      } catch (error) {
        console.error('SMS sending failed:', error);
        messageSent = false;
      }

      const message = await this.prisma.message.create({
        data: {
          from: sellerId,
          to: createMessageDto.to,
          message: createMessageDto.message,
          sent: messageSent,
        },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              username: true,
            },
          },
          receiver: {
            select: {
              id: true,
              fullName: true,
              address: true,
              phoneNumbers: {
                select: {
                  number: true,
                },
              },
            },
          },
        },
      });

      return {
        statusCode: 201,
        message: messageSent 
          ? 'Message created and sent successfully' 
          : 'Message created but sending failed',
        data: {
          ...message,
          phoneNumber: primaryPhone,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to create message',
      });
    }
  }

  async getAllMessages(
    page: number = 1,
    limit: number = 10,
    search?: string,
    filters?: any,
    requesterId?: string,
    requesterRole?: string
  ) {
    try {
      const skip = (page - 1) * limit;
      let where: any = {};

      if (requesterRole === 'SELLER') {
        where.from = requesterId;
      }

      if (filters?.debtorId) {
        where.to = filters.debtorId;
      }

      if (search) {
        where.OR = [
          { message: { contains: search, mode: 'insensitive' } },
          { receiver: { fullName: { contains: search, mode: 'insensitive' } } },
          { sender: { fullName: { contains: search, mode: 'insensitive' } } },
          { sender: { username: { contains: search, mode: 'insensitive' } } },
        ];
      }

      if (filters?.sent !== undefined) {
        where.sent = filters.sent;
      }

      if (filters?.dateFrom || filters?.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) {
          where.createdAt.gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          where.createdAt.lte = new Date(filters.dateTo);
        }
      }

      const [messages, total] = await Promise.all([
        this.prisma.message.findMany({
          where,
          skip,
          take: limit,
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                username: true,
              },
            },
            receiver: {
              select: {
                id: true,
                fullName: true,
                address: true,
                phoneNumbers: {
                  select: {
                    number: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.message.count({ where }),
      ]);

      return {
        statusCode: 200,
        message: 'Messages retrieved successfully',
        data: {
          messages,
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
        message: 'Failed to retrieve messages',
      });
    }
  }

  async getMessageById(id: string, requesterId?: string, requesterRole?: string) {
    try {
      const message = await this.prisma.message.findUnique({
        where: { id },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              username: true,
            },
          },
          receiver: {
            select: {
              id: true,
              fullName: true,
              address: true,
              phoneNumbers: {
                select: {
                  number: true,
                },
              },
            },
          },
        },
      });

      if (!message) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Message not found',
        });
      }

      if (requesterRole === 'SELLER' && requesterId !== message.from) {
        throw new UnauthorizedException({
          statusCode: 403,
          message: 'Access denied. Seller can only access their own messages',
        });
      }

      return {
        statusCode: 200,
        message: 'Message retrieved successfully',
        data: message,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to retrieve message',
      });
    }
  }

  async updateMessage(id: string, updateMessageDto: UpdateMessageDto, requesterId?: string, requesterRole?: string) {
    try {
      const existingMessage = await this.prisma.message.findUnique({
        where: { id },
      });

      if (!existingMessage) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Message not found',
        });
      }

      if (requesterRole === 'SELLER' && requesterId !== existingMessage.from) {
        throw new UnauthorizedException({
          statusCode: 403,
          message: 'Access denied. Seller can only update their own messages',
        });
      }

      const updatedMessage = await this.prisma.message.update({
        where: { id },
        data: {
          message: updateMessageDto.message,
        },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              username: true,
            },
          },
          receiver: {
            select: {
              id: true,
              fullName: true,
              address: true,
              phoneNumbers: {
                select: {
                  number: true,
                },
              },
            },
          },
        },
      });

      return {
        statusCode: 200,
        message: 'Message updated successfully',
        data: updatedMessage,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to update message',
      });
    }
  }

  async deleteMessage(id: string, requesterId?: string, requesterRole?: string) {
    try {
      const message = await this.prisma.message.findUnique({
        where: { id },
      });

      if (!message) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Message not found',
        });
      }

      if (requesterRole === 'SELLER' && requesterId !== message.from) {
        throw new UnauthorizedException({
          statusCode: 403,
          message: 'Access denied. Seller can only delete their own messages',
        });
      }

      await this.prisma.message.delete({
        where: { id },
      });

      return {
        statusCode: 200,
        message: 'Message deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to delete message',
      });
    }
  }

  async resendMessage(id: string, requesterId?: string, requesterRole?: string) {
    try {
      const message = await this.prisma.message.findUnique({
        where: { id },
        include: {
          receiver: {
            include: {
              phoneNumbers: true,
            },
          },
        },
      });

      if (!message) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Message not found',
        });
      }

      if (requesterRole === 'SELLER' && requesterId !== message.from) {
        throw new UnauthorizedException({
          statusCode: 403,
          message: 'Access denied. Seller can only resend their own messages',
        });
      }

      if (!message.receiver.phoneNumbers || message.receiver.phoneNumbers.length === 0) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'Debtor has no phone numbers available for messaging',
        });
      }

      const primaryPhone = message.receiver.phoneNumbers[0].number;
      let messageSent = false;

      try {
        messageSent = true;
        // messageSent = await this.eskizService.sendSMS(message.message, primaryPhone);
      } catch (error) {
        console.error('SMS resending failed:', error);
        messageSent = false;
      }

      const updatedMessage = await this.prisma.message.update({
        where: { id },
        data: {
          sent: messageSent,
        },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              username: true,
            },
          },
          receiver: {
            select: {
              id: true,
              fullName: true,
              address: true,
              phoneNumbers: {
                select: {
                  number: true,
                },
              },
            },
          },
        },
      });

      return {
        statusCode: 200,
        message: messageSent 
          ? 'Message resent successfully' 
          : 'Message resend failed',
        data: updatedMessage,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to resend message',
      });
    }
  }
}