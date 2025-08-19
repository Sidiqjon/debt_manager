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
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Roles } from '../../common/decorator/roles.decorator';
import { AdminRole } from '../../api/admin/dto/create-admin.dto';
import { SellerRole } from '../../api/seller/dto/create-seller.dto';

@ApiTags('Messages')
@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SellerRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create and send a message to debtor' })
  @ApiResponse({ status: 201, description: 'Message created and sent successfully' })
  @ApiResponse({ status: 400, description: 'Failed to create or send message' })
  @ApiResponse({ status: 404, description: 'Debtor not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async createMessage(@Body() createMessageDto: CreateMessageDto, @Req() request: any) {
    const sellerId = request.user?.sub;
    return this.messageService.createMessage(createMessageDto, sellerId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER, SellerRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all messages with pagination, search and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Number of items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'payment due', description: 'Search by message content, debtor name, or seller name' })
  @ApiQuery({ name: 'debtorId', required: false, type: String, example: '550e8400-e29b-41d4-a716-446655440000', description: 'Filter messages by specific debtor ID' })
  @ApiQuery({ name: 'sent', required: false, type: Boolean, example: true, description: 'Filter by message sending status' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, example: '2024-01-01', description: 'Filter messages created from this date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, example: '2024-12-31', description: 'Filter messages created until this date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Failed to retrieve messages' })
  async getAllMessages(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10000',
    @Query('search') search?: string,
    @Query('debtorId') debtorId?: string,
    @Query('sent') sent?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Req() request?: any,
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const requesterId = request.user?.sub;
    const requesterRole = request.user?.role;
    
    const filters = {
      debtorId,
      sent: sent !== undefined ? sent === 'true' : undefined,
      dateFrom,
      dateTo,
    };

    return this.messageService.getAllMessages(pageNumber, limitNumber, search, filters, requesterId, requesterRole);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER, SellerRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get message by ID' })
  @ApiParam({ name: 'id', type: 'string', example: 'uuid', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getMessageById(@Param('id') id: string, @Req() request: any) {
    const requesterId = request.user?.sub;
    const requesterRole = request.user?.role;
    return this.messageService.getMessageById(id, requesterId, requesterRole);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER, SellerRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update message content (does not affect sending status)' })
  @ApiParam({ name: 'id', type: 'string', example: 'uuid', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async updateMessage(
    @Param('id') id: string,
    @Body() updateMessageDto: UpdateMessageDto,
    @Req() request: any,
  ) {
    const requesterId = request.user?.sub;
    const requesterRole = request.user?.role;
    return this.messageService.updateMessage(id, updateMessageDto, requesterId, requesterRole);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER, SellerRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete message' })
  @ApiParam({ name: 'id', type: 'string', example: 'uuid', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async deleteMessage(@Param('id') id: string, @Req() request: any) {
    const requesterId = request.user?.sub;
    const requesterRole = request.user?.role;
    return this.messageService.deleteMessage(id, requesterId, requesterRole);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER, SellerRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete all messages from a debtor', description: 'Deletes all messages from a debtor' })
  @ApiResponse({ status: 200, description: 'Messages deleted successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async deleteAllMessages(@Param('debtorId') debtorId: string) {
    return this.messageService.deleteAllMessages( debtorId);
  }

  @Post(':id/resend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SellerRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend a message to debtor' })
  @ApiParam({ name: 'id', type: 'string', example: 'uuid', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message resent successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async resendMessage(@Param('id') id: string, @Req() request: any) {
    const requesterId = request.user?.sub;
    const requesterRole = request.user?.role;
    return this.messageService.resendMessage(id, requesterId, requesterRole);
  }

}