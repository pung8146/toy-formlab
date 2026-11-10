import { expect, test } from '@playwright/test'

const summary = 'summary'

test('without WebGL2 the poster and the form still work', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type.startsWith('webgl')) return null
      return (original as (...args: unknown[]) => unknown).call(this, type, ...rest)
    } as typeof original
  })
  await page.goto('/')
  await expect(page.getByRole('img', { name: /Lamp 01/ })).toBeVisible()
  await expect(page.getByText('현재 구성과 다를 수 있습니다')).toBeVisible()
  await page.getByRole('radio', { name: '코발트' }).check()
  await expect(page.getByTestId(summary)).toContainText('코발트')
  await expect(page.locator('canvas')).toHaveCount(0)
})

test('context loss shows the poster and retry rebuilds the viewer with the same config', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: '불 켜기' })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('radio', { name: '코발트' }).check()
  await page.evaluate(() => {
    const gl = document.querySelector('canvas')!.getContext('webgl2')!
    gl.getExtension('WEBGL_lose_context')!.loseContext()
  })
  await page.getByRole('button', { name: '다시 시도' }).click({ timeout: 15_000 })
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: '불 켜기' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId(summary)).toContainText('코발트')
})

test('a failed 3D download offers reopening the page with the current config', async ({ page }) => {
  await page.route(/assets\/ProductViewer-.*\.js/, (route) => route.abort())
  await page.goto('/')
  await page.getByRole('radio', { name: '코발트' }).check()
  await expect(page.getByRole('button', { name: '페이지 다시 열기' })).toBeVisible({ timeout: 15_000 })
  await page.unroute(/assets\/ProductViewer-.*\.js/)
  await page.getByRole('button', { name: '페이지 다시 열기' }).click()
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId(summary)).toContainText('코발트')
})
