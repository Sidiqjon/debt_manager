import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdateSampleDto {
  @ApiProperty({
    description: 'Sample message content or template',
    example: 'Updated: Dear {customer_name}, your payment of ${amount} is due on {due_date}. Please contact us for any questions.',
    maxLength: 2000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiProperty({
    description: 'Whether the sample message is verified by admin',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}