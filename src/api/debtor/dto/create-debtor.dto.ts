import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, ArrayMinSize, MaxLength } from 'class-validator';

export class CreateDebtorDto {
  @ApiProperty({
    description: 'Full name of the debtor',
    example: 'John Smith',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({
    description: 'Address of the debtor',
    example: '123 Main Street, Tashkent',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  address: string;

  @ApiProperty({
    description: 'Additional notice or comments about the debtor',
    example: 'Prefers evening contact',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notice?: string;

  @ApiProperty({
    description: 'Array of phone numbers',
    example: ['+998901234567', '+998901234568'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  phoneNumbers: string[];

  @ApiProperty({
    description: 'Array of image filenames',
    example: ['image1.jpg', 'image2.png'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  images?: string[];
}