import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, IsOptional, IsEnum, Matches } from 'class-validator';

export enum AdminRole {
  SUPER = 'SUPER',
  ADMIN = 'ADMIN'
}

export class CreateAdminDto {
  @ApiProperty({
    description: 'Full name of the admin',
    example: 'John Doe',
    minLength: 2,
    maxLength: 50
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  fullName: string;

  @ApiProperty({
    description: 'Phone number of the admin',
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
    description: 'Email address of the admin',
    example: 'admin@example.com'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Unique username for login',
    example: 'admin123',
    minLength: 3,
    maxLength: 20
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers and underscores'
  })
  username: string;

  @ApiProperty({
    description: 'Password for the admin account',
    example: 'SecurePassword123!',
    minLength: 4
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
  })
  password: string;

  @ApiProperty({
    description: 'Image filename for admin profile',
    example: 'admin-profile-123.jpg',
    required: false
  })
  @IsOptional()
  @IsString()
  image?: string;
}