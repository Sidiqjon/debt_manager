import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsEnum, IsDecimal, IsArray, IsBoolean, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export enum DeadlinePeriod {
  ONE_MONTH = 'ONE_MONTH',
  TWO_MONTHS = 'TWO_MONTHS',
  THREE_MONTHS = 'THREE_MONTHS',
  FOUR_MONTHS = 'FOUR_MONTHS',
  FIVE_MONTHS = 'FIVE_MONTHS',
  SIX_MONTHS = 'SIX_MONTHS',
  SEVEN_MONTHS = 'SEVEN_MONTHS',
  EIGHT_MONTHS = 'EIGHT_MONTHS',
  NINE_MONTHS = 'NINE_MONTHS',
  TEN_MONTHS = 'TEN_MONTHS',
  ELEVEN_MONTHS = 'ELEVEN_MONTHS',
  TWELVE_MONTHS = 'TWELVE_MONTHS',
}

export class UpdateDebtDto {
  @ApiProperty({
    description: 'Name of the product or service',
    example: 'Laptop Dell XPS 15 - Updated',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiProperty({
    description: 'Date when the debt was created (ISO 8601 format)',
    example: '2024-01-15T10:30:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({
    description: 'Payment deadline period for this debt',
    enum: DeadlinePeriod,
    example: DeadlinePeriod.SIX_MONTHS,
    required: false,
  })
  @IsOptional()
  @IsEnum(DeadlinePeriod)
  deadline?: DeadlinePeriod;

  @ApiProperty({
    description: 'Additional comment or note about this debt',
    example: 'Updated payment terms negotiated',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({
    description: 'Total amount of the debt',
    example: 1599.99,
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiProperty({
    description: 'Whether the debt has been fully paid',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  paid?: boolean;

  @ApiProperty({
    description: 'Array of product image filenames. Pass empty array to remove all images.',
    example: ['updated_product1.jpg', 'updated_product2.png'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}