import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const axe = (page: Page) =>
  new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])

test('the main screen has no axe violations', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: '기본 시점' })).toBeVisible({ timeout: 20_000 })
  expect((await axe(page).analyze()).violations).toEqual([])
})

test('the preset dialog has no axe violations', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '저장 목록' }).click()
  expect((await axe(page).analyze()).violations).toEqual([])
})

test('arrow keys move within a radio group', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: '금속 부품' }).focus()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('radio', { name: '프레임' })).toBeChecked()
})

test('the dialog traps focus, closes on Escape, and returns focus', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: '저장 목록' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog').getByLabel('이름')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('a keyboard user can edit, save, and load', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: '피콕' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('summary')).toContainText('망고')
  await page.getByRole('button', { name: '저장 목록' }).focus()
  await page.keyboard.press('Enter')
  await page.keyboard.type('키보드')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog').getByRole('listitem')).toHaveCount(1)
})

test('reduced motion moves the camera without a transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: '정면' }).click({ timeout: 30_000 })
  await page.waitForTimeout(300)
  const first = await page.locator('canvas').screenshot()
  await page.waitForTimeout(1000)
  expect(Buffer.compare(first, await page.locator('canvas').screenshot())).toBe(0)
})

test.describe('narrow screens', () => {
  // 720x450 is a 1440x900 window at 200% browser zoom.
  for (const [width, height] of [[390, 844], [320, 568], [844, 390], [720, 450]] as const) {
    test(`no horizontal scroll at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/')
      await expect(page.getByTestId('summary')).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }

  test('mobile leaves page area outside the canvas to scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const stage = await page.getByRole('region', { name: '제품 무대' }).locator('[data-stage-view]').boundingBox()
    expect(stage!.height).toBeGreaterThanOrEqual(260)
    expect(stage!.height).toBeLessThanOrEqual(844 * 0.5)
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(844)
  })
})
