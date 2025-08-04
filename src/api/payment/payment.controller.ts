import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto, PaymentQueryDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Roles } from '../../common/decorator/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @Roles('SELLER')
  @ApiOperation({ 
    summary: 'Create a new payment',
    description: 'Create payment with three types: MONTHLY_PAYMENT, ANY_AMOUNT_PAYMENT, or MULTIPLE_MONTHS_PAYMENT'
  })
  @ApiResponse({ status: 201, description: 'Payment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid payment data' })
  @ApiResponse({ status: 404, description: 'Debt not found or access denied' })
  async createPayment(
    @Req() req: any,
    @Body() createPaymentDto: CreatePaymentDto
  ) {
    return this.paymentService.createPayment(req.user.id, createPaymentDto);
  }

  @Get()
  @Roles('SELLER', 'ADMIN', 'SUPER')
  @ApiOperation({ 
    summary: 'Get all payments with pagination and search',
    description: 'Retrieve payments with filtering, searching, and pagination. Sellers see only their payments, admins see all.'
  })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async getAllPayments(
    @Req() req: any,
    @Query() query: PaymentQueryDto
  ) {
    return this.paymentService.getAllPayments(req.user.id, query, req.user.role);
  }

  @Get(':id')
  @Roles('SELLER', 'ADMIN', 'SUPER')
  @ApiOperation({ summary: 'Get payment details by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentById(
    @Req() req: any,
    @Param('id') id: string
  ) {
    return this.paymentService.getPaymentById(req.user.id, id, req.user.role);
  }

  @Delete(':id')
  @Roles('SELLER')
  @ApiOperation({ 
    summary: 'Delete a payment',
    description: 'Delete payment and revert payment schedule status. Only sellers can delete their own payments.'
  })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found or access denied' })
  async deletePayment(
    @Req() req: any,
    @Param('id') id: string
  ) {
    return this.paymentService.deletePayment(req.user.id, id);
  }

  @Get('debtor/:debtorId/history')
  @Roles('SELLER', 'ADMIN', 'SUPER')
  @ApiOperation({ 
    summary: 'Get payment history for a debtor',
    description: 'Retrieve complete payment history and summary for a specific debtor'
  })
  @ApiParam({ name: 'debtorId', description: 'Debtor ID' })
  @ApiResponse({ status: 200, description: 'Payment history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Debtor not found or access denied' })
  async getDebtorPaymentHistory(
    @Req() req: any,
    @Param('debtorId') debtorId: string
  ) {
    return this.paymentService.getDebtorPaymentHistory(req.user.id, debtorId, req.user.role);
  }

  @Get('debt/:debtId/schedule')
  @Roles('SELLER', 'ADMIN', 'SUPER')
  @ApiOperation({ 
    summary: 'Get payment schedule for a debt',
    description: 'Retrieve detailed payment schedule with progress and recent payments for a specific debt'
  })
  @ApiParam({ name: 'debtId', description: 'Debt ID' })
  @ApiResponse({ status: 200, description: 'Payment schedule retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Debt not found or access denied' })
  async getDebtPaymentSchedule(
    @Req() req: any,
    @Param('debtId') debtId: string
  ) {
    return this.paymentService.getDebtPaymentSchedule(req.user.id, debtId, req.user.role);
  }
}