import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.getByTestId('input-email').fill('test@example.com');
    await page.getByTestId('input-password').fill('password123');
    await page.getByTestId('button-signin').click();
  });
  
  test('should update profile', async ({ page }) => {
    await page.goto('/app/settings');
    
    await page.getByTestId('input-display-name').fill('Updated Name');
    await page.getByTestId('button-save-profile').click();
    
    await expect(page.getByTestId('toast-success')).toBeVisible();
  });
  
  test('should export data', async ({ page }) => {
    await page.goto('/app/settings');
    await page.getByTestId('tab-privacy').click();
    
    await page.getByTestId('select-export-type').selectOption('full');
    await page.getByTestId('select-export-format').selectOption('json');
    await page.getByTestId('button-request-export').click();
    
    await expect(page.getByTestId('text-export-status')).toContainText('Processing');
  });
});
