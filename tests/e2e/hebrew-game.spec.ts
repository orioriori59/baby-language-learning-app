import { expect, test, type Locator, type Page } from '@playwright/test'
import { CATEGORIES, LEVELS, getNextCategoryTitle } from '../../src/game/content'
import type { Choice, Level } from '../../src/game/types'

const PLANNED_TRAIL_LEVEL_COUNT = 220
const LEVEL_120_INDEX = 119
const BASE_NIKKUD_FAMILIES = new Set(['patah', 'qamats'])

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

async function writeProgress(page: Page, completedLevelIds: string[]) {
  await page.evaluate((ids) => {
    window.localStorage.setItem(
      'tiny-phonics-progress',
      JSON.stringify({
        lastLevelId: ids[ids.length - 1] ?? 'letter-alef',
        completedLevelIds: ids,
      }),
    )
  }, completedLevelIds)
}

async function loadPathWithProgress(page: Page, completedLevelIds: string[]) {
  await page.goto('/')
  await writeProgress(page, completedLevelIds)
  await page.reload()
}

function completedIdsBefore(level: Level) {
  return LEVELS.slice(0, Math.max(0, level.order - 1)).map((candidate) => candidate.id)
}

function levelNode(page: Page, levelId: string) {
  return page.locator(`[data-testid="level-node"][data-level-id="${levelId}"]`)
}

function choiceLabel(choice: Choice) {
  if (choice.kind === 'letter') return `אות ${choice.text}`
  if (choice.kind === 'syllable') return `צירוף ${choice.text}`
  return choice.text
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

async function startLevelFromPath(page: Page, level: Level) {
  await levelNode(page, level.id).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'בואו נלמד' }).click()
  await expect(page.getByText(level.promptText)).toBeVisible()
}

async function completeLevelWithKeyboard(page: Page, level: Level) {
  const usedChoiceIds = new Set<string>()
  const playableSlots = level.target.slots.filter((slot) => !slot.fixed)

  for (const slot of playableSlots) {
    const choice = level.choices.find(
      (candidate) => !usedChoiceIds.has(candidate.id) && slot.accepts.includes(candidate.id),
    )
    expect(choice, `Expected a playable choice for slot ${slot.id} in ${level.id}`).toBeTruthy()

    usedChoiceIds.add(choice!.id)
    await page.getByRole('button', { name: `גררו ${choiceLabel(choice!)}` }).press('Enter')
  }

  await expect(page.getByText('כל הכבוד!')).toBeVisible({ timeout: 4000 })
  await expect(page.locator('.completion-time strong')).toHaveText(/^\d{2,}\.\d{2}$/)
}

function firstCategoryTransition() {
  const transitionIndex = LEVELS.findIndex(
    (level, index) => LEVELS[index + 1] && LEVELS[index + 1].categoryId !== level.categoryId,
  )
  expect(transitionIndex).toBeGreaterThanOrEqual(0)

  return {
    level: LEVELS[transitionIndex],
    nextLevel: LEVELS[transitionIndex + 1],
    completedLevelIds: LEVELS.slice(0, transitionIndex).map((level) => level.id),
  }
}

function syllableFamily(level: Level) {
  const acceptedChoiceIds = new Set(level.target.slots.flatMap((slot) => slot.accepts))
  const syllableChoice = level.choices.find(
    (choice) => choice.kind === 'syllable' && acceptedChoiceIds.has(choice.id),
  )

  return syllableChoice?.id.match(/^syllable-.+-([^-]+)$/)?.[1] ?? null
}

function representativeNewNikkudLevels() {
  const seenFamilies = new Set<string>()
  const representatives: Level[] = []

  for (const level of LEVELS) {
    if (level.levelKind !== 'syllable-match') continue

    const family = syllableFamily(level)
    if (!family || BASE_NIKKUD_FAMILIES.has(family) || seenFamilies.has(family)) continue

    seenFamilies.add(family)
    representatives.push(level)
  }

  return representatives.slice(0, 4)
}

test('shows a Hebrew RTL stage path and returns to it from a level', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('html')).toHaveAttribute('lang', 'he')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page).toHaveTitle('עברית קטנה')
  await expect(page.getByRole('heading', { name: /עברית קטנה/ }).first()).toBeVisible()
  await expect(page.getByText('בואו ללמוד יחד!')).toBeVisible()
  await expect(page.getByText('אותיות').first()).toBeVisible()
  await expect(page.getByTestId('level-node')).toHaveCount(LEVELS.length)
  const visiblePathNodes = await page.locator('.path-phone .level-dot').evaluateAll((nodes) => {
    const viewportHeight = window.innerHeight
    return nodes.filter((node) => {
      const rect = node.getBoundingClientRect()
      return rect.bottom > 0 && rect.top < viewportHeight
    }).length
  })
  expect(visiblePathNodes).toBeGreaterThanOrEqual(5)
  expect(visiblePathNodes).toBeLessThanOrEqual(12)
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

test('auto-scrolls seeded progress near level 120 to the recommended node', async ({ page }) => {
  test.skip(
    LEVELS.length <= LEVEL_120_INDEX,
    'Requires the planned 220-level curriculum to include level 120.',
  )
  expect(LEVELS.length).toBeGreaterThanOrEqual(PLANNED_TRAIL_LEVEL_COUNT)

  await page.setViewportSize({ width: 390, height: 844 })
  const recommendedLevel = LEVELS[LEVEL_120_INDEX]
  await seedProgress(page, LEVELS.slice(0, LEVEL_120_INDEX).map((level) => level.id))
  await page.goto('/')

  const recommendedNode = levelNode(page, recommendedLevel.id)
  await expect(recommendedNode).toHaveAttribute('data-level-status', 'next')
  await expect(page.locator('.path-summary')).toContainText(`השלב הבא: ${recommendedLevel.title}`)
  await expect
    .poll(async () =>
      recommendedNode.evaluate((node) => {
        const rect = node.getBoundingClientRect()
        return rect.top > 96 && rect.bottom < window.innerHeight - 96
      }),
    )
    .toBe(true)

  const scrollTop = await page.getByTestId('stage-path').evaluate((node) =>
    Math.max(
      node.scrollTop,
      window.scrollY,
      document.documentElement.scrollTop,
      document.body.scrollTop,
    ),
  )
  expect(scrollTop).toBeGreaterThan(6000)
})

test('keeps levels beyond the next recommended level locked', async ({ page }) => {
  test.skip(
    LEVELS.length <= LEVEL_120_INDEX + 2,
    'Requires enough planned trail levels to check lock state past level 120.',
  )
  expect(LEVELS.length).toBeGreaterThanOrEqual(PLANNED_TRAIL_LEVEL_COUNT)

  const recommendedLevel = LEVELS[LEVEL_120_INDEX]
  const lockedLevel = LEVELS[LEVEL_120_INDEX + 1]
  await seedProgress(page, LEVELS.slice(0, LEVEL_120_INDEX).map((level) => level.id))
  await page.goto('/')

  await expect(levelNode(page, recommendedLevel.id)).toBeEnabled()
  await expect(levelNode(page, recommendedLevel.id)).toHaveAttribute('data-level-status', 'next')
  await expect(levelNode(page, lockedLevel.id)).toBeDisabled()
  await expect(levelNode(page, lockedLevel.id)).toHaveAttribute('data-level-status', 'locked')
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
  const firstNikkudLevel = LEVELS.find((level) =>
    level.levelKind === 'syllable-match' && level.target.display === 'חָ'
  )
  expect(firstNikkudLevel).toBeTruthy()

  await page.setViewportSize({ width: 390, height: 844 })
  await seedProgress(page, completedIdsBefore(firstNikkudLevel!))
  await page.goto('/')

  await startLevelFromPath(page, firstNikkudLevel!)
  await expect(page.getByRole('button', { name: 'גררו צירוף חָ' })).toBeVisible()

  const target = await page.getByLabel('מילת יעד').getByText('חָ').boundingBox()
  const choice = await page.getByRole('button', { name: 'גררו צירוף חָ' }).boundingBox()

  expect(target).not.toBeNull()
  expect(choice).not.toBeNull()
  expect(target!.height).toBeGreaterThan(90)
  expect(choice!.height).toBeGreaterThan(80)
})

test('shows a category transition celebration at the first section boundary', async ({ page }) => {
  expect(CATEGORIES.length).toBeGreaterThan(1)
  const transition = firstCategoryTransition()
  const nextCategoryTitle = getNextCategoryTitle(transition.level.id)
  expect(nextCategoryTitle).toBe(transition.nextLevel.categoryTitle)

  await seedProgress(page, transition.completedLevelIds)
  await page.goto('/')

  await startLevelFromPath(page, transition.level)
  await completeLevelWithKeyboard(page, transition.level)

  await expect(page.getByText(/נפתחה קטגוריה חדשה/)).toBeVisible({ timeout: 1500 })
  await expect(page.getByText(nextCategoryTitle!)).toBeVisible()

  await page.getByRole('button', { name: 'המשיכו' }).click()
  await expect(page.getByTestId('stage-path')).toBeVisible()
  await expect(levelNode(page, transition.nextLevel.id)).toHaveAttribute('data-level-status', 'next')
  await expect(levelNode(page, transition.nextLevel.id)).toHaveClass(/category-unlocking/)
})

test('builds a nikkud word from ready syllable tiles', async ({ page }) => {
  const nikkudWordLevel = LEVELS.find((level) =>
    level.levelKind === 'nikkud-word-build' && level.target.display === 'חָלָב'
  )
  expect(nikkudWordLevel).toBeTruthy()

  await seedProgress(page, completedIdsBefore(nikkudWordLevel!))
  await page.goto('/')

  await startLevelFromPath(page, nikkudWordLevel!)
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
  await expect(page.locator('.game-screen')).toBeVisible()
})

test('plays representative levels from new nikkud families', async ({ page }) => {
  const representatives = representativeNewNikkudLevels()
  test.skip(
    representatives.length === 0,
    'Requires planned nikkud families beyond patah/qamats.',
  )

  for (const level of representatives) {
    await loadPathWithProgress(page, completedIdsBefore(level))
    await startLevelFromPath(page, level)
    await completeLevelWithKeyboard(page, level)
  }
})
