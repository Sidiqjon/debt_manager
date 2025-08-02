import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateSampleDto {
  @ApiProperty({
    description: 'Sample message content or template',
    example: 'Dear {customer_name}, your payment of ${amount} is due on {due_date}. Please contact us for any questions.',
    maxLength: 2000,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  message: string;
}