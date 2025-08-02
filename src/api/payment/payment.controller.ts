import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto, CreateScheduledPaymentDto, PaymentQueryDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Roles } from '../../common/decorator/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @Roles('SELLER')
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({ status: 201, description: 'Payment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Debt not found' })
  async createPayment(
    @Req() req: any,
    @Body() createPaymentDto: CreatePaymentDto
  ) {
    return this.paymentService.createPayment(req.user.id, createPaymentDto);
  }

  @Post('schedule')
  @Roles('SELLER')
  @ApiOperation({ summary: 'Create payment schedule for a debt' })
  @ApiResponse({ status: 201, description: 'Payment schedule created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Debt not found' })
  async createScheduledPayment(
    @Req() req: any,
    @Body() createScheduledPaymentDto: CreateScheduledPaymentDto
  ) {
    return this.paymentService.createScheduledPayment(req.user.id, createScheduledPaymentDto);
  }

  @Get()
  @Roles('SELLER', 'ADMIN', 'SUPER')
  @ApiOperation({ summary: 'Get all payments with pagination and search' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async getAllPayments(
    @Req() req: any,
    @Query() query: PaymentQueryDto
  ) {
    return this.paymentService.getAllPayments(req.user.id, query, req.user.role);
  }

  @Get(':id')
  @Roles('SELLER', 'ADMIN', 'SUPER')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentById(
    @Req() req: any,
    @Param('id') id: string
  ) {
    return this.paymentService.getPaymentById(req.user.id, id, req.user.role);
  }

  @Get('debtor/:debtorId/history')
  @Roles('SELLER', 'ADMIN', 'SUPER')
  @ApiOperation({ summary: 'Get payment history for a debtor' })
  @ApiResponse({ status: 200, description: 'Payment history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Debtor not found' })
  async getDebtorPaymentHistory(
    @Req() req: any,
    @Param('debtorId') debtorId: string
  ) {
    return this.paymentService.getDebtorPaymentHistory(req.user.id, debtorId, req.user.role);
  }

  @Get('debt/:debtId/schedule')
  @Roles('SELLER', 'ADMIN', 'SUPER')
  @ApiOperation({ summary: 'Get payment schedule for a debt' })
  @ApiResponse({ status: 200, description: 'Payment schedule retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Debt not found' })
  async getDebtPaymentSchedule(
    @Req() req: any,
    @Param('debtId') debtId: string
  ) {
    return this.paymentService.getDebtPaymentSchedule(req.user.id, debtId, req.user.role);
  }
}