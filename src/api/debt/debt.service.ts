import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma/prisma.service';
import { unlinkFile } from '../../common/utils/unlink-file';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';

@Injectable()
export class DebtService {
    constructor(private readonly prisma: PrismaService) { }

    async createDebt(createDebtDto: CreateDebtDto, sellerId: string) {
        try {
            const debtor = await this.prisma.debtor.findUnique({
                where: { id: createDebtDto.debtorId },
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
                    message: 'Access denied. Seller can only create debts for their own debtors',
                });
            }

            const debt = await this.prisma.debt.create({
                data: {
                    debtorId: createDebtDto.debtorId,
                    productName: createDebtDto.productName,
                    date: createDebtDto.date ? new Date(createDebtDto.date) : new Date(),
                    deadline: createDebtDto.deadline || 'TWELVE_MONTHS',
                    comment: createDebtDto.comment,
                    amount: createDebtDto.amount,
                    productImages: createDebtDto.images ? {
                        create: createDebtDto.images.map(image => ({ image })),
                    } : undefined,
                },
                include: {
                    productImages: {
                        select: {
                            image: true,
                        },
                    },
                    debtor: {
                        select: {
                            id: true,
                            fullName: true,
                            address: true,
                            phoneNumbers: {
                                select: {
                                    number: true,
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
                    },
                },
            });

            return {
                statusCode: 201,
                message: 'Debt created successfully',
                data: debt,
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
                throw error;
            }
            throw new BadRequestException({
                statusCode: 400,
                message: 'Failed to create debt',
            });
        }
    }

    async getAllDebts(
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
                where.debtor = {
                    sellerId: requesterId,
                };
            }

            if (search) {
                where.OR = [
                    { productName: { contains: search, mode: 'insensitive' } },
                    { comment: { contains: search, mode: 'insensitive' } },
                    { debtor: { fullName: { contains: search, mode: 'insensitive' } } },
                ];
            }

            if (filters?.debtorId) {
                where.debtorId = filters.debtorId;
            }

            if (filters?.paid !== undefined) {
                where.paid = filters.paid;
            }

            if (filters?.deadline) {
                where.deadline = filters.deadline;
            }

            if (filters?.dateFrom || filters?.dateTo) {
                where.date = {};
                if (filters.dateFrom) {
                    where.date.gte = new Date(filters.dateFrom);
                }
                if (filters.dateTo) {
                    where.date.lte = new Date(filters.dateTo);
                }
            }

            if (filters?.amountMin !== undefined || filters?.amountMax !== undefined) {
                where.amount = {};
                if (filters.amountMin !== undefined) {
                    where.amount.gte = filters.amountMin;
                }
                if (filters.amountMax !== undefined) {
                    where.amount.lte = filters.amountMax;
                }
            }

            const [debts, total] = await Promise.all([
                this.prisma.debt.findMany({
                    where,
                    skip,
                    take: limit,
                    include: {
                        productImages: {
                            select: {
                                image: true,
                            },
                        },
                        debtor: {
                            select: {
                                id: true,
                                fullName: true,
                                address: true,
                                phoneNumbers: {
                                    select: {
                                        number: true,
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
                        },
                        payments: {
                            select: {
                                id: true,
                                amount: true,
                                createdAt: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.debt.count({ where }),
            ]);

            const debtsWithCalculations = debts.map(debt => {
                const totalPaid = debt.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
                const remainingAmount = Number(debt.amount) - totalPaid;

                return {
                    ...debt,
                    totalPaid,
                    remainingAmount,
                    paymentsCount: debt.payments.length,
                };
            });

            return {
                statusCode: 200,
                message: 'Debts retrieved successfully',
                data: {
                    debts: debtsWithCalculations,
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
                message: 'Failed to retrieve debts',
            });
        }
    }

    async getDebtById(id: string, requesterId?: string, requesterRole?: string) {
        try {
            const debt = await this.prisma.debt.findUnique({
                where: { id },
                include: {
                    productImages: {
                        select: {
                            image: true,
                        }
                    },
                    debtor: {
                        select: {
                            id: true,
                            fullName: true,
                            address: true,
                            phoneNumbers: {
                                select: {
                                    number: true,
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
                    },
                    payments: {
                        select: {
                            id: true,
                            amount: true,
                            createdAt: true,
                        },
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });

            if (!debt) {
                throw new NotFoundException({
                    statusCode: 404,
                    message: 'Debt not found',
                });
            }

            if (requesterRole === 'SELLER' && requesterId !== debt.debtor.seller.id) {
                throw new UnauthorizedException({
                    statusCode: 403,
                    message: 'Access denied. Seller can only access their own debts',
                });
            }

            const totalPaid = debt.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
            const remainingAmount = Number(debt.amount) - totalPaid;

            const debtWithCalculations = {
                ...debt,
                totalPaid,
                remainingAmount,
                paymentsCount: debt.payments.length,
            };

            return {
                statusCode: 200,
                message: 'Debt retrieved successfully',
                data: debtWithCalculations,
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
                throw error;
            }
            throw new BadRequestException({
                statusCode: 400,
                message: 'Failed to retrieve debt',
            });
        }
    }

    async updateDebt(id: string, updateDebtDto: UpdateDebtDto, requesterId?: string, requesterRole?: string) {
        try {
            const existingDebt = await this.prisma.debt.findUnique({
                where: { id },
                include: {
                    productImages: true,
                    debtor: {
                        select: {
                            sellerId: true,
                        },
                    },
                },
            });

            if (!existingDebt) {
                throw new NotFoundException({
                    statusCode: 404,
                    message: 'Debt not found',
                });
            }

            if (requesterRole === 'SELLER' && requesterId !== existingDebt.debtor.sellerId) {
                throw new UnauthorizedException({
                    statusCode: 403,
                    message: 'Access denied. Seller can only update their own debts',
                });
            }

            const updateData: any = {
                productName: updateDebtDto.productName,
                date: updateDebtDto.date ? new Date(updateDebtDto.date) : undefined,
                deadline: updateDebtDto.deadline,
                comment: updateDebtDto.comment,
                amount: updateDebtDto.amount,
                paid: updateDebtDto.paid,
            };

            Object.keys(updateData).forEach(key => {
                if (updateData[key] === undefined) {
                    delete updateData[key];
                }
            });

            if (updateDebtDto.images !== undefined) {
                if (existingDebt.productImages.length > 0) {
                    existingDebt.productImages.forEach(img => {
                        unlinkFile(img.image);
                    });
                }

                updateData.productImages = {
                    deleteMany: {},
                    create: updateDebtDto.images?.map(image => ({ image })) || [],
                };
            }

            const updatedDebt = await this.prisma.debt.update({
                where: { id },
                data: updateData,
                include: {
                    productImages: {
                        select: {
                            image: true,
                        }
                    },
                    debtor: {
                        select: {
                            id: true,
                            fullName: true,
                            address: true,
                            phoneNumbers: { 
                                select: {
                                    number: true,
                            }},
                            seller: {
                                select: {
                                    id: true,
                                    fullName: true,
                                    username: true,
                                },
                            },
                        },
                    },
                    payments: {
                        select: {
                            id: true,
                            amount: true,
                            createdAt: true,
                        },
                    },
                },
            });

            const totalPaid = updatedDebt.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
            const remainingAmount = Number(updatedDebt.amount) - totalPaid;

            const debtWithCalculations = {
                ...updatedDebt,
                totalPaid,
                remainingAmount,
                paymentsCount: updatedDebt.payments.length,
            };

            return {
                statusCode: 200,
                message: 'Debt updated successfully',
                data: debtWithCalculations,
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
                throw error;
            }
            throw new BadRequestException({
                statusCode: 400,
                message: 'Failed to update debt',
            });
        }
    }

    async deleteDebt(id: string, requesterId?: string, requesterRole?: string) {
        try {
            const debt = await this.prisma.debt.findUnique({
                where: { id },
                include: {
                    productImages: true,
                    debtor: {
                        select: {
                            sellerId: true,
                        },
                    },
                },
            });

            if (!debt) {
                throw new NotFoundException({
                    statusCode: 404,
                    message: 'Debt not found',
                });
            }

            if (requesterRole === 'SELLER' && requesterId !== debt.debtor.sellerId) {
                throw new UnauthorizedException({
                    statusCode: 403,
                    message: 'Access denied. Seller can only delete their own debts',
                });
            }

            if (debt.productImages.length > 0) {
                debt.productImages.forEach(img => {
                    unlinkFile(img.image);
                });
            }

            await this.prisma.debt.delete({
                where: { id },
            });

            return {
                statusCode: 200,
                message: 'Debt deleted successfully',
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
                throw error;
            }
            throw new BadRequestException({
                statusCode: 400,
                message: 'Failed to delete debt',
            });
        }
    }
}