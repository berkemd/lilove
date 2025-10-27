import { test, expect } from '@playwright/test';

test.describe('Goals Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth');
    await page.getByTestId('input-email').fill('test@example.com');
    await page.getByTestId('input-password').fill('password123');
    await page.getByTestId('button-signin').click();
    await expect(page).toHaveURL('/app');
  });
  
  test('should create a new goal', async ({ page }) => {
    await page.goto('/app/goals');
    
    await page.getByTestId('button-create-goal').click();
    await page.getByTestId('input-goal-title').fill('Complete E2E Tests');
    await page.getByTestId('select-goal-category').selectOption('productivity');
    await page.getByTestId('select-goal-priority').selectOption('high');
    await page.getByTestId('button-save-goal').click();
    
    await expect(page.getByText('Complete E2E Tests')).toBeVisible();
  });
  
  test('should complete a goal', async ({ page }) => {
    await page.goto('/app/goals');
    
    await page.getByTestId('button-complete-goal-1').click();
    await page.getByTestId('button-confirm-complete').click();
    
    await expect(page.getByTestId('badge-completed')).toBeVisible();
    await expect(page.getByTestId('text-xp-reward')).toBeVisible();
  });
});
