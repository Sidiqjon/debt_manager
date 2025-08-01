import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  Req,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { SellerService } from './seller.service';
import { CreateSellerDto } from './dto/create-seller.dto';
import { UpdateSellerDto, UpdateSellerPasswordDto, RequestPasswordResetDto, VerifyOtpDto } from './dto/update-seller.dto';
import { SellerLoginDto } from './dto/seller-login.dto';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Roles } from '../../common/decorator/roles.decorator';
import { Public } from '../../common/decorator/public.decorator';
import { AdminRole } from '../../api/admin/dto/create-admin.dto';
import { SellerRole } from './dto/create-seller.dto';
import { CookieGetter } from 'src/common/decorator/cookie-getter.decorator';

@ApiTags('Sellers')
@Controller('sellers')
export class SellerController {
  constructor(private readonly sellerService: SellerService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new seller',
    description: 'Creates a new seller account. Only accessible by Admin and Super Admin roles.',
  })
  @ApiResponse({
    status: 201,
    description: 'Seller created successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 201 },
        message: { type: 'string', example: 'Seller created successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            fullName: { type: 'string', example: 'John Doe' },
            phoneNumber: { type: 'string', example: '+998901234567' },
            email: { type: 'string', example: 'john.doe@example.com' },
            username: { type: 'string', example: 'johndoe123' },
            image: { type: 'string', nullable: true, example: 'profile_123.jpg' },
            balance: { type: 'string', example: '0' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Seller with this email/username/phone already exists',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - insufficient permissions',
  })
  async createSeller(@Body() createSellerDto: CreateSellerDto) {
    return this.sellerService.createSeller(createSellerDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Seller login',
    description: 'Authenticates a seller and returns access and refresh tokens.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Login successful' },
        accessToken: { type: 'string', example: 'jwt_access_token' },
        refreshToken: { type: 'string', example: 'jwt_refresh_token' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account deactivated',
  })
  async loginSeller(
    @Body() loginDto: SellerLoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.sellerService.loginSeller(loginDto);

    response.clearCookie('refresh_token_seller');

    response.cookie('refresh_token_seller', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      statusCode: result.statusCode,
      message: result.message,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generates a new access token using the refresh token from cookies.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Token refreshed successfully' },
        data: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', example: 'new_jwt_access_token' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
  })
  async refreshToken(@Req() request: Request) {
    const refreshToken = request.cookies?.refresh_token_seller;
    if (!refreshToken) {
      return {
        statusCode: 401,
        message: 'Refresh token not found',
        data: null,
      };
    }
    return this.sellerService.refreshAccessToken(refreshToken);
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Seller logout',
    description: 'Logs out the seller by removing the refresh token cookie.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logged out successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Refresh token is not available',
  })
  async logout(
    @CookieGetter('refresh_token_seller') refresh_token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.sellerService.logout(refresh_token, res);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all sellers',
    description: 'Retrieves all sellers with pagination and search functionality. Only accessible by Admin and Super Admin roles.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for username, full name, email, or phone number',
    example: 'john',
  })
  @ApiResponse({
    status: 200,
    description: 'Sellers retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Sellers retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            sellers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'uuid' },
                  fullName: { type: 'string', example: 'John Doe' },
                  phoneNumber: { type: 'string', example: '+998901234567' },
                  email: { type: 'string', example: 'john.doe@example.com' },
                  username: { type: 'string', example: 'johndoe123' },
                  image: { type: 'string', nullable: true, example: 'profile_123.jpg' },
                  balance: { type: 'string', example: '1000.50' },
                  isActive: { type: 'boolean', example: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 10 },
                total: { type: 'number', example: 50 },
                pages: { type: 'number', example: 5 },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - insufficient permissions',
  })
  async getAllSellers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    return this.sellerService.getAllSellers(pageNumber, limitNumber, search);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER, SellerRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get seller by ID',
    description: 'Retrieves a specific seller by ID. Admins can access any seller, sellers can only access their own data.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Seller ID',
    example: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Seller retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Seller retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            fullName: { type: 'string', example: 'John Doe' },
            phoneNumber: { type: 'string', example: '+998901234567' },
            email: { type: 'string', example: 'john.doe@example.com' },
            username: { type: 'string', example: 'johndoe123' },
            image: { type: 'string', nullable: true, example: 'profile_123.jpg' },
            balance: { type: 'string', example: '1000.50' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Seller not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied',
  })
  async getSellerById(@Param('id') id: string, @Req() request: any) {
    const requesterId = request.user?.sub;
    const requesterRole = request.user?.role;
    return this.sellerService.getSellerById(id, requesterId, requesterRole);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER, SellerRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update seller profile',
    description: 'Updates seller profile. Sellers can update limited fields, admins can update all fields except balance.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Seller ID',
    example: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Seller updated successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Seller updated successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            fullName: { type: 'string', example: 'John Doe Updated' },
            phoneNumber: { type: 'string', example: '+998901234568' },
            email: { type: 'string', example: 'john.updated@example.com' },
            username: { type: 'string', example: 'johndoe123updated' },
            image: { type: 'string', nullable: true, example: 'profile_456.jpg' },
            balance: { type: 'string', example: '1000.50' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Seller not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Username/email/phone already exists',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied',
  })
  async updateSeller(
    @Param('id') id: string,
    @Body() updateSellerDto: UpdateSellerDto,
    @Req() request: any,
  ) {
    const requesterId = request.user?.sub;
    const requesterRole = request.user?.role;
    return this.sellerService.updateSeller(id, updateSellerDto, requesterId, requesterRole);
  }

  @Public()
  @Post('request-password-reset')
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Sends an OTP to the seller\'s email for password reset.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'OTP sent to your email successfully' },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Seller with this email not found',
  })
  async requestPasswordReset(@Body() requestDto: RequestPasswordResetDto) {
    return this.sellerService.requestPasswordReset(requestDto);
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation({
    summary: 'Verify OTP',
    description: 'Verifies the OTP sent to the seller\'s email for password reset.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'OTP verified successfully' },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired OTP',
  })
  @ApiResponse({
    status: 404,
    description: 'Seller with this email not found',
  })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.sellerService.verifyOtp(verifyOtpDto);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password with OTP',
    description: 'Resets seller password using OTP verification.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Password reset successfully' },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired OTP',
  })
  @ApiResponse({
    status: 404,
    description: 'Seller with this email not found',
  })
  async resetPassword(@Body() resetDto: UpdateSellerPasswordDto) {
    return this.sellerService.resetPassword(resetDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete seller',
    description: 'Deletes a seller account. Only accessible by Admin and Super Admin roles.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Seller ID',
    example: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Seller deleted successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Seller deleted successfully' },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Seller not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - insufficient permissions',
  })
  async deleteSeller(@Param('id') id: string) {
    return this.sellerService.deleteSeller(id);
  }
}