import { test, expect } from '@playwright/test';

test.describe('AI Coach', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.getByTestId('input-email').fill('test@example.com');
    await page.getByTestId('input-password').fill('password123');
    await page.getByTestId('button-signin').click();
  });
  
  test('should send message to coach', async ({ page }) => {
    await page.goto('/app/coach');
    
    await page.getByTestId('input-coach-message').fill('Help me stay motivated');
    await page.getByTestId('button-send-message').click();
    
    await expect(page.getByTestId('message-user')).toContainText('Help me stay motivated');
    await expect(page.getByTestId('message-assistant')).toBeVisible({ timeout: 10000 });
  });
  
  test('should generate action plan', async ({ page }) => {
    await page.goto('/app/coach');
    
    await page.getByTestId('button-generate-plan').click();
    
    await expect(page.getByTestId('action-plan')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('plan-item-1')).toBeVisible();
  });
});
