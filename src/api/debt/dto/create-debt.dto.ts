import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsDecimal, IsArray, IsUUID, IsNumber } from 'class-validator';
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

export class CreateDebtDto {
  @ApiProperty({
    description: 'ID of the debtor who owes this debt',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @IsNotEmpty()
  @IsUUID()
  debtorId: string;

  @ApiProperty({
    description: 'Name of the product or service',
    example: 'Laptop Dell XPS 15',
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  productName: string;

  @ApiProperty({
    description: 'Date when the debt was created (ISO 8601 format). If not provided, current date will be used.',
    example: '2024-01-15T10:30:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({
    description: 'Payment deadline period for this debt',
    enum: DeadlinePeriod,
    example: DeadlinePeriod.TWELVE_MONTHS,
    default: DeadlinePeriod.TWELVE_MONTHS,
  })
  @IsOptional()
  @IsEnum(DeadlinePeriod)
  deadline?: DeadlinePeriod;

  @ApiProperty({
    description: 'Additional comment or note about this debt',
    example: 'Purchased with 20% discount during Black Friday sale',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({
    description: 'Total amount of the debt',
    example: 1299.99,
    type: Number,
  })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Array of product image filenames',
    example: ['product1.jpg', 'product2.png'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}