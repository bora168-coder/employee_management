import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AttachmentCategory, AttachmentView, AuthUser } from '@csbms/shared';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { nextStatus } from '../employees/employee-workflow';
import { EmployeesService } from '../employees/employees.service';
import { StorageService } from '../storage/storage.service';
import { detectFileType } from './file-type';

export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
/** 4×6 photo ratio */
const PHOTO_WIDTH = 400;
const PHOTO_HEIGHT = 600;

const badFile = (message: string) =>
  new BadRequestException({
    error: 'INVALID_FILE',
    message,
    details: [{ field: 'file', message }],
  });

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly employees: EmployeesService,
    private readonly audit: AuditService,
  ) {}

  async uploadPhoto(
    employeeId: string,
    file: Express.Multer.File | undefined,
    user: AuthUser,
    ip: string | null,
  ) {
    if (!file) throw badFile('Please choose a file');
    const type = detectFileType(file.buffer);
    if (type !== 'image/jpeg' && type !== 'image/png') throw badFile('Photo must be JPEG or PNG');

    const employee = await this.employees.loadInScope(employeeId, user);
    const status = nextStatus(employee.status, 'edit');

    let jpeg: Buffer;
    try {
      jpeg = await sharp(file.buffer)
        .rotate()
        .resize(PHOTO_WIDTH, PHOTO_HEIGHT, { fit: 'cover', position: 'attention' })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch {
      throw badFile('The image could not be read');
    }

    const key = `employees/${employeeId}/photo.jpg`;
    await this.storage.put(key, jpeg, 'image/jpeg');
    await this.prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: employeeId },
        data: {
          photoKey: key,
          status,
          version: { increment: 1 },
          ...(employee.status === 'VERIFIED' ? { verifiedAt: null, verifiedById: null } : {}),
        },
      });
      await this.audit.log(
        {
          userId: user.id,
          action: 'UPLOAD',
          entity: 'Employee',
          entityId: employeeId,
          after: { photo: 'updated' },
          ip,
        },
        tx,
      );
    });
  }

  async getPhoto(employeeId: string, user: AuthUser) {
    const employee = await this.employees.loadInScope(employeeId, user);
    if (!employee.photoKey)
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'No photo' });
    return this.storage.get(employee.photoKey);
  }

  async list(employeeId: string, user: AuthUser): Promise<AttachmentView[]> {
    await this.employees.loadInScope(employeeId, user);
    const rows = await this.prisma.attachment.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { fullName: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
      category: r.category,
      uploadedBy: r.uploadedBy?.fullName ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async upload(
    employeeId: string,
    file: Express.Multer.File | undefined,
    category: string | undefined,
    user: AuthUser,
    ip: string | null,
  ): Promise<void> {
    if (!file) throw badFile('Please choose a file');
    const type = detectFileType(file.buffer);
    if (!type) throw badFile('File must be PDF, JPEG or PNG');
    const cat = (category ?? 'OTHER') as AttachmentCategory;
    if (!Object.values(AttachmentCategory).includes(cat)) throw badFile('Unknown category');

    await this.employees.loadInScope(employeeId, user);
    const id = randomUUID();
    const key = `employees/${employeeId}/attachments/${id}`;
    // Multer decodes names as latin1; convert back to UTF-8 so Khmer names survive.
    const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8').slice(0, 200);

    await this.storage.put(key, file.buffer, type);
    await this.prisma.attachment.create({
      data: {
        id,
        employeeId,
        objectKey: key,
        fileName,
        mimeType: type,
        sizeBytes: file.size,
        category: cat,
        uploadedById: user.id,
      },
    });
    await this.audit.log({
      userId: user.id,
      action: 'UPLOAD',
      entity: 'Employee',
      entityId: employeeId,
      after: { attachment: fileName, category: cat },
      ip,
    });
  }

  async download(employeeId: string, attachmentId: string, user: AuthUser) {
    const row = await this.findInScope(employeeId, attachmentId, user);
    return { ...(await this.storage.get(row.objectKey)), fileName: row.fileName };
  }

  async remove(
    employeeId: string,
    attachmentId: string,
    user: AuthUser,
    ip: string | null,
  ): Promise<void> {
    const row = await this.findInScope(employeeId, attachmentId, user);
    await this.prisma.attachment.delete({ where: { id: row.id } });
    await this.storage.delete(row.objectKey);
    await this.audit.log({
      userId: user.id,
      action: 'DELETE',
      entity: 'Employee',
      entityId: employeeId,
      before: { attachment: row.fileName },
      ip,
    });
  }

  private async findInScope(employeeId: string, attachmentId: string, user: AuthUser) {
    await this.employees.loadInScope(employeeId, user);
    const row = await this.prisma.attachment.findFirst({ where: { id: attachmentId, employeeId } });
    if (!row) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Attachment not found' });
    return row;
  }
}
