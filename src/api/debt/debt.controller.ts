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
import { DebtService } from './debt.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Roles } from '../../common/decorator/roles.decorator';
import { AdminRole } from '../../api/admin/dto/create-admin.dto';
import { SellerRole } from '../../api/seller/dto/create-seller.dto';

@ApiTags('Debts')
@Controller('debts')
export class DebtController {
    constructor(private readonly debtService: DebtService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(SellerRole.SELLER)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new debt for a debtor' })
    @ApiResponse({ status: 201, description: 'Debt created successfully' })
    @ApiResponse({ status: 400, description: 'Failed to create debt' })
    @ApiResponse({ status: 404, description: 'Debtor not found' })
    @ApiResponse({ status: 403, description: 'Access denied' })
    async createDebt(@Body() createDebtDto: CreateDebtDto, @Req() request: any) {
        const sellerId = request.user?.sub;
        return this.debtService.createDebt(createDebtDto, sellerId);
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(AdminRole.ADMIN, AdminRole.SUPER, SellerRole.SELLER)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all debts with pagination, search and filters' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Number of items per page' })
    @ApiQuery({ name: 'search', required: false, type: String, example: 'Laptop', description: 'Search by product name, debtor name, or comment' })
    @ApiQuery({ name: 'debtorId', required: false, type: String, example: '550e8400-e29b-41d4-a716-446655440000', description: 'Filter debts by specific debtor ID' })
    @ApiQuery({ name: 'paid', required: false, type: Boolean, example: false, description: 'Filter by payment status' })
    @ApiQuery({ name: 'deadline', required: false, type: String, example: 'TWELVE_MONTHS', description: 'Filter by deadline period' })
    @ApiQuery({ name: 'dateFrom', required: false, type: String, example: '2024-01-01', description: 'Filter debts created from this date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'dateTo', required: false, type: String, example: '2024-12-31', description: 'Filter debts created until this date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'amountMin', required: false, type: Number, example: 100, description: 'Minimum debt amount' })
    @ApiQuery({ name: 'amountMax', required: false, type: Number, example: 5000, description: 'Maximum debt amount' })
    @ApiResponse({ status: 200, description: 'Debts retrieved successfully' })
    @ApiResponse({ status: 400, description: 'Failed to retrieve debts' })
    async getAllDebts(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
        @Query('search') search?: string,
        @Query('debtorId') debtorId?: string,
        @Query('paid') paid?: string,
        @Query('deadline') deadline?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
        @Query('amountMin') amountMin?: string,
        @Query('amountMax') amountMax?: string,
        @Req() request?: any,
    ) {
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const requesterId = request.user?.sub;
        const requesterRole = request.user?.role;

        const filters = {
            paid: paid !== undefined ? paid === 'true' : undefined,
            debtorId,
            deadline,
            dateFrom,
            dateTo,
            amountMin: amountMin ? parseFloat(amountMin) : undefined,
            amountMax: amountMax ? parseFloat(amountMax) : undefined,
        };

        return this.debtService.getAllDebts(pageNumber, limitNumber, search, filters, requesterId, requesterRole);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(AdminRole.ADMIN, AdminRole.SUPER, SellerRole.SELLER)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get debt by ID' })
    @ApiParam({ name: 'id', type: 'string', example: 'uuid', description: 'Debt ID' })
    @ApiResponse({ status: 200, description: 'Debt retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Debt not found' })
    @ApiResponse({ status: 403, description: 'Access denied' })
    async getDebtById(@Param('id') id: string, @Req() request: any) {
        const requesterId = request.user?.sub;
        const requesterRole = request.user?.role;
        return this.debtService.getDebtById(id, requesterId, requesterRole);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(AdminRole.ADMIN, AdminRole.SUPER, SellerRole.SELLER)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update debt' })
    @ApiParam({ name: 'id', type: 'string', example: 'uuid', description: 'Debt ID' })
    @ApiResponse({ status: 200, description: 'Debt updated successfully' })
    @ApiResponse({ status: 404, description: 'Debt not found' })
    @ApiResponse({ status: 403, description: 'Access denied' })
    async updateDebt(
        @Param('id') id: string,
        @Body() updateDebtDto: UpdateDebtDto,
        @Req() request: any,
    ) {
        const requesterId = request.user?.sub;
        const requesterRole = request.user?.role;
        return this.debtService.updateDebt(id, updateDebtDto, requesterId, requesterRole);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(AdminRole.ADMIN, AdminRole.SUPER, SellerRole.SELLER)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete debt' })
    @ApiParam({ name: 'id', type: 'string', example: 'uuid', description: 'Debt ID' })
    @ApiResponse({ status: 200, description: 'Debt deleted successfully' })
    @ApiResponse({ status: 404, description: 'Debt not found' })
    @ApiResponse({ status: 403, description: 'Access denied' })
    async deleteDebt(@Param('id') id: string, @Req() request: any) {
        const requesterId = request.user?.sub;
        const requesterRole = request.user?.role;
        return this.debtService.deleteDebt(id, requesterId, requesterRole);
    }
}