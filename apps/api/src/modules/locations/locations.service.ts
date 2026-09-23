import { BadRequestException, Injectable } from '@nestjs/common';
import type { LocationView } from '@csbms/shared';
import { PrismaService } from '../../prisma/prisma.service';

export interface LocationCodes {
  provinceCode?: string | null;
  districtCode?: string | null;
  communeCode?: string | null;
  villageCode?: string | null;
}

type NameMap = Map<string, string>;

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  provinces() {
    return this.prisma.province.findMany({ orderBy: { code: 'asc' } });
  }

  districts(provinceCode: string) {
    return this.prisma.district.findMany({ where: { provinceCode }, orderBy: { code: 'asc' } });
  }

  communes(districtCode: string) {
    return this.prisma.commune.findMany({ where: { districtCode }, orderBy: { code: 'asc' } });
  }

  villages(communeCode: string) {
    return this.prisma.village.findMany({ where: { communeCode }, orderBy: { code: 'asc' } });
  }

  /**
   * Checks that the codes exist and belong together
   * (village in commune, commune in district, district in province).
   */
  async validate(codes: LocationCodes, field: string): Promise<void> {
    const fail = (message: string) => {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message,
        details: [{ field, message }],
      });
    };
    const { provinceCode, districtCode, communeCode, villageCode } = codes;
    if (villageCode) {
      const v = await this.prisma.village.findUnique({ where: { code: villageCode } });
      if (!v || (communeCode && v.communeCode !== communeCode))
        fail('Village does not match commune');
    }
    if (communeCode) {
      const c = await this.prisma.commune.findUnique({ where: { code: communeCode } });
      if (!c || (districtCode && c.districtCode !== districtCode))
        fail('Commune does not match district');
    }
    if (districtCode) {
      const d = await this.prisma.district.findUnique({ where: { code: districtCode } });
      if (!d || (provinceCode && d.provinceCode !== provinceCode))
        fail('District does not match province');
    }
    if (
      provinceCode &&
      !(await this.prisma.province.findUnique({ where: { code: provinceCode } }))
    ) {
      fail('Unknown province');
    }
  }

  /** Loads Khmer names for many codes at once. */
  async loadNames(list: LocationCodes[]): Promise<NameMap> {
    const pick = (k: keyof LocationCodes) => [
      ...new Set(list.map((l) => l[k]).filter((v): v is string => !!v)),
    ];
    const [p, d, c, v] = await Promise.all([
      this.prisma.province.findMany({ where: { code: { in: pick('provinceCode') } } }),
      this.prisma.district.findMany({ where: { code: { in: pick('districtCode') } } }),
      this.prisma.commune.findMany({ where: { code: { in: pick('communeCode') } } }),
      this.prisma.village.findMany({ where: { code: { in: pick('villageCode') } } }),
    ]);
    const map: NameMap = new Map();
    // Names are stored with their type prefix (ខេត្ត/រាជធានី, ស្រុក/ក្រុង/ខណ្ឌ, ឃុំ/សង្កាត់, ភូមិ).
    for (const r of p) map.set(`p:${r.code}`, r.nameKh);
    for (const r of d) map.set(`d:${r.code}`, r.nameKh);
    for (const r of c) map.set(`c:${r.code}`, r.nameKh);
    for (const r of v) map.set(`v:${r.code}`, r.nameKh);
    return map;
  }

  static toView(codes: LocationCodes, names: NameMap): LocationView {
    const label = [
      codes.villageCode && names.get(`v:${codes.villageCode}`),
      codes.communeCode && names.get(`c:${codes.communeCode}`),
      codes.districtCode && names.get(`d:${codes.districtCode}`),
      codes.provinceCode && names.get(`p:${codes.provinceCode}`),
    ]
      .filter(Boolean)
      .join(' ');
    return {
      provinceCode: codes.provinceCode ?? null,
      districtCode: codes.districtCode ?? null,
      communeCode: codes.communeCode ?? null,
      villageCode: codes.villageCode ?? null,
      label,
    };
  }
}
