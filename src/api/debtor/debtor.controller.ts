import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { DebtorService } from './debtor.service';
import { CreateDebtorDto } from './dto/create-debtor.dto';
import { UpdateDebtorDto } from './dto/update-debtor.dto';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Roles } from '../../common/decorator/roles.decorator';
import { AdminRole } from '../../api/admin/dto/create-admin.dto';
import { SellerRole } from '../../api/seller/dto/create-seller.dto';

@ApiTags('Debtors')
@Controller('debtors')
export class DebtorController {
  constructor(private readonly debtorService: DebtorService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER, SellerRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new debtor' })
  @ApiResponse({ status: 201, description: 'Debtor created successfully' })
  @ApiResponse({ status: 400, description: 'Failed to create debtor' })
  async createDebtor(@Body() createDebtorDto: CreateDebtorDto, @Req() request: any) {
    const sellerId = request.user?.sub;
    return this.debtorService.createDebtor(createDebtorDto, sellerId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER, SellerRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all debtors with pagination and search' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 ,description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Number of items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'John', description: 'Debtor can be searched by name, address or phoneNumber.' })
  @ApiResponse({ status: 200, description: 'Debtors retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Failed to retrieve debtors' })
  async getAllDebtors(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Req() request?: any,
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const requesterId = request.user?.sub;
    const requesterRole = request.user?.role;
    return this.debtorService.getAllDebtors(pageNumber, limitNumber, search, requesterId, requesterRole);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER, SellerRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get debtor by ID' })
  @ApiParam({ name: 'id', type: 'string', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Debtor retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Debtor not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getDebtorById(@Param('id') id: string, @Req() request: any) {
    const requesterId = request.user?.sub;
    const requesterRole = request.user?.role;
    return this.debtorService.getDebtorById(id, requesterId, requesterRole);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER, SellerRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update debtor' })
  @ApiParam({ name: 'id', type: 'string', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Debtor updated successfully' })
  @ApiResponse({ status: 404, description: 'Debtor not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async updateDebtor(
    @Param('id') id: string,
    @Body() updateDebtorDto: UpdateDebtorDto,
    @Req() request: any,
  ) {
    const requesterId = request.user?.sub;
    const requesterRole = request.user?.role;
    return this.debtorService.updateDebtor(id, updateDebtorDto, requesterId, requesterRole);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER, SellerRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete debtor' })
  @ApiParam({ name: 'id', type: 'string', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Debtor deleted successfully' })
  @ApiResponse({ status: 404, description: 'Debtor not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async deleteDebtor(@Param('id') id: string, @Req() request: any) {
    const requesterId = request.user?.sub;
    const requesterRole = request.user?.role;
    return this.debtorService.deleteDebtor(id, requesterId, requesterRole);
  }
}