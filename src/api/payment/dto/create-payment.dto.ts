import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString, IsEnum, IsDateString, Min, IsNumber, IsArray, ArrayMinSize, IsPositive } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Decimal } from '@prisma/client/runtime/library';

export enum PaymentType {
  MONTHLY_PAYMENT = 'MONTHLY_PAYMENT',
  ANY_AMOUNT_PAYMENT = 'ANY_AMOUNT_PAYMENT',
  MULTIPLE_MONTHS_PAYMENT = 'MULTIPLE_MONTHS_PAYMENT'
}

export class CreatePaymentDto {
  // @ApiProperty({
  //   description: 'Debtor ID',
  //   example: '123e4567-e89b-12d3-a456-426614174000'
  // })
  // @IsUUID()
  // debtorId: string;

  @ApiProperty({
    description: 'Debt ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  debtId: string;

  @ApiProperty({
    description: 'Payment type',
    enum: PaymentType,
    example: PaymentType.MONTHLY_PAYMENT,
    enumName: 'PaymentType'
  })
  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @ApiPropertyOptional({
    description: 'Payment amount (required for ANY_AMOUNT_PAYMENT)',
    example: 500000,
    type: 'number'
  })
  @IsOptional()
  @Transform(({ value }) => value ? new Decimal(value) : undefined)
  amount?: Decimal;

  @ApiPropertyOptional({
    description: 'Array of payment schedule IDs for MULTIPLE_MONTHS_PAYMENT',
    example: ['123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  scheduleIds?: string[];

  @ApiPropertyOptional({
    description: 'Payment date (optional, defaults to now)',
    example: '2024-01-15T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;
}

export class PaymentQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?:number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    default: 10
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @ApiPropertyOptional({
    description: 'Search by debtor name or product name',
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

  @ApiPropertyOptional({
    description: 'Payment type filter',
    enum: PaymentType
  })
  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;
}