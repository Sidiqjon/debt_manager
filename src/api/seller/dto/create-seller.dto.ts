import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';

export enum SellerRole {
  SELLER = 'SELLER'
}

export class CreateSellerDto {
  @ApiProperty({
    description: 'Full name of the seller',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({
    description: 'Phone number of the seller',
    example: '+998901234567',
    pattern: '^\\+998[0-9]{9}$'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+998[0-9]{9}$/, {
    message: 'Phone number must be in format +998xxxxxxxxx'
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Email address of the seller',
    example: 'john.doe@example.com'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Unique username for the seller',
    example: 'johndoe123',
    minLength: 3,
    maxLength: 50
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores'
  })
  username: string;

  @ApiProperty({
    description: 'Password for the seller account',
    example: 'StrongPassword123!',
    minLength: 4
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  })
  password: string;

  @ApiProperty({
    description: 'Profile image filename',
    example: 'profile_123456789.jpg',
    required: false
  })
  @IsOptional()
  @IsString()
  image?: string;
}