import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma/prisma.service';
import { CreatePaymentDto, CreateScheduledPaymentDto, PaymentQueryDto, PaymentType } from './dto/create-payment.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PaymentService {
    constructor(private prisma: PrismaService) { }

    async createPayment(sellerId: string, createPaymentDto: CreatePaymentDto) {
        const { debtorId, debtId, amount, paymentType, paymentDate } = createPaymentDto;

        const debt = await this.prisma.debt.findFirst({
            where: {
                id: debtId,
                debtorId: debtorId,
                debtor: { sellerId }
            },
            include: {
                debtor: true,
                payments: true,
                paymentSchedules: true
            }
        });

        if (!debt) {
            throw new NotFoundException('Debt not found or access denied');
        }

        if (debt.paid) {
            throw new BadRequestException('Debt is already fully paid');
        }

        const totalPaid = debt.payments.reduce((sum, payment) => sum.add(payment.amount), new Decimal(0));
        const remainingAmount = debt.amount.sub(totalPaid);

        if (amount.gt(remainingAmount)) {
            throw new BadRequestException(`Payment amount cannot exceed remaining debt: ${remainingAmount}`);
        }

        const payment = await this.prisma.payment.create({
            data: {
                debtorId,
                debtId,
                amount,
                createdAt: paymentDate ? new Date(paymentDate) : new Date()
            },
            include: {
                debt: true,
                debtor: true
            }
        });

        const newTotalPaid = totalPaid.add(amount);
        const newRemainingAmount = debt.amount.sub(newTotalPaid);

        if (newRemainingAmount.lte(0)) {
            await this.prisma.debt.update({
                where: { id: debtId },
                data: { paid: true }
            });
        }

        if (paymentType === PaymentType.PARTIAL_PAYMENT && debt.paymentSchedules.length > 0) {
            await this.updatePaymentSchedules(debtId, amount);
        }

        return payment;
    }

    async createScheduledPayment(sellerId: string, createScheduledPaymentDto: CreateScheduledPaymentDto) {
        const { debtId, months } = createScheduledPaymentDto;

        const debt = await this.prisma.debt.findFirst({
            where: {
                id: debtId,
                debtor: { sellerId }
            },
            include: {
                payments: true,
                paymentSchedules: true
            }
        });

        if (!debt) {
            throw new NotFoundException('Debt not found or access denied');
        }

        if (debt.paid) {
            throw new BadRequestException('Debt is already fully paid');
        }

        if (debt.paymentSchedules.length > 0) {
            throw new BadRequestException('Payment schedule already exists for this debt');
        }

        const totalPaid = debt.payments.reduce((sum, payment) => sum.add(payment.amount), new Decimal(0));
        const remainingAmount = debt.amount.sub(totalPaid);

        if (remainingAmount.lte(0)) {
            throw new BadRequestException('Debt is already fully paid');
        }

        const monthlyAmount = remainingAmount.div(months);
        const schedules: {
            debtId: string;
            installmentNumber: number;
            amount: Decimal;
            dueDate: Date;
        }[] = [];

        for (let i = 1; i <= months; i++) {
            const dueDate = new Date(debt.date);
            dueDate.setMonth(dueDate.getMonth() + i);

            const amount = i === months ? remainingAmount.sub(monthlyAmount.mul(months - 1)) : monthlyAmount;

            schedules.push({
                debtId,
                installmentNumber: i,
                amount,
                dueDate
            });
        }

        return await this.prisma.paymentSchedule.createMany({
            data: schedules
        });
    }

    private async updatePaymentSchedules(debtId: string, paymentAmount: Decimal) {
        const schedules = await this.prisma.paymentSchedule.findMany({
            where: { debtId, isPaid: false },
            orderBy: { installmentNumber: 'asc' }
        });

        let remainingPayment = paymentAmount;

        for (const schedule of schedules) {
            if (remainingPayment.lte(0)) break;

            const unpaidAmount = schedule.amount.sub(schedule.paidAmount);
            const paymentForThisSchedule = remainingPayment.gte(unpaidAmount) ? unpaidAmount : remainingPayment;

            const newPaidAmount = schedule.paidAmount.add(paymentForThisSchedule);
            const isPaid = newPaidAmount.gte(schedule.amount);

            await this.prisma.paymentSchedule.update({
                where: { id: schedule.id },
                data: {
                    paidAmount: newPaidAmount,
                    isPaid,
                    paidDate: isPaid ? new Date() : schedule.paidDate
                }
            });

            remainingPayment = remainingPayment.sub(paymentForThisSchedule);
        }
    }

    async getAllPayments(sellerId: string, query: PaymentQueryDto, userRole: string) {
        const { page = 1, limit = 10, search, debtorId, debtId } = query;
        const skip = (page - 1) * limit;

        const where: any = userRole === 'ADMIN' ? {} : {
            debtor: { sellerId }
        };

        if (search) {
            where.debtor = {
                ...where.debtor,
                fullName: { contains: search, mode: 'insensitive' }
            };
        }

        if (debtorId) {
            where.debtorId = debtorId;
        }

        if (debtId) {
            where.debtId = debtId;
        }

        const [payments, total] = await Promise.all([
            this.prisma.payment.findMany({
                where,
                include: {
                    debt: {
                        select: {
                            productName: true,
                            amount: true,
                            paid: true,
                            date: true
                        }
                    },
                    debtor: {
                        select: {
                            fullName: true,
                            phoneNumbers: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            this.prisma.payment.count({ where })
        ]);

        return {
            data: payments,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getPaymentById(sellerId: string, paymentId: string, userRole: string) {
        const where: any = { id: paymentId };

        if (userRole !== 'ADMIN') {
            where.debtor = { sellerId };
        }

        const payment = await this.prisma.payment.findFirst({
            where,
            include: {
                debt: {
                    include: {
                        productImages: true,
                        payments: true,
                        paymentSchedules: {
                            orderBy: { installmentNumber: 'asc' }
                        }
                    }
                },
                debtor: {
                    include: {
                        phoneNumbers: true,
                        debtorImages: true
                    }
                }
            }
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        return payment;
    }

    async getDebtorPaymentHistory(sellerId: string, debtorId: string, userRole: string) {
        if (userRole !== 'ADMIN') {
            const debtor = await this.prisma.debtor.findFirst({
                where: { id: debtorId, sellerId }
            });

            if (!debtor) {
                throw new NotFoundException('Debtor not found or access denied');
            }
        }

        const payments = await this.prisma.payment.findMany({
            where: { debtorId },
            include: {
                debt: {
                    select: {
                        productName: true,
                        amount: true,
                        paid: true,
                        date: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const totalPaid = payments.reduce((sum, payment) => sum.add(payment.amount), new Decimal(0));

        return {
            debtorId,
            totalPaid,
            paymentCount: payments.length,
            payments
        };
    }

    async getDebtPaymentSchedule(sellerId: string, debtId: string, userRole: string) {
        const where: any = { id: debtId };

        if (userRole !== 'ADMIN') {
            where.debtor = { sellerId };
        }

        const debt = await this.prisma.debt.findFirst({
            where,
            include: {
                paymentSchedules: {
                    orderBy: { installmentNumber: 'asc' }
                },
                payments: true,
                debtor: {
                    select: {
                        fullName: true
                    }
                }
            }
        });

        if (!debt) {
            throw new NotFoundException('Debt not found or access denied');
        }

        const totalPaid = debt.payments.reduce((sum, payment) => sum.add(payment.amount), new Decimal(0));
        const remainingAmount = debt.amount.sub(totalPaid);

        return {
            debt: {
                id: debt.id,
                productName: debt.productName,
                totalAmount: debt.amount,
                totalPaid,
                remainingAmount,
                paid: debt.paid,
                debtor: debt.debtor
            },
            paymentSchedules: debt.paymentSchedules
        };
    }
}