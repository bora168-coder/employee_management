import { Controller, Get, Header, Param, ParseUUIDPipe, Res, StreamableFile } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '@csbms/shared';
import type { Response } from 'express';
import { ClientIp, CurrentUser } from '../../common/decorators';
import { contentDisposition } from '../attachments/file-type';
import { PdfService } from './pdf.service';

@ApiTags('print')
@Controller('employees/:id')
export class PdfController {
  constructor(private readonly pdf: PdfService) {}

  /** HTML preview of the official form (same layout as the PDF). */
  @Get('print')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'private, no-store')
  async print(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return (await this.pdf.html(id, user)).html;
  }

  @Get('pdf')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @ClientIp() ip: string | null,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { pdf, fileName } = await this.pdf.pdf(id, user, ip);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': contentDisposition(fileName, true),
      'Cache-Control': 'private, no-store',
    });
    return new StreamableFile(pdf);
  }
}
