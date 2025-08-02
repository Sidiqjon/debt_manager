import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    description: 'ID of the debtor who will receive the message',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @IsNotEmpty()
  @IsUUID()
  to: string;

  @ApiProperty({
    description: 'Message content to be sent to the debtor',
    example: 'Dear John, your payment of $1500 for Laptop is due on 2024-12-01. Please contact us if you have any questions.',
    maxLength: 2000,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  message: string;
}