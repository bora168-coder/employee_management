import { expect, Page, test } from '@playwright/test';

const USERNAME = process.env.E2E_USERNAME ?? 'admin';
const PASSWORD = process.env.E2E_PASSWORD ?? 'ChangeMe123!';
const SHOTS = process.env.E2E_SCREENSHOT_DIR;

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

test.beforeEach(async ({ context, baseURL }) => {
  // English labels make the selectors stable; Khmer is tested in the API/PDF tests.
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: baseURL! }]);
});

test('redirects to login when not signed in', async ({ page }) => {
  await page.goto('/employees');
  await expect(page).toHaveURL(/\/login\?next=%2Femployees/);
});

test('shows an error for a wrong password', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill(USERNAME);
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Wrong username or password' }),
  ).toBeVisible();
});

test('HR flow: create a biography step by step, submit and verify', async ({ page }) => {
  const nationalId = String(Date.now()).slice(-9);

  await page.goto('/login');
  await page.getByLabel('Username').fill(USERNAME);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await shot(page, '01-dashboard');

  await page.getByRole('link', { name: 'Civil servants' }).click();
  await page.getByRole('link', { name: 'New record' }).click();

  // Step 1: personal information (creates the DRAFT).
  await page.getByRole('button', { name: /Save → Next/ }).click();
  await expect(page.getByText('Required').first()).toBeVisible(); // client-side validation
  await page.getByLabel('Unit').selectOption({ index: 2 });
  await page.getByLabel('National ID card').fill(nationalId);
  await page.getByLabel('Name (Khmer)').fill('ចាន់ សុវណ្ណ');
  await page.getByLabel('Name (Latin)').fill('Chan Sovann');
  await page.getByLabel('Gender').selectOption('MALE');
  await page.getByLabel('Date of birth').fill('1985-03-20');
  await page.locator('#birthPlace\\.provinceCode').selectOption('05');
  await page.locator('#birthPlace\\.districtCode').selectOption('0508');
  await page.getByLabel('Phone 1').fill('012 999 888');
  await shot(page, '02-step-personal');
  await page.getByRole('button', { name: /Save → Next/ }).click();

  // Step 2: education.
  await expect(page).toHaveURL(/step=education/);
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByLabel('Course or level').fill('Bachelor of Law');
  await page.getByLabel('Start date').fill('2004-10-01');
  await page.getByLabel('End date').fill('2008-08-01');
  await page.getByRole('button', { name: /Save → Next/ }).click();

  // Step 3: work history.
  await expect(page).toHaveURL(/step=work/);
  await page.getByLabel('Joined civil service').fill('2009-10-09');
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByLabel('Start date').fill('2009-10-09');
  await page.getByLabel('Position', { exact: true }).selectOption({ label: 'មន្ត្រី' });
  await shot(page, '03-step-work');
  await page.getByRole('button', { name: /Save → Next/ }).click();

  // Step 4: awards (none) → Step 5: family.
  await expect(page).toHaveURL(/step=awards/);
  await page.getByRole('button', { name: /Save → Next/ }).click();
  await expect(page).toHaveURL(/step=family/);
  await page.getByRole('group', { name: 'Father' }).getByLabel('Name').fill('ចាន់ ថា');
  await page.getByLabel('Daughters').fill('2');
  await page.getByRole('button', { name: /Save → Next/ }).click();

  // Review: submit, then verify.
  await expect(page).toHaveURL(/step=review/);
  await page.getByRole('button', { name: 'Submit for verification' }).click();
  await expect(page.getByText('waiting for verification and cannot be edited')).toBeVisible();
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByText(/Verified by/)).toBeVisible();
  await shot(page, '04-review-verified');

  // Profile page and list.
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('heading', { name: 'ចាន់ សុវណ្ណ' })).toBeVisible();
  await page.getByRole('tab', { name: 'C. Work history' }).click();
  await expect(page.getByRole('cell', { name: 'មន្ត្រី' })).toBeVisible();
  await shot(page, '05-profile');

  await page.goto(`/employees?search=${nationalId}`);
  await expect(page.getByRole('link', { name: 'ចាន់ សុវណ្ណ' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Verified', exact: true })).toBeVisible();
  await shot(page, '06-list');

  // History page shows the audit trail.
  await page.getByRole('link', { name: 'ចាន់ សុវណ្ណ' }).click();
  await page.getByRole('link', { name: 'Change history' }).click();
  await expect(page.getByRole('cell', { name: 'Verified', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Submitted', exact: true })).toBeVisible();
});
