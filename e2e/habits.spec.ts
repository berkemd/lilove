import { test, expect } from '@playwright/test';

test.describe('Habit Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.getByTestId('input-email').fill('test@example.com');
    await page.getByTestId('input-password').fill('password123');
    await page.getByTestId('button-signin').click();
  });
  
  test('should check habit for today', async ({ page }) => {
    await page.goto('/app/habits');
    
    await page.getByTestId('button-check-habit-1').click();
    
    await expect(page.getByTestId('icon-checked-1')).toBeVisible();
    await expect(page.getByTestId('text-streak-1')).toContainText('1');
  });
  
  test('should show rhythm score', async ({ page }) => {
    await page.goto('/app/habits');
    
    const rhythmScore = page.getByTestId('text-rhythm-score');
    await expect(rhythmScore).toBeVisible();
    await expect(rhythmScore).toContainText(/\d+/); // Contains number
  });
});
