import {
  AwardType,
  EducationCategory,
  EmployeeDetail,
  FamilyMemberView,
  FamilyRelation,
  formatDate,
  formatDateKhLong,
  formatPhone,
  toKhmerDigits,
  WorkSector,
} from '@csbms/shared';

/**
 * HTML for the official civil servant biography form (ជីវប្រវត្តិមន្ត្រីរាជការ).
 * This is the single source of the print layout: it is used for the HTML
 * preview and for the PDF. All values are HTML-escaped.
 */
export interface TemplateInput {
  employee: EmployeeDetail;
  photoDataUri: string | null;
  fontCss: string;
  /** e.g. ["ខេត្តកំពង់ស្ពឺ", "រដ្ឋបាលស្រុកថ្ពង"] — unit path from top to bottom */
  unitPath: string[];
}

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const DOTS = '.......................';
const val = (v: unknown) => (v === null || v === undefined || v === '' ? DOTS : esc(v));
const date = (v: string | null | undefined) =>
  v ? esc(formatDate(v, true)) : '......../......./.......';
const num = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === '' ? DOTS : esc(toKhmerDigits(v));
const phone = (v: string | null) =>
  v ? esc(toKhmerDigits(v.includes('•') ? v : formatPhone(v))) : '';
const genderKh = (g: string | null | undefined) =>
  g === 'MALE' ? 'ប្រុស' : g === 'FEMALE' ? 'ស្រី' : '';

const check = (on: boolean) => `<span class="box">${on ? '✓' : ''}</span>`;

function rows<T>(items: T[], render: (item: T) => string, cols: number): string {
  if (!items.length) {
    return `<tr>${Array.from({ length: cols }, () => '<td class="empty">&nbsp;</td>').join('')}</tr>`;
  }
  return items.map(render).join('');
}

function educationTable(e: EmployeeDetail): string {
  const groups: [string, string][] = [
    [EducationCategory.GENERAL, 'កម្រិតវប្បធម៌ទូទៅ'],
    [EducationCategory.PROFESSIONAL, 'កម្រិតបណ្តុះបណ្តាលវិជ្ជាជីវៈមូលដ្ឋាន និងក្រោយមូលដ្ឋាន'],
    [EducationCategory.FOREIGN_LANGUAGE, 'ចំណេះដឹងភាសាបរទេស'],
    [EducationCategory.ONGOING_TRAINING, 'វគ្គបណ្តុះបណ្តាល និងវគ្គសិក្សាកំពុងបន្ត'],
  ];
  const body = groups
    .map(([cat, title]) => {
      const items = e.educations.filter((x) => x.category === cat);
      return `<tr><td colspan="5" class="group">- ${title}</td></tr>${rows(
        items,
        (x) =>
          `<tr><td>${esc(x.levelOrCourse)}</td><td>${esc(x.institution)}</td><td>${esc(x.certificate)}</td><td class="c">${date(x.startDate)}</td><td class="c">${date(x.endDate)}</td></tr>`,
        5,
      )}`;
    })
    .join('');
  return `<table>
    <thead><tr>
      <th>វគ្គ ឬ កម្រិតសិក្សា</th><th>គ្រឹះស្ថានសិក្សា បណ្តុះបណ្តាល<br/>(ទីកន្លែងសិក្សា)</th>
      <th>សញ្ញាបត្រ<br/>ដែលទទួលបាន</th><th>ថ្ងៃខែឆ្នាំ<br/>ចូលសិក្សា</th><th>ថ្ងៃខែឆ្នាំ<br/>បញ្ចប់ការសិក្សា</th>
    </tr></thead><tbody>${body}</tbody></table>`;
}

function workTable(e: EmployeeDetail): string {
  const groups: [string, string][] = [
    [WorkSector.MINISTRY_OF_INTERIOR, 'បទពិសោធន៍ការងារជាមួយក្រសួងមហាផ្ទៃ'],
    [WorkSector.OTHER_PUBLIC, 'បទពិសោធន៍ការងារជាមួយវិស័យរដ្ឋផ្សេងៗ'],
    [WorkSector.PRIVATE_OR_NGO, 'បទពិសោធន៍ការងារជាមួយវិស័យឯកជន ឬអង្គការក្រៅរដ្ឋាភិបាលនានា'],
  ];
  const body = groups
    .map(([sector, title]) => {
      const items = e.workHistories.filter((x) => x.sector === sector);
      return `<tr><td colspan="5" class="group">- ${title}</td></tr>${rows(
        items,
        (x) =>
          `<tr><td class="c">${date(x.startDate)}</td><td class="c">${date(x.endDate)}</td><td>${esc(x.positionName)}</td><td>${esc(x.ministryOrInstitution)}</td><td>${esc(x.unit)}</td></tr>`,
        5,
      )}`;
    })
    .join('');
  return `<table>
    <thead><tr>
      <th>ថ្ងៃចូល<br/>បម្រើការងារ</th><th>ថ្ងៃខែឆ្នាំ<br/>បញ្ចប់ការងារ</th><th>មុខតំណែង</th><th>ក្រសួង ស្ថាប័ន</th><th>អង្គភាព</th>
    </tr></thead><tbody>${body}</tbody></table>`;
}

function awardsTable(e: EmployeeDetail, type: string): string {
  const items = e.awards.filter((a) => a.type === type);
  return `<table class="compact"><thead><tr>
      <th>ឯកសារបញ្ជាក់</th><th>កាលបរិច្ឆេទ</th><th>ក្រសួង ស្ថាប័ន</th><th>ប្រភេទ</th><th>ទម្រង់</th>
    </tr></thead><tbody>${rows(
      items,
      (a) =>
        `<tr><td>${esc(a.documentRef)}</td><td class="c">${date(a.date)}</td><td>${esc(a.ministryOrInstitution)}</td><td>${esc(a.kind)}</td><td>${esc(a.form)}</td></tr>`,
      5,
    )}</tbody></table>`;
}

function familyLine(
  label: string,
  m: FamilyMemberView | undefined,
  withBirthPlace: boolean,
): string {
  const alive = m ? m.isAlive : true;
  let html = `<div class="line">- ${label} ${val(m?.name)}
      &nbsp; រស់ ${check(!!m && alive)} ស្លាប់ ${check(!!m && !alive)}
      &nbsp; ថ្ងៃខែឆ្នាំកំណើត ${date(m?.dateOfBirth)} &nbsp; មុខរបរ ${val(m?.occupation)}</div>`;
  if (withBirthPlace) html += `<div class="line indent">- ស្រុកកំណើត : ${val(m?.birthPlace)}</div>`;
  return html;
}

export function renderBiographyHtml({
  employee: e,
  photoDataUri,
  fontCss,
  unitPath,
}: TemplateInput): string {
  const spouse = e.familyMembers.find((m) => m.relation === FamilyRelation.SPOUSE);
  const father = e.familyMembers.find((m) => m.relation === FamilyRelation.FATHER);
  const mother = e.familyMembers.find((m) => m.relation === FamilyRelation.MOTHER);
  const v = e.voterRegistration;
  const rank = e.rank;
  const childrenTotal = e.childrenFemale + e.childrenMale;
  const phones = [phone(e.phone1), phone(e.phone2)].filter(Boolean).join(' / ');
  const refs = [0, 1].map((i) => e.references[i]);

  return `<!doctype html>
<html lang="km"><head><meta charset="utf-8"/>
<title>ជីវប្រវត្តិមន្ត្រីរាជការ - ${esc(e.nameKh)}</title>
<style>
${fontCss}
@page { size: A4; margin: 14mm 14mm 16mm 16mm; }
* { box-sizing: border-box; }
body { font-family: 'Kantumruy Pro', 'Khmer OS Siemreap', sans-serif; font-size: 10.5pt; line-height: 1.75; color: #000; margin: 0; }
.header { display: flex; justify-content: space-between; align-items: flex-start; }
.kingdom { text-align: center; font-weight: 700; line-height: 1.6; }
.admin { font-weight: 700; line-height: 1.6; margin-top: 30px; }
h1 { text-align: center; font-size: 15pt; margin: 6px 0 8px; }
.top { display: flex; justify-content: space-between; gap: 12px; }
.ids .line { margin: 0; }
.photo { width: 3cm; height: 4.5cm; border: 1px solid #000; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.photo img { width: 100%; height: 100%; object-fit: cover; }
h2 { font-size: 11pt; margin: 10px 0 2px; }
.line { margin: 0; }
.indent { padding-left: 14px; }
table { width: 100%; border-collapse: collapse; margin: 4px 0; page-break-inside: auto; }
tr { page-break-inside: avoid; }
th, td { border: 1px solid #000; padding: 1px 5px; vertical-align: top; font-size: 9.5pt; line-height: 1.5; }
th { font-weight: 700; text-align: center; }
td.group { font-weight: 700; }
td.c { text-align: center; white-space: nowrap; }
td.empty { height: 18px; }
.box { display: inline-block; width: 12px; height: 12px; border: 1px solid #000; line-height: 11px; text-align: center; font-size: 9pt; vertical-align: middle; }
.oath { margin-top: 10px; text-indent: 36px; }
.sign { display: flex; justify-content: space-between; margin-top: 8px; }
.sign > div { width: 48%; text-align: center; }
.sign .name { margin-top: 60px; font-weight: 700; }
</style></head>
<body>
  <div class="header">
    <div class="admin">${unitPath.map(esc).join('<br/>')}</div>
    <div class="kingdom">ព្រះរាជាណាចក្រកម្ពុជា<br/>ជាតិ សាសនា ព្រះមហាក្សត្រ<br/>~~~</div>
  </div>

  <h1>ជីវប្រវត្តិមន្ត្រីរាជការ</h1>

  <div class="top">
    <div class="ids">
      <div class="line">លេខសម្គាល់មន្ត្រីរាជការ : ${num(e.civilServantId)}</div>
      <div class="line">អត្តសញ្ញាណប័ណ្ណសញ្ជាតិខ្មែរ : ${num(e.nationalIdNo)}</div>
      <div class="line">អត្តលេខមន្ត្រីរាជការ : ${num(e.civilServantNo)}</div>
    </div>
    <div class="photo">${photoDataUri ? `<img src="${photoDataUri}" alt=""/>` : 'រូបថត<br/>៤ x ៦'}</div>
  </div>

  <h2>ក- ព័ត៌មានផ្ទាល់ខ្លួន</h2>
  <div class="line">- នាមត្រកូល និងនាមខ្លួន : <b>${esc(e.nameKh)}</b> &nbsp; អក្សរឡាតាំង : <b>${esc(e.nameLatin)}</b>
    &nbsp; ភេទ : ប្រុស ${check(e.gender === 'MALE')} ស្រី ${check(e.gender === 'FEMALE')}</div>
  <div class="line">- ថ្ងៃខែឆ្នាំកំណើត : ${esc(formatDateKhLong(e.dateOfBirth))} &nbsp; សញ្ជាតិ : ${esc(e.nationality)}</div>
  <div class="line">- ទីកន្លែងកំណើត : ${val(e.birthPlace.label)}</div>
  <div class="line">- អាសយដ្ឋានអចិន្ត្រៃយ៍បច្ចុប្បន្ន : ផ្ទះលេខ ${num(e.houseNo)} ផ្លូវលេខ ${num(e.streetNo)} ${esc(e.address.label)}</div>
  <div class="line">- ឈ្មោះក្នុងបញ្ជីបោះឆ្នោត : លេខរៀង ${num(v?.voterNo)} ការិយាល័យបោះឆ្នោត : ${val(v?.pollingStation)}
    ${esc(v?.location.label)} ឆ្នាំ ${num(v?.year)}</div>
  <div class="line">- លេខទូរស័ព្ទ : ${phones || DOTS}</div>

  <h2>ខ- កម្រិតវប្បធម៌ទូទៅ ការបណ្តុះបណ្តាលវិជ្ជាជីវៈ និងការបណ្តុះបណ្តាលបន្ត</h2>
  ${educationTable(e)}

  <h2>គ- ប្រវត្តិការងារ</h2>
  <div class="line">- ថ្ងៃចូលបម្រើការងារក្នុងក្របខ័ណ្ឌរដ្ឋ : ${date(e.civilServiceStartDate)}</div>
  <div class="line">- ថ្ងៃចូលកាន់មុខតំណែងបច្ចុប្បន្ន : ${date(e.currentPositionStartDate ?? e.currentPosition?.since)}</div>
  <div class="line">- មុខតំណែងបច្ចុប្បន្ន : ${val(e.currentPosition?.title)}</div>
  <div class="line">- អង្គភាព : ${val(e.currentPosition?.unit ?? e.organizationUnit.nameKh)}</div>
  <div class="line">- ជំនាញវិជ្ជាជីវៈ : ${val(e.specialty)}</div>
  <div class="line">- ប្រភេទក្របខ័ណ្ឌ : ${rank ? `${esc(rank.framework)} ឋានន្តរស័ក្តិ ${esc(rank.titleKh)} ថ្នាក់លេខ${num(rank.grade)}` : DOTS} ឆ្នាំ ${num(e.rankYear)}</div>
  ${workTable(e)}

  <h2>ឃ- ការសរសើរជូនរង្វាន់ ឬ ការដាក់វិន័យ</h2>
  <div class="line">១- ការសរសើរជូនរង្វាន់</div>
  ${awardsTable(e, AwardType.AWARD)}
  <div class="line">២- ការដាក់វិន័យ</div>
  ${awardsTable(e, AwardType.DISCIPLINE)}

  <h2>ង- ព័ត៌មានគ្រួសារ</h2>
  ${familyLine('ប្រពន្ធ ឬ ប្តីឈ្មោះ', spouse, false)}
  <div class="line indent">- មុខរបរបច្ចុប្បន្ន : ${val(spouse?.occupation)}</div>
  <div class="line indent">- អាសយដ្ឋានអចិន្ត្រៃយ៍បច្ចុប្បន្ន : ${val(spouse?.address)}</div>
  <div class="line indent">- លេខទូរស័ព្ទ : ${[phone(spouse?.phone1 ?? null), phone(spouse?.phone2 ?? null)].filter(Boolean).join(' / ') || DOTS}</div>
  <div class="line">- ចំនួនកូន : ${num(childrenTotal)} នាក់ &nbsp; ស្រី ${num(e.childrenFemale)} នាក់ &nbsp; ប្រុស ${num(e.childrenMale)} នាក់</div>
  ${familyLine('ឪពុកបង្កើតឈ្មោះ', father, true)}
  ${familyLine('ម្តាយបង្កើតឈ្មោះ', mother, true)}
  <div class="line">- អ្នកដែលស្គាល់ច្បាស់ មួយ ឬ ពីរនាក់ (ឈ្មោះ ភេទ មុខរបរ និងអាសយដ្ឋានបច្ចុប្បន្ន)</div>
  ${refs
    .map(
      (
        r,
        i,
      ) => `<div class="line indent">${toKhmerDigits(i + 1)}- ឈ្មោះ ${val(r?.name)} ភេទ ${val(genderKh(r?.gender))}
      មុខរបរ ${val(r?.occupation)} លេខទូរស័ព្ទ : ${r?.phone ? phone(r.phone) : DOTS}</div>
      <div class="line indent">&nbsp;&nbsp;&nbsp;- អាសយដ្ឋានអចិន្ត្រៃយ៍បច្ចុប្បន្ន : ${val(r?.address)}</div>`,
    )
    .join('')}

  <p class="oath">សូមធានាអះអាងចំពោះមុខច្បាប់ថា សេចក្តីរាយការណ៍ក្នុងជីវប្រវត្តិរូបមន្ត្រីរាជការនេះ សុទ្ធតែពិតប្រាកដមែនទាំងអស់៕</p>

  <div class="sign">
    <div>
      បានឃើញ និងបញ្ជាក់ថា<br/>ហត្ថលេខាខាងស្តាំនេះ ពិតជារបស់<br/>${esc(e.nameKh)} ពិតប្រាកដមែន។<br/>
      ធ្វើនៅ ${val(null)} ${e.verifiedAt ? esc(formatDateKhLong(e.verifiedAt.slice(0, 10))) : 'ថ្ងៃទី......ខែ...........ឆ្នាំ.........'}<br/>
      <b>ប្រធានអង្គភាព</b>
      <div class="name">${esc(e.verifiedBy?.fullName ?? '')}</div>
    </div>
    <div>
      ធ្វើនៅ${val(e.declaredPlace)} ${e.declaredDate ? esc(formatDateKhLong(e.declaredDate)) : 'ថ្ងៃទី......ខែ...........ឆ្នាំ.........'}<br/>
      <b>ហត្ថលេខា និងឈ្មោះសាមីខ្លួន</b>
      <div class="name">${esc(e.nameKh)}</div>
    </div>
  </div>
</body></html>`;
}
