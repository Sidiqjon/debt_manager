import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, MinLength, MaxLength, IsBoolean, Matches } from 'class-validator';

export class UpdateAdminDto {
  @ApiProperty({
    description: 'Full name of the admin',
    example: 'John Doe Updated',
    minLength: 2,
    maxLength: 50,
    required: false
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  fullName?: string;

  @ApiProperty({
    description: 'Phone number of the admin',
    example: '+998901234567',
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
    description: 'Email address of the admin',
    example: 'updated-admin@example.com',
    required: false
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Unique username for login',
    example: 'updated_admin123',
    minLength: 3,
    maxLength: 20,
    required: false
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers and underscores'
  })
  username?: string;

  // @ApiProperty({
  //   description: 'New password for the admin account',
  //   example: 'NewSecurePassword123!',
  //   minLength: 8,
  //   required: false
  // })
  // @IsOptional()
  // @IsString()
  // @MinLength(8)
  // @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
  //   message: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
  // })
  // password?: string;

  @ApiProperty({
    description: 'Image filename for admin profile',
    example: 'updated-admin-profile-456.jpg',
    required: false
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({
    description: 'Active status of the admin (only SUPER admin can change this)',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}