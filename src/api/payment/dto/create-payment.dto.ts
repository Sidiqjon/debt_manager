import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsDecimal, IsOptional, IsString, IsEnum, IsDateString, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { Decimal } from '@prisma/client/runtime/library';

export enum PaymentType {
  FULL_PAYMENT = 'FULL_PAYMENT',
  PARTIAL_PAYMENT = 'PARTIAL_PAYMENT',
  SCHEDULED_PAYMENT = 'SCHEDULED_PAYMENT'
}

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Debtor ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  debtorId: string;

  @ApiProperty({
    description: 'Debt ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  debtId: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 100000,
    type: 'number'
  })
  @Transform(({ value }) => new Decimal(value))
  @Min(0.01)
  amount: Decimal;

  @ApiProperty({
    description: 'Payment type',
    enum: PaymentType,
    example: PaymentType.PARTIAL_PAYMENT
  })
  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @ApiPropertyOptional({
    description: 'Payment date (optional, defaults to now)',
    example: '2024-01-15T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;
}

export class CreateScheduledPaymentDto {
  @ApiProperty({
    description: 'Debt ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  debtId: string;

  @ApiProperty({
    description: 'Number of months for payment schedule',
    example: 6,
    minimum: 1,
    maximum: 12
  })
  @Min(1)
  months: number;
}

export class PaymentQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    default: 10
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search by debtor name',
    example: 'John Doe'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Debtor ID filter',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  debtorId?: string;

  @ApiPropertyOptional({
    description: 'Debt ID filter',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  debtId?: string;
}