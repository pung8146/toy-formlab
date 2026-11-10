import { expect, test, type Page } from '@playwright/test'

const settle = (page: Page) => page.waitForTimeout(1200)

async function openViewer(page: Page) {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 })
  await settle(page)
}

const shot = (page: Page) => page.locator('canvas').screenshot()

test('changing the shade shape changes the rendered product', async ({ page }) => {
  await openViewer(page)
  const before = await shot(page)
  await page.getByRole('radio', { name: '돔' }).check()
  await settle(page)
  expect(Buffer.compare(before, await shot(page))).not.toBe(0)
})

test('a finish change on one part changes the render and the summary', async ({ page }) => {
  await openViewer(page)
  const before = await shot(page)
  await page.getByRole('radio', { name: '코발트' }).check()
  await settle(page)
  expect(Buffer.compare(before, await shot(page))).not.toBe(0)
  await expect(page.getByTestId('summary')).toContainText('갓 분체도장 코발트')
  await expect(page.getByTestId('summary')).toContainText('받침 분체도장 클레이')
})

test('turning the lamp on changes the render', async ({ page }) => {
  await openViewer(page)
  const before = await shot(page)
  await page.getByRole('button', { name: '불 켜기' }).click()
  await settle(page)
  expect(Buffer.compare(before, await shot(page))).not.toBe(0)
  await expect(page.getByRole('button', { name: '불 끄기' })).toBeVisible()
})

test.describe('picking at the default 1440x900 view', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  const shade = { x: 607, y: 400 }

  test('clicking the shade selects it', async ({ page }) => {
    await openViewer(page)
    await page.getByRole('radio', { name: '받침' }).check()
    await page.mouse.click(shade.x, shade.y)
    await expect(page.getByRole('radio', { name: '갓' })).toBeChecked()
  })

  test('the selection outline stays on the part and leaves the backdrop alone', async ({ page }) => {
    await openViewer(page)
    // Top-left wall, far from every part.
    const backdrop = { x: 40, y: 80, width: 200, height: 120 }
    const before = await page.screenshot({ clip: backdrop })
    await page.mouse.click(shade.x, shade.y)
    await settle(page)
    expect(Buffer.compare(before, await page.screenshot({ clip: backdrop }))).toBe(0)
  })

  test('selecting a part draws a visible outline around it', async ({ page }) => {
    await openViewer(page)
    const silhouette = { x: 470, y: 280, width: 270, height: 200 }
    // Counts pixels close to the outline blue, which appears nowhere else in the default scene.
    const outlinePixels = async () => {
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
    expect(await outlinePixels()).toBe(0)
    await page.mouse.click(shade.x, shade.y)
    await page.mouse.move(1000, 800)
    await settle(page)
    expect(await outlinePixels()).toBeGreaterThan(200)
  })

  test('a rotate drag ending on the shade does not select it', async ({ page }) => {
    await openViewer(page)
    await page.getByRole('radio', { name: '암' }).check()
    await page.mouse.move(shade.x - 120, shade.y)
    await page.mouse.down()
    await page.mouse.move(shade.x, shade.y, { steps: 8 })
    await page.mouse.up()
    await settle(page)
    await expect(page.getByRole('radio', { name: '암' })).toBeChecked()
  })
})

test('the lit studio stays dark when the config changes', async ({ page }) => {
  await openViewer(page)
  await page.getByRole('button', { name: '불 켜기' }).click()
  await page.waitForTimeout(2500)
  const wall = { x: 20, y: 70, width: 200, height: 100 }
  const before = await page.screenshot({ clip: wall })
  await page.getByRole('radio', { name: '코발트' }).check()
  await page.waitForTimeout(1500)
  expect(Buffer.compare(before, await page.screenshot({ clip: wall }))).toBe(0)
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
  await page.getByRole('button', { name: '불 켜기' }).click()
  await page.waitForTimeout(3000)
  const count = () => page.evaluate(() => (window as unknown as { rafCalls: number }).rafCalls)
  const before = await count()
  await page.waitForTimeout(1500)
  expect((await count()) - before).toBeLessThanOrEqual(2)
})

test('the heaviest preset stays within the render budget', async ({ page }) => {
  await page.addInitScript(() => {
    const devtools = new EventTarget()
    const state = window as unknown as { __THREE_DEVTOOLS__: EventTarget; renderer: unknown }
    state.__THREE_DEVTOOLS__ = devtools
    devtools.addEventListener('observe', (event) => {
      const detail = (event as CustomEvent).detail
      if (detail?.info) state.renderer = detail
    })
  })
  await openViewer(page)
  await page.getByRole('button', { name: 'Graphite' }).click()
  await settle(page)
  await page.getByRole('button', { name: '정면' }).click()
  await settle(page)
  const cost = await page.evaluate(() => {
    const { renderer } = window as unknown as { renderer: { info: { render: { triangles: number; calls: number } } } }
    return renderer.info.render
  })
  expect(cost.triangles).toBeLessThanOrEqual(50_000)
  expect(cost.calls).toBeLessThanOrEqual(40)
})

test('fifty option swaps do not grow GPU resources', async ({ page }) => {
  await page.addInitScript(() => {
    const devtools = new EventTarget()
    const state = window as unknown as { __THREE_DEVTOOLS__: EventTarget; renderer: unknown }
    state.__THREE_DEVTOOLS__ = devtools
    devtools.addEventListener('observe', (event) => {
      const detail = (event as CustomEvent).detail
      if (detail?.info) state.renderer = detail
    })
  })
  await openViewer(page)
  const memory = () =>
    page.evaluate(() => {
      const { renderer } = window as unknown as { renderer: { info: { memory: { geometries: number; textures: number }; programs: unknown[] } } }
      return { ...renderer.info.memory, programs: renderer.info.programs.length }
    })
  const swap = async (rounds: number) => {
    for (let i = 0; i < rounds; i++) {
      await page.getByRole('button', { name: i % 2 ? 'Atelier' : 'Graphite' }).click()
      await page.waitForTimeout(40)
    }
    await settle(page)
  }
  await swap(4)
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
