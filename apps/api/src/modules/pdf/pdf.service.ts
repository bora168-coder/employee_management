import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { AuthUser } from '@csbms/shared';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Browser, chromium } from 'playwright-core';
import { APP_ENV, AppEnv } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmployeesService } from '../employees/employees.service';
import { StorageService } from '../storage/storage.service';
import { renderBiographyHtml } from './biography-template';

/**
 * Renders the official biography form. Khmer shaping (subscript consonants,
 * vowels) is done by a real browser engine, which PDF libraries often get wrong.
 */
@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browser?: Promise<Browser>;
  private fontCss?: Promise<string>;

  constructor(
    private readonly employees: EmployeesService,
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  async html(id: string, user: AuthUser): Promise<{ html: string; nameLatin: string }> {
    const employee = await this.employees.getForPrint(id, user);
    const [photoDataUri, fontCss, unitPath] = await Promise.all([
      this.photoDataUri(employee.photoKey),
      this.loadFontCss(),
      this.unitPath(employee.organizationUnit.id),
    ]);
    return {
      html: renderBiographyHtml({ employee, photoDataUri, fontCss, unitPath }),
      nameLatin: employee.nameLatin,
    };
  }

  async pdf(
    id: string,
    user: AuthUser,
    ip: string | null,
  ): Promise<{ pdf: Buffer; fileName: string }> {
    const { html, nameLatin } = await this.html(id, user);
    const browser = await this.getBrowser();
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      // No network access is needed: fonts and photo are embedded.
      await page.route('**/*', (route) => route.abort());
      await page.setContent(html, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
      await this.audit.log({
        userId: user.id,
        action: 'PRINT',
        entity: 'Employee',
        entityId: id,
        ip,
      });
      const safe = nameLatin.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'employee';
      return { pdf, fileName: `biography_${safe}.pdf` };
    } finally {
      await context.close();
    }
  }

  async onModuleDestroy() {
    if (this.browser) await (await this.browser).close().catch(() => undefined);
  }

  private getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = chromium
        .launch({
          executablePath: this.env.CHROMIUM_EXECUTABLE_PATH || undefined,
          args: ['--no-sandbox'],
        })
        .then((b) => {
          b.on('disconnected', () => (this.browser = undefined));
          return b;
        })
        .catch((e) => {
          this.browser = undefined;
          this.logger.error(`Cannot start Chromium: ${(e as Error).message}`);
          throw e;
        });
    }
    return this.browser;
  }

  private async photoDataUri(key: string | null): Promise<string | null> {
    if (!key) return null;
    try {
      const buf = await this.storage.getBuffer(key);
      return `data:image/jpeg;base64,${buf.toString('base64')}`;
    } catch {
      this.logger.warn(`Photo missing in storage: ${key}`);
      return null;
    }
  }

  /** Unit names from the top parent down, e.g. ["ខេត្តកំពង់ស្ពឺ", "រដ្ឋបាលស្រុកថ្ពង"]. */
  private async unitPath(unitId: string): Promise<string[]> {
    const names: string[] = [];
    let id: string | null = unitId;
    for (let depth = 0; id && depth < 10; depth++) {
      const unit: { nameKh: string; parentId: string | null } | null =
        await this.prisma.organizationUnit.findUnique({
          where: { id },
          select: { nameKh: true, parentId: true },
        });
      if (!unit) break;
      names.unshift(unit.nameKh);
      id = unit.parentId;
    }
    return names;
  }

  /** Embeds Kantumruy Pro (OFL license) so the PDF looks the same on every server. */
  private loadFontCss(): Promise<string> {
    if (!this.fontCss) {
      this.fontCss = (async () => {
        const dir = path.join(
          path.dirname(require.resolve('@fontsource/kantumruy-pro/package.json')),
          'files',
        );
        const faces: string[] = [];
        for (const weight of [400, 700]) {
          for (const subset of ['khmer', 'latin']) {
            const file = path.join(dir, `kantumruy-pro-${subset}-${weight}-normal.woff2`);
            const data = await fs.readFile(file);
            faces.push(
              `@font-face{font-family:'Kantumruy Pro';font-weight:${weight};font-style:normal;src:url(data:font/woff2;base64,${data.toString('base64')}) format('woff2');}`,
            );
          }
        }
        return faces.join('\n');
      })();
    }
    return this.fontCss;
  }
}
