import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateMessageDto {
  @ApiProperty({
    description: 'Message content to be updated',
    example: 'Updated: Dear John, your payment of $1500 for Laptop is due on 2024-12-01. Please contact us if you have any questions.',
    maxLength: 2000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}