import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma/prisma.service';
import { CreatePaymentDto, PaymentQueryDto, PaymentType } from './dto/create-payment.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async createPayment(sellerId: string, createPaymentDto: CreatePaymentDto) {
    const { debtorId, debtId, paymentType, amount, scheduleIds, paymentDate } = createPaymentDto;

    const debt = await this.prisma.debt.findFirst({
      where: {
        id: debtId,
        debtorId: debtorId,
        debtor: { sellerId }
      },
      include: {
        debtor: true,
        payments: true,
        paymentSchedules: {
          orderBy: { dueDate: 'asc' }
        }
      }
    });

    if (!debt) {
      throw new NotFoundException('Debt not found or access denied');
    }

    if (debt.paid) {
      throw new BadRequestException('Debt is already fully paid');
    }

    const result = await this.prisma.$transaction(async (prisma) => {
      let payment;
      let totalPaymentAmount = new Decimal(0);

      switch (paymentType) {
        case PaymentType.MONTHLY_PAYMENT:
          payment = await this.handleMonthlyPayment(prisma, debt, paymentDate);
          totalPaymentAmount = payment.amount;
          break;

        case PaymentType.ANY_AMOUNT_PAYMENT:
          if (!amount) {
            throw new BadRequestException('Amount is required for any amount payment');
          }
          payment = await this.handleAnyAmountPayment(prisma, debt, amount, paymentDate);
          totalPaymentAmount = amount;
          break;

        case PaymentType.MULTIPLE_MONTHS_PAYMENT:
          if (!scheduleIds || scheduleIds.length === 0) {
            throw new BadRequestException('Schedule IDs are required for multiple months payment');
          }
          payment = await this.handleMultipleMonthsPayment(prisma, debt, scheduleIds, paymentDate);
          totalPaymentAmount = payment.amount;
          break;

        default:
          throw new BadRequestException('Invalid payment type');
      }

      await this.checkAndUpdateDebtStatus(prisma, debtId);

      return payment;
    });

    return {
      statusCode: 201,
      message: 'Payment created successfully',
      data: result
    };
  }

  private async handleMonthlyPayment(prisma: any, debt: any, paymentDate?: string) {
    const nextUnpaidSchedule = debt.paymentSchedules.find(schedule => !schedule.isPaid);
    
    if (!nextUnpaidSchedule) {
      throw new BadRequestException('All payments are already completed');
    }

    await prisma.paymentSchedule.update({
      where: { id: nextUnpaidSchedule.id },
      data: {
        isPaid: true,
        paidDate: paymentDate ? new Date(paymentDate) : new Date(),
        paidAmount: nextUnpaidSchedule.amount
      }
    });

    return await prisma.payment.create({
      data: {
        debtorId: debt.debtorId,
        debtId: debt.id,
        amount: nextUnpaidSchedule.amount,
        createdAt: paymentDate ? new Date(paymentDate) : new Date()
      },
      include: {
        debt: { select: { productName: true } },
        debtor: { select: { fullName: true } }
      }
    });
  }

  private async handleAnyAmountPayment(prisma: any, debt: any, amount: Decimal, paymentDate?: string) {
    const totalPaid = debt.payments.reduce((sum, payment) => sum.add(payment.amount), new Decimal(0));
    const remainingDebt = debt.amount.sub(totalPaid);

    if (amount.gt(remainingDebt)) {
      throw new BadRequestException(`Payment amount cannot exceed remaining debt: ${remainingDebt}`);
    }

    let remainingPayment = amount;
    const unpaidSchedules = debt.paymentSchedules.filter(schedule => !schedule.isPaid);

    for (const schedule of unpaidSchedules) {
      if (remainingPayment.lte(0)) break;

      const unpaidAmount = schedule.amount.sub(schedule.paidAmount);
      
      if (remainingPayment.gte(unpaidAmount)) {
        await prisma.paymentSchedule.update({
          where: { id: schedule.id },
          data: {
            isPaid: true,
            paidDate: paymentDate ? new Date(paymentDate) : new Date(),
            paidAmount: schedule.amount
          }
        });
        remainingPayment = remainingPayment.sub(unpaidAmount);
      } else {
        await prisma.paymentSchedule.update({
          where: { id: schedule.id },
          data: {
            paidAmount: schedule.paidAmount.add(remainingPayment)
          }
        });
        remainingPayment = new Decimal(0);
      }
    }

    return await prisma.payment.create({
      data: {
        debtorId: debt.debtorId,
        debtId: debt.id,
        amount: amount,
        createdAt: paymentDate ? new Date(paymentDate) : new Date()
      },
      include: {
        debt: { select: { productName: true } },
        debtor: { select: { fullName: true } }
      }
    });
  }

  private async handleMultipleMonthsPayment(prisma: any, debt: any, scheduleIds: string[], paymentDate?: string) {
    const schedules = await prisma.paymentSchedule.findMany({
      where: {
        id: { in: scheduleIds },
        debtId: debt.id,
        isPaid: false
      }
    });

    if (schedules.length !== scheduleIds.length) {
      throw new BadRequestException('Some payment schedules not found or already paid');
    }

    const currentDate = paymentDate ? new Date(paymentDate) : new Date();
    let totalAmount = new Decimal(0);

    for (const schedule of schedules) {
      await prisma.paymentSchedule.update({
        where: { id: schedule.id },
        data: {
          isPaid: true,
          paidDate: currentDate,
          paidAmount: schedule.amount
        }
      });
      totalAmount = totalAmount.add(schedule.amount);
    }

    return await prisma.payment.create({
      data: {
        debtorId: debt.debtorId,
        debtId: debt.id,
        amount: totalAmount,
        createdAt: currentDate
      },
      include: {
        debt: { select: { productName: true } },
        debtor: { select: { fullName: true } }
      }
    });
  }

  private async checkAndUpdateDebtStatus(prisma: any, debtId: string) {
    const unpaidSchedules = await prisma.paymentSchedule.count({
      where: { debtId, isPaid: false }
    });

    if (unpaidSchedules === 0) {
      await prisma.debt.update({
        where: { id: debtId },
        data: { paid: true }
      });
    }
  }

  async getAllPayments(sellerId: string, query: PaymentQueryDto, userRole: string) {
    const { page = 1, limit = 10, search, debtorId, debtId, paymentType } = query;
    const skip = (page - 1) * limit;

    const where: any = userRole === 'ADMIN' || userRole === 'SUPER' ? {} : {
      debtor: { sellerId }
    };

    if (search) {
      where.OR = [
        { debtor: { fullName: { contains: search, mode: 'insensitive' } } },
        { debt: { productName: { contains: search, mode: 'insensitive' } } }
      ];
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
              phoneNumbers: { select: { number: true } }
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
      statusCode: 200,
      message: 'Payments retrieved successfully',
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
    
    if (userRole !== 'ADMIN' && userRole !== 'SUPER') {
      where.debtor = { sellerId };
    }

    const payment = await this.prisma.payment.findFirst({
      where,
      include: {
        debt: {
          include: {
            productImages: true,
            payments: {
              orderBy: { createdAt: 'desc' }
            },
            paymentSchedules: {
              orderBy: { dueDate: 'asc' }
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

    return {
      statusCode: 200,
      message: 'Payment retrieved successfully',
      data: payment
    };
  }

  async deletePayment(sellerId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        debtor: { sellerId }
      },
      include: {
        debt: {
          include: {
            paymentSchedules: {
              where: { paidDate: { not: null } },
              orderBy: { paidDate: 'desc' }
            }
          }
        }
      }
    });

    if (!payment) {
      throw new NotFoundException('Payment not found or access denied');
    }

    await this.prisma.$transaction(async (prisma) => {
      const paymentAmount = payment.amount;
      let remainingAmount = paymentAmount;

      const paidSchedules = payment.debt.paymentSchedules
        .filter(schedule => schedule.paidDate && new Date(schedule.paidDate) <= payment.createdAt)
        .sort((a, b) => new Date(b.paidDate!).getTime() - new Date(a.paidDate!).getTime());

      for (const schedule of paidSchedules) {
        if (remainingAmount.lte(0)) break;

        if (schedule.isPaid && remainingAmount.gte(schedule.amount)) {
          await prisma.paymentSchedule.update({
            where: { id: schedule.id },
            data: {
              isPaid: false,
              paidDate: null,
              paidAmount: new Decimal(0)
            }
          });
          remainingAmount = remainingAmount.sub(schedule.amount);
        } else if (remainingAmount.lt(schedule.amount) && remainingAmount.gt(0)) {
          const newPaidAmount = schedule.paidAmount.sub(remainingAmount);
          await prisma.paymentSchedule.update({
            where: { id: schedule.id },
            data: {
              paidAmount: newPaidAmount.gte(0) ? newPaidAmount : new Decimal(0),
              isPaid: newPaidAmount.gte(schedule.amount)
            }
          });
          remainingAmount = new Decimal(0);
        }
      }

      await prisma.debt.update({
        where: { id: payment.debtId },
        data: { paid: false }
      });

      await prisma.payment.delete({
        where: { id: paymentId }
      });
    });

    return {
      statusCode: 200,
      message: 'Payment deleted successfully'
    };
  }

  async getDebtorPaymentHistory(sellerId: string, debtorId: string, userRole: string) {
    if (userRole !== 'ADMIN' && userRole !== 'SUPER') {
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

    const debtor = await this.prisma.debtor.findUnique({
      where: { id: debtorId },
      select: {
        fullName: true,
        debts: {
          select: {
            amount: true,
            paid: true
          }
        }
      }
    });

    const totalDebt = debtor?.debts.reduce((sum, debt) => sum.add(debt.amount), new Decimal(0)) || new Decimal(0);
    const remainingDebt = totalDebt.sub(totalPaid);

    return {
      statusCode: 200,
      message: 'Payment history retrieved successfully',
      data: {
        debtor: {
          id: debtorId,
          fullName: debtor?.fullName
        },
        summary: {
          totalDebt,
          totalPaid,
          remainingDebt,
          paymentCount: payments.length
        },
        payments
      }
    };
  }

  async getDebtPaymentSchedule(sellerId: string, debtId: string, userRole: string) {
    const where: any = { id: debtId };
    
    if (userRole !== 'ADMIN' && userRole !== 'SUPER') {
      where.debtor = { sellerId };
    }

    const debt = await this.prisma.debt.findFirst({
      where,
      include: {
        paymentSchedules: {
          orderBy: { dueDate: 'asc' }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        },
        debtor: {
          select: {
            fullName: true,
            phoneNumbers: { select: { number: true } }
          }
        }
      }
    });

    if (!debt) {
      throw new NotFoundException('Debt not found or access denied');
    }

    const totalPaid = debt.payments.reduce((sum, payment) => sum.add(payment.amount), new Decimal(0));
    const remainingAmount = debt.amount.sub(totalPaid);
    const paidSchedules = debt.paymentSchedules.filter(schedule => schedule.isPaid).length;
    const totalSchedules = debt.paymentSchedules.length;

    return {
      statusCode: 200,
      message: 'Payment schedule retrieved successfully',
      data: {
        debt: {
          id: debt.id,
          productName: debt.productName,
          totalAmount: debt.amount,
          totalPaid,
          remainingAmount,
          paid: debt.paid,
          debtor: debt.debtor
        },
        progress: {
          paidSchedules,
          totalSchedules,
          completionPercentage: totalSchedules > 0 ? Math.round((paidSchedules / totalSchedules) * 100) : 0
        },
        paymentSchedules: debt.paymentSchedules,
        recentPayments: debt.payments.slice(0, 5)
      }
    };
  }
}