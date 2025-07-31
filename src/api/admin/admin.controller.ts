import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpStatus,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { LoginDto, RefreshTokenDto, LoginResponseDto, AccessTokenResponseDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Roles } from '../../common/decorator/roles.decorator';
import { AdminRole } from './dto/create-admin.dto';
import { CookieGetter } from 'src/common/decorator/cookie-getter.decorator';
import { Response } from 'express';
import { Request as RequestType } from 'express';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('create-super-admin')
  @ApiOperation({
    summary: 'Create Super Admin(One Time API)',
    description: 'Creates the first and only super admin. Can only be done once.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Super admin created successfully',
    type: CreateAdminDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Super admin already exists or username/email taken',
  })
  @ApiBody({ type: CreateAdminDto })
  async createSuperAdmin(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.createSuperAdmin(createAdminDto);
  }

  @Post('create-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create Admin',
    description: 'Creates a new admin. Only SUPER admin can perform this action.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Admin created successfully',
    type: CreateAdminDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only SUPER admin can create admins',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Username or email already exists',
  })
  @ApiBody({ type: CreateAdminDto })
  async createAdmin(@Body() createAdminDto: CreateAdminDto, @Request() req) {
    return this.adminService.createAdmin(createAdminDto, req.user.sub);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Admin Login',
    description: 'Login for both SUPER and regular admins'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials or inactive admin',
  })
  @ApiBody({ type: LoginDto })

  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.adminService.login(loginDto, res);
  }

  @Post('refresh-token')
    @ApiOperation({
      summary: 'Refresh Access Token',
      description: 'Generate new access token using refresh token from cookie',
    })
    @ApiResponse({
      status: 200,
      description: 'New access token generated',
      type: AccessTokenResponseDto,
    })
    @ApiResponse({
      status: 401,
      description: 'Invalid refresh token',
    })
    async refreshToken(@Req() req: RequestType) {
      const refreshToken = req.cookies?.refresh_token_admin;

      if (!refreshToken) {
        throw new UnauthorizedException('Refresh token not found');
      }

      return this.adminService.refreshAccessToken(refreshToken);
    }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin Logout',
    description: 'Logout admin and invalidate refresh token'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logged out successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Refresh token is required',
  })
  
  async logout(
    @CookieGetter('refresh_token_admin') refresh_token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.adminService.logout(refresh_token, res);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get All Admins',
    description: 'Retrieve all admins in the system'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all admins',
    isArray: true,
  })
  async findAll() {
    return this.adminService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get Admin by ID',
    description: 'Retrieve a specific admin by their ID'
  })
  @ApiParam({
    name: 'id',
    description: 'Admin ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Admin details',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Admin not found',
  })
  async findOne(@Param('id') id: string) {
    return this.adminService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update Admin Profile',
    description: 'Update admin profile. Only SUPER admin can change isActive status.'
  })
  @ApiParam({
    name: 'id',
    description: 'Admin ID to update',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Admin updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Admin not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only SUPER admin can change admin status',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Username or email already exists',
  })
  @ApiBody({ type: UpdateAdminDto })
  async update(
    @Param('id') id: string,
    @Body() updateAdminDto: UpdateAdminDto,
    @Request() req
  ) {
    return this.adminService.update(id, updateAdminDto, req.user.sub, req.user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete Admin',
    description: 'Delete an admin. Only SUPER admin can perform this action. Cannot delete SUPER admin.'
  })
  @ApiParam({
    name: 'id',
    description: 'Admin ID to delete',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Admin deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Admin not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only SUPER admin can delete admins or cannot delete SUPER admin',
  })
  async remove(@Param('id') id: string, @Request() req) {
    return this.adminService.remove(id, req.user.sub);
  }
}