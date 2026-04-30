import { expect, test, type Locator, type Page } from '@playwright/test'

const LETTER_LEVELS = [
  'letter-alef',
  'letter-bet',
  'letter-yod',
  'letter-tav',
  'bayit-missing-yod',
  'bayit-full',
  'letter-dalet',
  'letter-gimel',
  'dag-full',
  'letter-mem',
  'yam-full',
  'letter-het',
  'letter-lamed',
  'halav-full',
  'bayit-sight',
  'dag-sight',
]

const SYLLABLE_LEVELS = [
  'syllable-bet-patah-match',
  'syllable-mem-patah-match',
  'syllable-het-qamats-match',
  'syllable-lamed-qamats-match',
  'syllable-dalet-patah-match',
  'syllable-yod-qamats-match',
]

async function seedProgress(page: Page, completedLevelIds: string[]) {
  await page.addInitScript((ids) => {
    window.localStorage.setItem(
      'tiny-phonics-progress',
      JSON.stringify({
        lastLevelId: ids[ids.length - 1] ?? 'letter-alef',
        completedLevelIds: ids,
      }),
    )
  }, completedLevelIds)
}

async function dragCenterToCenter(page: Page, source: Locator, target: Locator) {
  const sourceBox = await source.boundingBox()
  const targetBox = await target.boundingBox()

  expect(sourceBox).not.toBeNull()
  expect(targetBox).not.toBeNull()

  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height / 2, {
    steps: 8,
  })
  await page.mouse.up()
}

test('shows a Hebrew RTL stage path and returns to it from a level', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('html')).toHaveAttribute('lang', 'he')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page).toHaveTitle('עברית קטנה')
  await expect(page.getByRole('heading', { name: /עברית קטנה/ }).first()).toBeVisible()
  await expect(page.getByText('בואו ללמוד יחד!')).toBeVisible()
  await expect(page.getByText('אותיות')).toBeVisible()
  const visiblePathNodes = await page.locator('.path-phone .level-dot').evaluateAll((nodes) => {
    const viewportHeight = window.innerHeight
    return nodes.filter((node) => {
      const rect = node.getBoundingClientRect()
      return rect.bottom > 0 && rect.top < viewportHeight
    }).length
  })
  expect(visiblePathNodes).toBeGreaterThanOrEqual(5)
  expect(visiblePathNodes).toBeLessThanOrEqual(7)
  await expect(page.getByRole('button', { name: 'האות ב, נעול' })).toBeDisabled()

  await page.getByRole('button', { name: 'המשיכו' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'בואו נלמד' }).click()
  await expect(page.getByText('גררו את א למקום שלה.')).toBeVisible()

  const letterTile = page.getByRole('button', { name: 'גררו אות א' })
  const letterSlot = page.getByLabel('מילת יעד').getByText('א')
  const tileBox = await letterTile.boundingBox()
  const slotBox = await letterSlot.boundingBox()

  expect(tileBox).not.toBeNull()
  expect(slotBox).not.toBeNull()

  await page.mouse.move(tileBox!.x + tileBox!.width / 2, tileBox!.y + tileBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(tileBox!.x + tileBox!.width / 2, tileBox!.y + tileBox!.height / 2 - 24)
  await expect(page.locator('.drag-ghost')).toBeVisible()
  await expect(page.locator('.drag-ghost')).toHaveCSS('opacity', '1')
  await page.mouse.move(slotBox!.x + slotBox!.width / 2, slotBox!.y + slotBox!.height / 2, {
    steps: 8,
  })
  await page.mouse.up()

  await expect(page.getByText('כל הכבוד!')).toBeVisible({ timeout: 4000 })
  await page.getByRole('button', { name: 'המשיכו' }).click()
  await expect(page.getByText('גררו את ב למקום שלה.')).toBeVisible()
  await page.getByRole('button', { name: 'חזרה לשביל' }).click()
  await expect(page.getByRole('button', { name: 'האות ב, השלב הבא' })).toBeVisible()
})

test('keeps letter drag feedback anchored while holding a tile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await page.getByRole('button', { name: 'המשיכו' }).click()
  await page.getByRole('button', { name: 'בואו נלמד' }).click()

  const letterTile = page.getByRole('button', { name: 'גררו אות א' })
  const tileBox = await letterTile.boundingBox()

  expect(tileBox).not.toBeNull()

  const pointer = {
    x: tileBox!.x + tileBox!.width / 2,
    y: tileBox!.y + tileBox!.height / 2,
  }

  await page.mouse.move(pointer.x, pointer.y)
  await page.mouse.down()

  const ghostBox = await page.locator('.drag-ghost').boundingBox()
  expect(ghostBox).not.toBeNull()
  expect(Math.abs(ghostBox!.x + ghostBox!.width / 2 - pointer.x)).toBeLessThan(16)
  expect(Math.abs(ghostBox!.y + ghostBox!.height / 2 - pointer.y)).toBeLessThan(16)

  await expect(page.locator('.lesson-hills')).toBeVisible()
  const handCue = await page.locator('.choice-tray').evaluate((tray) => {
    const style = window.getComputedStyle(tray, '::after')
    return {
      content: style.content,
      width: Number.parseFloat(style.width),
      height: Number.parseFloat(style.height),
    }
  })
  expect(handCue.content).not.toBe('none')
  expect(handCue.width).toBeGreaterThan(40)
  expect(handCue.height).toBeGreaterThan(50)

  await page.mouse.up()
})

test('shows nikkud syllables without overlap on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedProgress(page, [
    ...LETTER_LEVELS,
    'syllable-bet-patah-match',
    'syllable-mem-patah-match',
  ])
  await page.goto('/')

  await page.getByRole('button', { name: /^חָ, השלב הבא/ }).click()
  await page.getByRole('button', { name: 'בואו נלמד' }).click()
  await expect(page.getByRole('button', { name: 'גררו צירוף חָ' })).toBeVisible()

  const target = await page.getByLabel('מילת יעד').getByText('חָ').boundingBox()
  const choice = await page.getByRole('button', { name: 'גררו צירוף חָ' }).boundingBox()

  expect(target).not.toBeNull()
  expect(choice).not.toBeNull()
  expect(target!.height).toBeGreaterThan(90)
  expect(choice!.height).toBeGreaterThan(80)
})

test('shows a category transition celebration after finishing letters', async ({ page }) => {
  await seedProgress(page, LETTER_LEVELS.slice(0, -1))
  await page.goto('/')

  await page.getByRole('button', { name: /^המילה דג, השלב הבא/ }).click()
  await page.getByRole('button', { name: 'בואו נלמד' }).click()
  await dragCenterToCenter(
    page,
    page.getByRole('button', { name: 'גררו דג' }),
    page.getByLabel('מילת יעד').getByText('דג'),
  )

  await expect(page.getByText(/נפתחה קטגוריה חדשה/)).toBeVisible({ timeout: 1500 })
  await expect(page.getByText(/פתח וקמץ/)).toBeVisible()
})

test('builds a nikkud word from ready syllable tiles', async ({ page }) => {
  await seedProgress(page, [...LETTER_LEVELS, ...SYLLABLE_LEVELS])
  await page.goto('/')

  await page.getByRole('button', { name: /^בונים חָלָב, השלב הבא/ }).click()
  await page.getByRole('button', { name: 'בואו נלמד' }).click()
  await expect(page.getByText('גררו את הצירופים המנוקדים למילה חָלָב.')).toBeVisible()

  await dragCenterToCenter(
    page,
    page.getByRole('button', { name: 'גררו צירוף חָ' }),
    page.getByLabel('מילת יעד').getByText('חָ'),
  )
  await dragCenterToCenter(
    page,
    page.getByRole('button', { name: 'גררו צירוף לָ' }),
    page.getByLabel('מילת יעד').getByText('לָ'),
  )

  await expect(page.getByText('כל הכבוד!')).toBeVisible({ timeout: 4000 })
  await page.getByRole('button', { name: 'המשיכו' }).click()
  await expect(page.getByText('גררו את הצירופים המנוקדים למילה דַג.')).toBeVisible()
})
