import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should sign up new user', async ({ page }) => {
    await page.goto('/auth');
    
    const timestamp = Date.now();
    const email = `test${timestamp}@example.com`;
    const password = 'TestPassword123!';
    
    await page.getByTestId('input-email').fill(email);
    await page.getByTestId('input-password').fill(password);
    await page.getByTestId('input-confirm-password').fill(password);
    await page.getByTestId('checkbox-terms').check();
    await page.getByTestId('button-signup').click();
    
    await expect(page).toHaveURL('/app');
    await expect(page.getByTestId('text-welcome')).toBeVisible();
  });
  
  test('should sign in existing user', async ({ page }) => {
    await page.goto('/auth');
    
    await page.getByTestId('input-email').fill('existing@example.com');
    await page.getByTestId('input-password').fill('password123');
    await page.getByTestId('button-signin').click();
    
    await expect(page).toHaveURL('/app');
  });
  
  test('should handle OAuth (Google)', async ({ page }) => {
    await page.goto('/auth');
    await page.getByTestId('button-google-signin').click();
    
    // Note: OAuth flow requires mock or real credentials
    // For now, verify redirect happens
    await expect(page).toHaveURL(/google\.com/);
  });
});
