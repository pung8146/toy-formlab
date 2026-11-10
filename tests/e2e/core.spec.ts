import { expect, test, type Page } from '@playwright/test'

const settle = (page: Page) => page.waitForTimeout(1200)

async function openViewer(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('button', { name: '기본 시점' })).toBeVisible({ timeout: 30_000 })
  await settle(page)
}

const shot = (page: Page) => page.locator('canvas').screenshot()

function captureRenderer(page: Page) {
  return page.addInitScript(() => {
    const devtools = new EventTarget()
    const state = window as unknown as { __THREE_DEVTOOLS__: EventTarget; renderer: unknown }
    state.__THREE_DEVTOOLS__ = devtools
    devtools.addEventListener('observe', (event) => {
      const detail = (event as CustomEvent).detail
      if (detail?.info) state.renderer = detail
    })
  })
}

type RendererInfo = { info: { render: { triangles: number; calls: number }; memory: { geometries: number; textures: number }; programs: unknown[] } }
const rendererInfo = (page: Page) =>
  page.evaluate(() => {
    const { renderer } = window as unknown as { renderer: RendererInfo }
    return { ...renderer.info.render, ...renderer.info.memory, programs: renderer.info.programs.length }
  })

test('changing the fabric changes the render and the summary', async ({ page }) => {
  await openViewer(page)
  const before = await shot(page)
  await page.getByRole('radio', { name: '망고' }).check()
  await settle(page)
  expect(Buffer.compare(before, await shot(page))).not.toBe(0)
  await expect(page.getByTestId('summary')).toContainText('원단 망고')
})

test('changing the frame leaves the fabric as it was', async ({ page }) => {
  await openViewer(page)
  await page.getByRole('radio', { name: '프레임' }).check()
  const before = await shot(page)
  await page.getByRole('radio', { name: '오크' }).check()
  await settle(page)
  expect(Buffer.compare(before, await shot(page))).not.toBe(0)
  await expect(page.getByTestId('summary')).toHaveText('원단 피콕, 프레임 오크, 금속 부품 니켈.')
})

test.describe('picking at the default 1440x900 view', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  const seat = { x: 540, y: 470 }
  const leg = { x: 636, y: 650 }

  test('clicking the seat selects the fabric and a leg selects the frame', async ({ page }) => {
    await openViewer(page)
    await page.getByRole('radio', { name: '금속 부품' }).check()
    await page.mouse.click(seat.x, seat.y)
    await expect(page.getByRole('radio', { name: '원단' })).toBeChecked()
    await page.mouse.click(leg.x, leg.y)
    await expect(page.getByRole('radio', { name: '프레임' })).toBeChecked()
  })

  test('selecting a part draws a visible outline and leaves the backdrop alone', async ({ page }) => {
    await openViewer(page)
    // Mango keeps the scene free of blue, so blue pixels can only come from the outline.
    await page.getByRole('button', { name: 'Mango' }).click()
    await settle(page)
    const silhouette = { x: 280, y: 220, width: 520, height: 360 }
    const backdrop = { x: 40, y: 80, width: 200, height: 120 }
    const bluePixels = async () => {
      const png = (await page.screenshot({ clip: silhouette })).toString('base64')
      return page.evaluate(async (data) => {
        const image = new Image()
        image.src = `data:image/png;base64,${data}`
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const context = canvas.getContext('2d')!
        context.drawImage(image, 0, 0)
        const { data: pixels } = context.getImageData(0, 0, image.width, image.height)
        let count = 0
        for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 2] > pixels[i] + 50) count++
        return count
      }, png)
    }
    expect(await bluePixels()).toBe(0)
    const wall = await page.screenshot({ clip: backdrop })
    await page.mouse.click(seat.x, seat.y)
    await page.mouse.move(1000, 800)
    await settle(page)
    expect(await bluePixels()).toBeGreaterThan(200)
    expect(Buffer.compare(wall, await page.screenshot({ clip: backdrop }))).toBe(0)
  })

  test('a rotate drag ending on the seat does not select it', async ({ page }) => {
    await openViewer(page)
    await page.getByRole('radio', { name: '금속 부품' }).check()
    await page.mouse.move(seat.x - 120, seat.y)
    await page.mouse.down()
    await page.mouse.move(seat.x, seat.y, { steps: 8 })
    await page.mouse.up()
    await settle(page)
    await expect(page.getByRole('radio', { name: '금속 부품' })).toBeChecked()
  })
})

test('rendering stops once the scene is idle', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.requestAnimationFrame.bind(window)
    const state = window as unknown as { rafCalls: number }
    state.rafCalls = 0
    window.requestAnimationFrame = (callback) => {
      state.rafCalls++
      return original(callback)
    }
  })
  await openViewer(page)
  await page.getByRole('button', { name: '측면' }).click()
  await page.waitForTimeout(2000)
  const count = () => page.evaluate(() => (window as unknown as { rafCalls: number }).rafCalls)
  const before = await count()
  await page.waitForTimeout(1500)
  expect((await count()) - before).toBeLessThanOrEqual(2)
})

test('the scene stays within the render budget', async ({ page }) => {
  await captureRenderer(page)
  await openViewer(page)
  await page.getByRole('button', { name: '정면' }).click()
  await settle(page)
  const cost = await rendererInfo(page)
  expect(cost.triangles).toBeLessThanOrEqual(50_000)
  expect(cost.calls).toBeLessThanOrEqual(40)
})

test('fifty option swaps do not grow GPU resources', async ({ page }) => {
  await captureRenderer(page)
  await openViewer(page)
  const swap = async (rounds: number) => {
    for (let i = 0; i < rounds; i++) {
      await page.getByRole('button', { name: ['Peacock', 'Mango', 'Oat'][i % 3] }).click()
      await page.waitForTimeout(40)
    }
    await settle(page)
  }
  await swap(6)
  const memory = async () => {
    const { geometries, textures, programs } = await rendererInfo(page)
    return { geometries, textures, programs }
  }
  const warm = await memory()
  await swap(50)
  expect(await memory()).toEqual(warm)
})

test('camera presets keep rendering without console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))
  await openViewer(page)
  for (const name of ['정면', '측면', '상단', '기본 시점']) {
    await page.getByRole('button', { name, exact: true }).click()
    await page.waitForTimeout(500)
  }
  expect(errors).toEqual([])
})
