import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthUser, Role } from '@csbms/shared';
import type { Response } from 'express';
import { ClientIp, CurrentUser, Roles } from '../../common/decorators';
import { ATTACHMENT_MAX_BYTES, AttachmentsService, PHOTO_MAX_BYTES } from './attachments.service';
import { contentDisposition } from './file-type';

const EDITORS = [Role.SUPER_ADMIN, Role.HR_ADMIN];

@ApiTags('attachments')
@Controller('employees/:id')
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post('photo')
  @HttpCode(204)
  @Roles(...EDITORS)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: PHOTO_MAX_BYTES, files: 1 } }))
  uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
    @ClientIp() ip: string | null,
  ) {
    return this.attachments.uploadPhoto(id, file, user, ip);
  }

  @Get('photo')
  async photo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const obj = await this.attachments.getPhoto(id, user);
    res.set({ 'Content-Type': obj.contentType, 'Cache-Control': 'private, no-cache' });
    return new StreamableFile(obj.body);
  }

  @Get('attachments')
  list(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.attachments.list(id, user);
  }

  @Post('attachments')
  @HttpCode(204)
  @Roles(...EDITORS)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: ATTACHMENT_MAX_BYTES, files: 1 } }),
  )
  upload(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('category') category: string | undefined,
    @CurrentUser() user: AuthUser,
    @ClientIp() ip: string | null,
  ) {
    return this.attachments.upload(id, file, category, user, ip);
  }

  @Get('attachments/:attachmentId/download')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const obj = await this.attachments.download(id, attachmentId, user);
    res.set({
      'Content-Type': obj.contentType,
      'Content-Disposition': contentDisposition(obj.fileName),
      'Cache-Control': 'private, no-store',
    });
    return new StreamableFile(obj.body);
  }

  @Delete('attachments/:attachmentId')
  @HttpCode(204)
  @Roles(...EDITORS)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: AuthUser,
    @ClientIp() ip: string | null,
  ) {
    return this.attachments.remove(id, attachmentId, user, ip);
  }
}
