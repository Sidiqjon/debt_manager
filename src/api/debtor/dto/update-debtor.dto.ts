import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, MaxLength } from 'class-validator';

export class UpdateDebtorDto {
  @ApiProperty({
    description: 'Full name of the debtor',
    example: 'John Smith Updated',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  fullName?: string;

  @ApiProperty({
    description: 'Address of the debtor',
    example: '456 Updated Street, Tashkent',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  address?: string;

  @ApiProperty({
    description: 'Additional notice or comments about the debtor',
    example: 'Updated notice about the debtor',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notice?: string;

  @ApiProperty({
    description: 'Array of phone numbers (replaces all existing)',
    example: ['+998901234567', '+998901234568'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  phoneNumbers?: string[];

  @ApiProperty({
    description: 'Array of image filenames (replaces all existing)',
    example: ['new_image1.jpg', 'new_image2.png'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  images?: string[];
}