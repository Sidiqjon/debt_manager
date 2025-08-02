import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma/prisma.service';
import { CreateSampleDto } from './dto/create-sample.dto';
import { UpdateSampleDto } from './dto/update-sample.dto';

@Injectable()
export class SampleService {
    constructor(private readonly prisma: PrismaService) { }

    async createSample(createSampleDto: CreateSampleDto, sellerId: string) {
        try {
            const sample = await this.prisma.sample.create({
                data: {
                    sellerId,
                    message: createSampleDto.message,
                },
                include: {
                    seller: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true,
                        },
                    },
                },
            });

            return {
                statusCode: 201,
                message: 'Sample created successfully',
                data: sample,
            };
        } catch (error) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Failed to create sample',
            });
        }
    }

    async getAllSamples(
        page: number = 1,
        limit: number = 10,
        search?: string,
        filters?: any,
        requesterId?: string,
        requesterRole?: string
    ) {
        try {
            const skip = (page - 1) * limit;
            let where: any = {};

            if (requesterRole === 'SELLER') {
                where.sellerId = requesterId;
            }

            // if (filters?.sellerId && (requesterRole === 'ADMIN' || requesterRole === 'SUPER')) {
            //     where.sellerId = filters.sellerId;
            // }

            if (search) {
                where.OR = [
                    { message: { contains: search, mode: 'insensitive' } },
                    { seller: { fullName: { contains: search, mode: 'insensitive' } } },
                    { seller: { username: { contains: search, mode: 'insensitive' } } },
                ];
            }

            if (filters?.verified !== undefined) {
                where.verified = filters.verified;
            }

            const [samples, total] = await Promise.all([
                this.prisma.sample.findMany({
                    where,
                    skip,
                    take: limit,
                    include: {
                        seller: {
                            select: {
                                id: true,
                                fullName: true,
                                username: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.sample.count({ where }),
            ]);

            return {
                statusCode: 200,
                message: 'Samples retrieved successfully',
                data: {
                    samples,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit),
                    },
                },
            };
        } catch (error) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Failed to retrieve samples',
            });
        }
    }

    async getSampleById(id: string, requesterId?: string, requesterRole?: string) {
        try {
            const sample = await this.prisma.sample.findUnique({
                where: { id },
                include: {
                    seller: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true,
                        },
                    },
                },
            });

            if (!sample) {
                throw new NotFoundException({
                    statusCode: 404,
                    message: 'Sample not found',
                });
            }

            if (requesterRole === 'SELLER' && requesterId !== sample.sellerId) {
                throw new UnauthorizedException({
                    statusCode: 403,
                    message: 'Access denied. Seller can only access their own samples',
                });
            }

            return {
                statusCode: 200,
                message: 'Sample retrieved successfully',
                data: sample,
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
                throw error;
            }
            throw new BadRequestException({
                statusCode: 400,
                message: 'Failed to retrieve sample',
            });
        }
    }

    async updateSample(id: string, updateSampleDto: UpdateSampleDto, requesterId?: string, requesterRole?: string) {
        try {
            const existingSample = await this.prisma.sample.findUnique({
                where: { id },
            });

            if (!existingSample) {
                throw new NotFoundException({
                    statusCode: 404,
                    message: 'Sample not found',
                });
            }

            if (requesterRole === 'SELLER' && requesterId !== existingSample.sellerId) {
                throw new UnauthorizedException({
                    statusCode: 403,
                    message: 'Access denied. Seller can only update their own samples',
                });
            }

            const updateData: any = {};

            if (updateSampleDto.message !== undefined) {
                updateData.message = updateSampleDto.message;
            }

            if (updateSampleDto.verified !== undefined) {
                updateData.verified = updateSampleDto.verified;
            } 


            // else if (updateSampleDto.verified !== undefined && requesterRole === 'SELLER') {
            //     throw new UnauthorizedException({
            //         statusCode: 403,
            //         message: 'Access denied. Only admins can update verification status',
            //     });
            // }


            const updatedSample = await this.prisma.sample.update({
                where: { id },
                data: updateData,
                include: {
                    seller: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true,
                        },
                    },
                },
            });

            return {
                statusCode: 200,
                message: 'Sample updated successfully',
                data: updatedSample,
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
                throw error;
            }
            throw new BadRequestException({
                statusCode: 400,
                message: 'Failed to update sample',
            });
        }
    }

    async deleteSample(id: string, requesterId?: string, requesterRole?: string) {
        try {
            const sample = await this.prisma.sample.findUnique({
                where: { id },
            });

            if (!sample) {
                throw new NotFoundException({
                    statusCode: 404,
                    message: 'Sample not found',
                });
            }

            if (requesterRole === 'SELLER' && requesterId !== sample.sellerId) {
                throw new UnauthorizedException({
                    statusCode: 403,
                    message: 'Access denied. Seller can only delete their own samples',
                });
            }

            await this.prisma.sample.delete({
                where: { id },
            });

            return {
                statusCode: 200,
                message: 'Sample deleted successfully',
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
                throw error;
            }
            throw new BadRequestException({
                statusCode: 400,
                message: 'Failed to delete sample',
            });
        }
    }

    // async toggleSampleVerification(id: string, requesterId?: string, requesterRole?: string) {
    //     try {
    //         const sample = await this.prisma.sample.findUnique({
    //             where: { id },
    //             include: {
    //                 seller: {
    //                     select: {
    //                         id: true,
    //                         fullName: true,
    //                         username: true,
    //                     },
    //                 },
    //             },
    //         });

    //         if (!sample) {
    //             throw new NotFoundException({
    //                 statusCode: 404,
    //                 message: 'Sample not found',
    //             });
    //         }

    //         const updatedSample = await this.prisma.sample.update({
    //             where: { id },
    //             data: {
    //                 verified: !sample.verified,
    //             },
    //             include: {
    //                 seller: {
    //                     select: {
    //                         id: true,
    //                         fullName: true,
    //                         username: true,
    //                     },
    //                 },
    //             },
    //         });

    //         return {
    //             statusCode: 200,
    //             message: `Sample ${updatedSample.verified ? 'verified' : 'unverified'} successfully`,
    //             data: updatedSample,
    //         };
    //     } catch (error) {
    //         if (error instanceof NotFoundException) {
    //             throw error;
    //         }
    //         throw new BadRequestException({
    //             statusCode: 400,
    //             message: 'Failed to update sample verification status',
    //         });
    //     }
    // }
}