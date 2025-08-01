import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SellerLoginDto {
  @ApiProperty({
    description: 'Username of the seller',
    example: 'johndoe123'
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'Password of the seller',
    example: 'StrongPassword123!'
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}