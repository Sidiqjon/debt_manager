import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '../../api/admin/dto/create-admin.dto';

export const Roles = (...roles: AdminRole[]) => SetMetadata('roles', roles);