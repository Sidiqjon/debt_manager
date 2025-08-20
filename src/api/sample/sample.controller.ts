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
import { SampleService } from './sample.service';
import { CreateSampleDto } from './dto/create-sample.dto';
import { UpdateSampleDto } from './dto/update-sample.dto';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Roles } from '../../common/decorator/roles.decorator';
import { AdminRole } from '../../api/admin/dto/create-admin.dto';
import { SellerRole } from '../../api/seller/dto/create-seller.dto';

@ApiTags('Samples')
@Controller('samples')
export class SampleController {
    constructor(private readonly sampleService: SampleService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(SellerRole.SELLER)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new sample message template' })
    @ApiResponse({ status: 201, description: 'Sample created successfully' })
    @ApiResponse({ status: 400, description: 'Failed to create sample' })
    async createSample(@Body() createSampleDto: CreateSampleDto, @Req() request: any) {
        const sellerId = request.user?.sub;
        return this.sampleService.createSample(createSampleDto, sellerId);
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(AdminRole.ADMIN, AdminRole.SUPER, SellerRole.SELLER)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all sample messages with pagination, search and filters' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Number of items per page' })
    @ApiQuery({ name: 'search', required: false, type: String, example: 'payment', description: 'Search by message content or seller name' })
    @ApiQuery({ name: 'verified', required: false, type: Boolean, example: true, description: 'Filter by verification status' })
    // @ApiQuery({ name: 'sellerId', required: false, type: String, example: '550e8400-e29b-41d4-a716-446655440000', description: 'Filter samples by specific seller ID (Admin only)' })
    @ApiResponse({ status: 200, description: 'Samples retrieved successfully' })
    @ApiResponse({ status: 400, description: 'Failed to retrieve samples' })
    async getAllSamples(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10000',
        @Query('search') search?: string,
        @Query('verified') verified?: string,
        // @Query('sellerId') sellerId?: string,
        @Req() request?: any,
    ) {
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const requesterId = request.user?.sub;
        const requesterRole = request.user?.role;

        const filters = {
            verified: verified !== undefined ? verified === 'true' : undefined,
            // sellerId,
        };

        return this.sampleService.getAllSamples(pageNumber, limitNumber, search, filters, requesterId, requesterRole);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(AdminRole.ADMIN, AdminRole.SUPER, SellerRole.SELLER)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get sample message by ID' })
    @ApiParam({ name: 'id', type: 'string', example: 'uuid', description: 'Sample ID' })
    @ApiResponse({ status: 200, description: 'Sample retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Sample not found' })
    @ApiResponse({ status: 403, description: 'Access denied' })
    async getSampleById(@Param('id') id: string, @Req() request: any) {
        const requesterId = request.user?.sub;
        const requesterRole = request.user?.role;
        return this.sampleService.getSampleById(id, requesterId, requesterRole);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(AdminRole.ADMIN, AdminRole.SUPER, SellerRole.SELLER)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update sample message' })
    @ApiParam({ name: 'id', type: 'string', example: 'uuid', description: 'Sample ID' })
    @ApiResponse({ status: 200, description: 'Sample updated successfully' })
    @ApiResponse({ status: 404, description: 'Sample not found' })
    @ApiResponse({ status: 403, description: 'Access denied' })
    async updateSample(
        @Param('id') id: string,
        @Body() updateSampleDto: UpdateSampleDto,
        @Req() request: any,
    ) {
        const requesterId = request.user?.sub;
        const requesterRole = request.user?.role;
        return this.sampleService.updateSample(id, updateSampleDto, requesterId, requesterRole);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(AdminRole.ADMIN, AdminRole.SUPER, SellerRole.SELLER)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete sample message' })
    @ApiParam({ name: 'id', type: 'string', example: 'uuid', description: 'Sample ID' })
    @ApiResponse({ status: 200, description: 'Sample deleted successfully' })
    @ApiResponse({ status: 404, description: 'Sample not found' })
    @ApiResponse({ status: 403, description: 'Access denied' })
    async deleteSample(@Param('id') id: string, @Req() request: any) {
        const requesterId = request.user?.sub;
        const requesterRole = request.user?.role;
        return this.sampleService.deleteSample(id, requesterId, requesterRole);
    }

    // @Patch(':id/verify')
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles(AdminRole.ADMIN, AdminRole.SUPER)
    // @ApiBearerAuth()
    // @ApiOperation({ summary: 'Verify or unverify a sample message (Admin only)' })
    // @ApiParam({ name: 'id', type: 'string', example: 'uuid', description: 'Sample ID' })
    // @ApiResponse({ status: 200, description: 'Sample verification status updated successfully' })
    // @ApiResponse({ status: 404, description: 'Sample not found' })
    // @ApiResponse({ status: 403, description: 'Access denied' })
    // async toggleSampleVerification(@Param('id') id: string, @Req() request: any) {
    //     const requesterId = request.user?.sub;
    //     const requesterRole = request.user?.role;
    //     return this.sampleService.toggleSampleVerification(id, requesterId, requesterRole);
    // }
}