import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import request from 'supertest';
import { createApp, Fixture, login, ORIGIN, personal, resetDb, seedFixture } from './helpers';

const API = '/api/v1';

describe('CSBMS API (e2e)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  let fx: Fixture;

  beforeAll(async () => {
    await resetDb(prisma);
    fx = await seedFixture(prisma);
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('health', () => {
    it('reports database and storage', async () => {
      const res = await request(app.getHttpServer()).get(`${API}/health`).expect(200);
      expect(res.body.checks).toEqual({ database: 'up', storage: 'up' });
    });
  });

  describe('auth', () => {
    it('rejects requests without a session', async () => {
      const res = await request(app.getHttpServer()).get(`${API}/employees`).expect(401);
      expect(res.body.error).toBe('UNAUTHENTICATED');
    });

    it('logs in, returns the user, and sets httpOnly cookies', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/auth/login`)
        .send({ username: 'HR', password: 'Password123!' })
        .expect(200);
      expect(res.body).toMatchObject({ username: 'hr', role: 'HR_ADMIN' });
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.join(';')).toMatch(/csbms_at=.*HttpOnly/);
      expect(cookies.join(';')).toMatch(/csbms_rt=.*Path=\/api\/v1\/auth/);
    });

    it('locks the account after 5 wrong passwords', async () => {
      const server = app.getHttpServer();
      for (let i = 0; i < 5; i++) {
        await request(server)
          .post(`${API}/auth/login`)
          .send({ username: 'viewer', password: 'wrong' })
          .expect(401);
      }
      const res = await request(server)
        .post(`${API}/auth/login`)
        .send({ username: 'viewer', password: 'Password123!' })
        .expect(423);
      expect(res.body.error).toBe('ACCOUNT_LOCKED');
      await prisma.user.update({ where: { username: 'viewer' }, data: { lockedUntil: null } });
    });

    it('rotates refresh tokens and detects reuse', async () => {
      const server = app.getHttpServer();
      const loginRes = await request(server)
        .post(`${API}/auth/login`)
        .send({ username: 'head', password: 'Password123!' })
        .expect(200);
      const rt = (loginRes.headers['set-cookie'] as unknown as string[]).find((c) =>
        c.startsWith('csbms_rt='),
      )!;
      const oldCookie = rt.split(';')[0];

      await request(server).post(`${API}/auth/refresh`).set('Cookie', oldCookie).expect(200);
      // Using the old token again = stolen token: rejected and all sessions revoked.
      await request(server).post(`${API}/auth/refresh`).set('Cookie', oldCookie).expect(401);
      const active = await prisma.refreshToken.count({
        where: { user: { username: 'head' }, revokedAt: null },
      });
      expect(active).toBe(0);
    });

    it('blocks state changes from another origin (CSRF)', async () => {
      const agent = await login(app, 'hr');
      const res = await agent
        .post(`${API}/employees`)
        .set('Origin', 'http://evil.example')
        .send(personal(fx.districtUnitId))
        .expect(403);
      expect(res.body.error).toBe('BAD_ORIGIN');
    });
  });

  describe('employee lifecycle', () => {
    let id: string;

    it('HR creates a DRAFT record with normalized values', async () => {
      const hr = await login(app, 'hr');
      const res = await hr
        .post(`${API}/employees`)
        .set('Origin', ORIGIN)
        .send(personal(fx.districtUnitId))
        .expect(201);
      id = res.body.id;
      expect(res.body).toMatchObject({
        status: 'DRAFT',
        version: 1,
        nameLatin: 'SOK SOPHEA',
        phone1: '85512345678',
        birthPlace: { label: 'ស្រុកថ្ពង ខេត្តកំពង់ស្ពឺ' },
      });
    });

    it('returns field errors for invalid input', async () => {
      const hr = await login(app, 'hr');
      const res = await hr
        .post(`${API}/employees`)
        .send(personal(fx.districtUnitId, { nationalIdNo: '12', dateOfBirth: '2020-01-01' }))
        .expect(400);
      const fields = res.body.details.map((d: { field: string }) => d.field);
      expect(fields).toEqual(expect.arrayContaining(['nationalIdNo', 'dateOfBirth']));
    });

    it('rejects a duplicate national ID', async () => {
      const hr = await login(app, 'hr');
      const res = await hr.post(`${API}/employees`).send(personal(fx.districtUnitId)).expect(409);
      expect(res.body.error).toBe('DUPLICATE');
    });

    it('rejects a location that does not match', async () => {
      const hr = await login(app, 'hr');
      const res = await hr
        .post(`${API}/employees`)
        .send(
          personal(fx.districtUnitId, { nationalIdNo: null, birthPlace: { provinceCode: '99' } }),
        )
        .expect(400);
      expect(res.body.details[0].field).toBe('birthPlace');
    });

    it('saves sections with optimistic locking', async () => {
      const hr = await login(app, 'hr');
      const work = await hr
        .put(`${API}/employees/${id}/sections/work`)
        .send({
          version: 1,
          data: {
            rankId: fx.rankId,
            workHistories: [
              {
                sector: 'MINISTRY_OF_INTERIOR',
                startDate: '2023-02-06',
                positionText: 'នាយករដ្ឋបាល',
              },
              {
                sector: 'MINISTRY_OF_INTERIOR',
                startDate: '2009-10-09',
                endDate: '2023-02-06',
                positionText: 'មន្ត្រី',
              },
            ],
          },
        })
        .expect(200);
      expect(work.body.version).toBe(2);
      expect(work.body.currentPosition).toMatchObject({
        title: 'នាយករដ្ឋបាល',
        since: '2023-02-06',
      });

      const stale = await hr
        .put(`${API}/employees/${id}/sections/awards`)
        .send({ version: 1, data: { awards: [] } })
        .expect(409);
      expect(stale.body.error).toBe('STALE_VERSION');

      await hr
        .put(`${API}/employees/${id}/sections/family`)
        .send({
          version: 2,
          data: {
            familyMembers: [{ relation: 'FATHER', name: 'សុខ សាន', isAlive: false }],
            childrenFemale: 1,
            references: [{ name: 'លី ដារ៉ា', phone: '097 777 8888' }],
          },
        })
        .expect(200);
    });

    it('rejects an unknown section', async () => {
      const hr = await login(app, 'hr');
      await hr
        .put(`${API}/employees/${id}/sections/salary`)
        .send({ version: 3, data: {} })
        .expect(400);
    });

    it('keeps other units out (scope)', async () => {
      const other = await login(app, 'hrother');
      await other.get(`${API}/employees/${id}`).expect(404);
      const list = await other.get(`${API}/employees`).expect(200);
      expect(list.body.total).toBe(0);
      await other
        .post(`${API}/employees`)
        .send(personal(fx.districtUnitId, { nationalIdNo: '999999999' }))
        .expect(403);
    });

    it('masks sensitive values for VIEWER and blocks editing', async () => {
      const viewer = await login(app, 'viewer');
      const res = await viewer.get(`${API}/employees/${id}`).expect(200);
      expect(res.body.masked).toBe(true);
      expect(res.body.nationalIdNo).toBe('012•••678');
      expect(res.body.references[0].phone).toMatch(/•/);
      await viewer
        .put(`${API}/employees/${id}/sections/awards`)
        .send({ version: 3, data: { awards: [] } })
        .expect(403);
    });

    it('runs submit → lock → verify → edit-returns-to-draft', async () => {
      const hr = await login(app, 'hr');
      const head = await login(app, 'head');

      await head.post(`${API}/employees/${id}/verify`).expect(409); // still DRAFT
      await hr.post(`${API}/employees/${id}/submit`).expect(200);

      const locked = await hr
        .put(`${API}/employees/${id}/sections/awards`)
        .send({ version: 4, data: { awards: [] } })
        .expect(409);
      expect(locked.body.error).toBe('RECORD_LOCKED');

      await hr.post(`${API}/employees/${id}/verify`).expect(403); // HR cannot verify
      const verified = await head.post(`${API}/employees/${id}/verify`).expect(200);
      expect(verified.body).toMatchObject({ status: 'VERIFIED', verifiedBy: { fullName: 'head' } });

      const edited = await hr
        .put(`${API}/employees/${id}/sections/awards`)
        .send({
          version: verified.body.version,
          data: { awards: [{ type: 'AWARD', kind: 'ប័ណ្ណសរសើរ' }] },
        })
        .expect(200);
      expect(edited.body).toMatchObject({ status: 'DRAFT', verifiedBy: null });
    });

    it('lets the unit head return a record with a comment', async () => {
      const hr = await login(app, 'hr');
      const head = await login(app, 'head');
      await hr.post(`${API}/employees/${id}/submit`).expect(200);
      await head.post(`${API}/employees/${id}/return`).send({ comment: '' }).expect(400);
      const res = await head
        .post(`${API}/employees/${id}/return`)
        .send({ comment: 'សូមបំពេញលេខទូរស័ព្ទ' })
        .expect(200);
      expect(res.body).toMatchObject({ status: 'DRAFT', returnComment: 'សូមបំពេញលេខទូរស័ព្ទ' });
    });

    it('writes an audit trail', async () => {
      const hr = await login(app, 'hr');
      const res = await hr.get(`${API}/employees/${id}/history`).expect(200);
      const actions = res.body.map((e: { action: string }) => e.action);
      expect(actions).toEqual(
        expect.arrayContaining(['CREATE', 'UPDATE', 'SUBMIT', 'VERIFY', 'RETURN', 'VIEW']),
      );
      const viewer = await login(app, 'viewer');
      await viewer.get(`${API}/employees/${id}/history`).expect(403);
    });

    it('checks uploaded file content, not the file name', async () => {
      const hr = await login(app, 'hr');
      await hr
        .post(`${API}/employees/${id}/photo`)
        .attach('file', Buffer.from('<html>not an image</html>'), {
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);

      const png = await sharp({
        create: { width: 60, height: 80, channels: 3, background: '#88aaff' },
      })
        .png()
        .toBuffer();
      await hr.post(`${API}/employees/${id}/photo`).attach('file', png, 'photo.png').expect(204);
      const photo = await hr.get(`${API}/employees/${id}/photo`).expect(200);
      expect(photo.headers['content-type']).toBe('image/jpeg');

      await hr
        .post(`${API}/employees/${id}/attachments`)
        .field('category', 'CERTIFICATE')
        .attach('file', Buffer.from('%PDF-1.4 test'), 'សញ្ញាបត្រ.pdf')
        .expect(204);
      const list = await hr.get(`${API}/employees/${id}/attachments`).expect(200);
      expect(list.body[0]).toMatchObject({
        fileName: 'សញ្ញាបត្រ.pdf',
        mimeType: 'application/pdf',
      });
      const dl = await hr
        .get(`${API}/employees/${id}/attachments/${list.body[0].id}/download`)
        .expect(200);
      expect(dl.headers['content-disposition']).toContain("filename*=UTF-8''");
    });

    it('renders the print page in Khmer', async () => {
      const hr = await login(app, 'hr');
      const res = await hr.get(`${API}/employees/${id}/print`).expect(200);
      expect(res.text).toContain('ជីវប្រវត្តិមន្ត្រីរាជការ');
      expect(res.text).toContain('សុខ សុភា');
    });

    (process.env.CHROMIUM_EXECUTABLE_PATH ? it : it.skip)('creates a PDF', async () => {
      const hr = await login(app, 'hr');
      const res = await hr.get(`${API}/employees/${id}/pdf`).buffer(true).expect(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.body.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('returns report numbers limited to the user scope', async () => {
      const hr = await login(app, 'hr');
      const mine = await hr.get(`${API}/reports/summary`).expect(200);
      expect(mine.body.total).toBe(1);
      const other = await login(app, 'hrother');
      expect((await other.get(`${API}/reports/summary`).expect(200)).body.total).toBe(0);
      const xlsx = await hr.get(`${API}/reports/employees.xlsx`).buffer(true).expect(200);
      expect(xlsx.headers['content-type']).toContain('spreadsheetml');
    });

    it('soft-deletes', async () => {
      const hr = await login(app, 'hr');
      await hr.delete(`${API}/employees/${id}`).expect(204);
      await hr.get(`${API}/employees/${id}`).expect(404);
      expect(await prisma.employee.count({ where: { id } })).toBe(1);
    });
  });

  describe('administration', () => {
    it('only SUPER_ADMIN manages users', async () => {
      const hr = await login(app, 'hr');
      await hr.get(`${API}/users`).expect(403);
      const admin = await login(app, 'admin');
      const res = await admin
        .post(`${API}/users`)
        .send({ username: 'New.User', password: 'Password123!', fullName: 'New', role: 'VIEWER' })
        .expect(201);
      expect(res.body.username).toBe('new.user');
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('prevents moving a unit under its own child', async () => {
      const admin = await login(app, 'admin');
      const res = await admin
        .put(`${API}/organization-units/${fx.provinceUnitId}`)
        .send({ nameKh: 'ខេត្ត', parentId: fx.districtUnitId })
        .expect(400);
      expect(res.body.details[0].field).toBe('parentId');
    });

    it('refuses to delete a rank that is in use', async () => {
      const admin = await login(app, 'admin');
      const res = await admin.delete(`${API}/ranks/${fx.rankId}`).expect(409);
      expect(res.body.error).toBe('IN_USE');
    });
  });
});
