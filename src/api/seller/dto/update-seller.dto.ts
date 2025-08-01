import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, MinLength, MaxLength, Matches, IsBoolean, IsDecimal } from 'class-validator';

export class UpdateSellerDto {
  @ApiProperty({
    description: 'Full name of the seller',
    example: 'John Doe Updated',
    minLength: 2,
    maxLength: 100,
    required: false
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiProperty({
    description: 'Phone number of the seller',
    example: '+998901234568',
    pattern: '^\\+998[0-9]{9}$',
    required: false
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+998[0-9]{9}$/, {
    message: 'Phone number must be in format +998xxxxxxxxx'
  })
  phoneNumber?: string;

  @ApiProperty({
    description: 'Email address of the seller',
    example: 'john.updated@example.com',
    required: false
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Unique username for the seller',
    example: 'johndoe123updated',
    minLength: 3,
    maxLength: 50,
    required: false
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores'
  })
  username?: string;

  @ApiProperty({
    description: 'Profile image filename',
    example: 'profile_987654321.jpg',
    required: false
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({
    description: 'Active status of the seller (Admin only)',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSellerPasswordDto {
  @ApiProperty({
    description: 'Email address for OTP verification',
    example: 'john.doe@example.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'New password',
    example: 'NewStrongPassword123!',
    minLength: 4
  })
  @IsString()
  @MinLength(4)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  })
  newPassword: string;
}

export class RequestPasswordResetDto {
  @ApiProperty({
    description: 'Email address to send OTP',
    example: 'john.doe@example.com'
  })
  @IsEmail()
  email: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'OTP code sent to email',
    example: '123456',
    minLength: 6,
    maxLength: 6
  })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  @Matches(/^\d{6}$/, {
    message: 'OTP must be exactly 6 digits'
  })
  otp: string;
}