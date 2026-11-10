import { expect, test, type Page } from '@playwright/test'

const KEY = 'formlab:storage:v1'
const summary = (page: Page) => page.getByTestId('summary')

async function savePreset(page: Page, name: string) {
  await page.getByRole('button', { name: '저장 목록' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('이름').fill(name)
  await dialog.getByRole('button', { name: '저장', exact: true }).click()
  return dialog
}

test('a saved preset restores the snapshot taken at save time', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: '코발트' }).check()
  const saved = await summary(page).textContent()
  const dialog = await savePreset(page, '내 램프')
  await dialog.getByRole('button', { name: '닫기' }).click()
  await page.getByRole('radio', { name: '세이지' }).check()
  await expect(summary(page)).not.toHaveText(saved!)
  await page.getByRole('button', { name: '저장 목록' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '불러오기' }).click()
  await expect(summary(page)).toHaveText(saved!)
})

test('deleting a preset asks for confirmation naming it', async ({ page }) => {
  await page.goto('/')
  const dialog = await savePreset(page, '지울 항목')
  await dialog.getByRole('button', { name: '삭제' }).click()
  await expect(dialog.getByRole('listitem')).toContainText('지울 항목')
  await expect(dialog.getByRole('listitem')).toContainText('이 항목을 삭제할까요?')
  await dialog.getByRole('button', { name: '삭제 확인' }).click()
  await expect(dialog.getByRole('listitem')).toHaveCount(0)
})

test('the eleventh preset is refused with a reason', async ({ page }) => {
  await page.goto('/')
  let dialog = await savePreset(page, '1')
  for (let i = 2; i <= 10; i++) {
    await dialog.getByLabel('이름').fill(String(i))
    await dialog.getByRole('button', { name: '저장', exact: true }).click()
  }
  await expect(dialog.getByRole('listitem')).toHaveCount(10)
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('이름').fill('11')
  await dialog.getByRole('button', { name: '저장', exact: true }).click()
  await expect(dialog).toContainText('10개')
  await expect(dialog.getByRole('listitem')).toHaveCount(10)
})

test('a copied link opens the latest config in a new browser', async ({ browser }) => {
  const sender = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await sender.newPage()
  await page.goto('/')
  await page.getByRole('radio', { name: '세이지' }).check()
  await page.getByRole('button', { name: '링크 복사' }).click()
  await expect(page.getByRole('status')).toContainText('복사')
  const link = await page.evaluate(() => navigator.clipboard.readText())
  const expected = await summary(page).textContent()

  const receiver = await browser.newContext()
  const opened = await receiver.newPage()
  await opened.goto(link)
  await expect(summary(opened)).toHaveText(expected!)
  await sender.close()
  await receiver.close()
})

test('a pasted link applies in an already open tab', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Graphite' }).click()
  const expected = await summary(page).textContent()
  await page.getByRole('button', { name: 'Chalk' }).click()
  await page.evaluate(() => { location.hash = 'v=1' })
  await expect(page.getByRole('status')).toContainText('공유 링크')
  expect(expected).toContain('그래파이트')
})

test('when the clipboard fails the link is offered in a field', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.clipboard.writeText = () => Promise.reject(new Error('denied'))
  })
  await page.goto('/')
  await page.getByRole('button', { name: '링크 복사' }).click()
  await expect(page.getByLabel('공유 링크')).toHaveValue(/#v=1&p=lamp-01/)
})

test('an invalid link shows a warning and the default without touching presets', async ({ page }) => {
  await page.goto('/')
  await savePreset(page, '보존')
  const before = await page.evaluate((key) => localStorage.getItem(key), KEY)
  await page.goto('/#v=9&p=lamp-01')
  await page.reload()
  await expect(page.getByRole('status')).toContainText('공유 링크')
  await expect(summary(page)).toContainText('사각 받침, 원뿔 갓')
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(before)
})

test('corrupt storage disables saving and leaves the original intact', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, '{broken'), KEY)
  await page.goto('/')
  await page.getByRole('button', { name: '저장 목록' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('읽을 수 없')
  await expect(dialog.getByRole('button', { name: '저장', exact: true })).toBeDisabled()
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe('{broken')
})

test('a quota failure is not reported as success and editing continues', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('quota', 'QuotaExceededError') }
  })
  await page.goto('/')
  const dialog = await savePreset(page, 'A')
  await expect(dialog).toContainText('저장하지 못했습니다')
  await expect(dialog.getByRole('listitem')).toHaveCount(0)
})

test('blocked localStorage does not break the app', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError') } })
  })
  await page.goto('/')
  await page.getByRole('radio', { name: '코발트' }).check()
  await expect(summary(page)).toContainText('코발트')
})

test('resetting the config asks first and restores the default', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: '코발트' }).check()
  await page.getByRole('button', { name: '구성 초기화' }).click()
  await expect(summary(page)).toContainText('코발트')
  await page.getByRole('button', { name: '초기화 확인' }).click()
  await expect(summary(page)).not.toContainText('코발트')
})
