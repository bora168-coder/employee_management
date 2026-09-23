import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser, createUserSchema, Role, updateUserSchema } from '@csbms/shared';
import { z } from 'zod';
import { CurrentUser, Roles } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@Roles(Role.SUPER_ADMIN)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createUserSchema)) body: z.output<typeof createUserSchema>,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.users.create(body, actor);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: z.output<typeof updateUserSchema>,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.users.update(id, body, actor);
  }
}
