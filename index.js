/**
 * Host half of the novel creator workbench.
 *
 * The browser half is a three-column page. This half owns the library on disk:
 * one directory per work, Markdown chapters under `manuscript/`, board data in
 * `workbench.json`, and a Git repository per work. A small owner-only JSON API
 * under `/novel-workbench/api` is the only transport the page uses.
 */

import { execFile } from 'node:child_process'
import { constants as fsConstants } from 'node:fs'
import {
  access, cp, mkdir, readFile, readdir, realpath, rename, rm, stat, writeFile,
} from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { demoBook, demoChapters, demoWorkbench } from './seed.js'

const execFileAsync = promisify(execFile)

const API_PREFIX = '/novel-workbench/api'
const LIBRARY_DIR_NAME = 'DSH小说工作台'
const MAX_BODY_BYTES = 4 * 1024 * 1024
const MAX_TEXT = 2 * 1024 * 1024
const WORK_ID = /^[a-z0-9][a-z0-9-]{0,63}$/
const DEFAULT_GIT_NAME = 'DSH Novel Workbench'
const DEFAULT_GIT_EMAIL = 'novel-workbench@local'

const WORKBENCH_ARRAYS = [
  'characters', 'locations', 'mapLinks', 'events', 'relationships',
  'items', 'plotlines', 'foreshadows', 'hooks',
]

/** Cordis function-plugin name. */
export const name = 'novel-workbench'
/**
 * Resolve the library root. The environment override exists for users who keep
 * manuscripts on another volume; the default is stable across upgrades.
 */
function libraryRoot() {
  const override = process.env.DSH_NOVEL_WORKBENCH_ROOT?.trim()
  if (override) {
    if (override === '~') return homedir()
    if (override.startsWith('~/') || override.startsWith('~\\')) return path.join(homedir(), override.slice(2))
    return path.resolve(override)
  }
  return path.join(homedir(), 'Documents', LIBRARY_DIR_NAME)
}

/** Register the owner-only API while this plugin is active. */
export function apply(ctx) {
  const root = libraryRoot()
  let readyPromise
  const ready = () => {
    if (readyPromise === undefined) {
      readyPromise = ensureLibrary(root).catch((error) => {
        readyPromise = undefined
        throw error
      })
    }
    return readyPromise
  }

  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'prefix',
      path: API_PREFIX,
      auth: 'required',
      handler: async (req, res, peer) => {
        try {
          if (peer?.principal.kind !== 'owner') {
            sendJson(res, 403, { error: '仅限本机所有者访问' })
            return
          }
          await ready()
          await route(req, res, root, ctx)
        } catch (error) {
          sendJson(res, error?.status ?? 500, { error: messageOf(error) })
        }
      },
    }), 'novel-workbench: owner JSON API')
  })
}

/** Route one request under the API prefix. */
async function route(req, res, root, ctx) {
  const url = new URL(String(req.url), 'http://novel-workbench.local')
  const pathname = decodeURIComponent(url.pathname)
  if (!pathname.startsWith(API_PREFIX)) {
    sendJson(res, 404, { error: '未知接口' })
    return
  }
  const tail = pathname.slice(API_PREFIX.length).replace(/^\/+|\/+$/g, '')
  const parts = tail === '' ? [] : tail.split('/')
  const method = req.method ?? 'GET'
  const body = method === 'GET' || method === 'HEAD' ? undefined : await readJsonBody(req)

  if (method === 'GET' && parts.length === 1 && parts[0] === 'bootstrap') {
    sendJson(res, 200, await bootstrap(root))
    return
  }
  if (method === 'POST' && parts.length === 1 && parts[0] === 'works') {
    sendJson(res, 200, await createWork(root, body))
    return
  }
  if (method === 'POST' && parts.length === 1 && parts[0] === 'assist') {
    sendJson(res, 200, await assistWriting(ctx, body))
    return
  }
  if (method === 'POST' && parts.length === 2 && parts[0] === 'assist' && parts[1] === 'board') {
    sendJson(res, 200, await boardAssist(ctx, body))
    return
  }
  if (parts[0] !== 'works' || parts.length < 2) {
    sendJson(res, 404, { error: '未知接口' })
    return
  }

  const workId = parts[1]
  assertWorkId(workId)
  const workDir = workPath(root, workId)
  if (!(await exists(workDir))) throw httpError(404, '作品不存在')

  if (parts.length === 2) {
    if (method === 'GET') {
      sendJson(res, 200, await loadWork(workDir, workId))
      return
    }
    if (method === 'PATCH') {
      sendJson(res, 200, await updateBook(workDir, workId, body))
      return
    }
    if (method === 'DELETE') {
      sendJson(res, 200, await trashWork(root, workDir, workId))
      return
    }
  }

  if (parts[2] === 'chapter') {
    if (method === 'GET') {
      sendJson(res, 200, await readChapter(workDir, url.searchParams.get('path')))
      return
    }
    if (method === 'PUT') {
      sendJson(res, 200, await saveChapter(workDir, body))
      return
    }
  }

  if (parts[2] === 'node') {
    const action = parts[3]
    if (method === 'POST' && action === undefined) {
      sendJson(res, 200, await createNode(workDir, body))
      return
    }
    if (method === 'POST' && action === 'rename') {
      sendJson(res, 200, await renameNode(workDir, body))
      return
    }
    if (method === 'POST' && action === 'delete') {
      sendJson(res, 200, await deleteNode(root, workDir, workId, body))
      return
    }
    if (method === 'POST' && action === 'move') {
      sendJson(res, 200, await moveNode(workDir, body))
      return
    }
  }

  if (parts[2] === 'workbench') {
    if (method === 'PUT') {
      sendJson(res, 200, await saveWorkbench(workDir, body))
      return
    }
    if (method === 'GET') {
      const workbench = normalizeWorkbench(await readJson(path.join(workDir, 'workbench.json'), {}))
      sendJson(res, 200, { workbench })
      return
    }
  }

  if (parts[2] === 'git') {
    if (method === 'GET' && parts.length === 3) {
      sendJson(res, 200, await gitInfo(workDir))
      return
    }
    if (method === 'POST' && parts[3] === 'commit') {
      sendJson(res, 200, await commitWork(workDir, body))
      return
    }
    if (method === 'POST' && parts[3] === 'init') {
      sendJson(res, 200, await initAndCommit(workDir))
      return
    }
    if (method === 'GET' && parts[3] === 'diff') {
      sendJson(res, 200, await diffWork(workDir, url.searchParams.get('path')))
      return
    }
  }

  sendJson(res, 404, { error: '未知接口' })
}

/* ------------------------------------------------------------------ library */

async function ensureLibrary(root) {
  await mkdir(root, { recursive: true })
  await mkdir(path.join(root, 'works'), { recursive: true })
  await mkdir(path.join(root, '.trash'), { recursive: true })
  const marker = path.join(root, '.novel-workbench.json')
  if (await exists(marker)) return
  const existing = await listWorkIds(root)
  if (existing.length === 0) await seedDemoLibrary(root)
  await writeJson(marker, { version: 1, createdAt: new Date().toISOString() })
}

async function seedDemoLibrary(root) {
  const workDir = workPath(root, demoBook.id)
  if (await exists(workDir)) return
  await mkdir(workDir, { recursive: true })
  await mkdir(path.join(workDir, 'manuscript'), { recursive: true })
  await writeJson(path.join(workDir, 'book.json'), demoBook)
  await writeJson(path.join(workDir, 'workbench.json'), demoWorkbench)
  for (const chapter of demoChapters) {
    const target = path.join(workDir, ...chapter.path.split('/'))
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, chapter.content, 'utf8')
  }
  try {
    await initRepo(workDir)
    await commitAll(workDir, '初始化示例作品《雾港来信》')
  } catch {
    // Writing still works without Git; the UI reports the missing repository.
  }
}

async function bootstrap(root) {
  const ids = await listWorkIds(root)
  const works = []
  for (const id of ids) {
    const workDir = workPath(root, id)
    try {
      works.push(await workSummary(workDir, id))
    } catch {
      // A half-deleted directory should not make the whole library unreadable.
    }
  }
  works.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
  return {
    libraryRoot: root,
    works,
    defaultWorkId: works[0]?.id ?? null,
    now: new Date().toISOString(),
  }
}

async function listWorkIds(root) {
  const entries = await readdir(path.join(root, 'works'), { withFileTypes: true })
  return entries
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && WORK_ID.test(entry.name))
    .map(entry => entry.name)
}

async function workSummary(workDir, id) {
  const book = await readBook(workDir, id)
  const chapters = await collectMarkdown(path.join(workDir, 'manuscript'))
  let git = { available: false, branch: '', dirty: false, files: [], log: [], error: '尚未初始化 Git' }
  try { git = await gitInfo(workDir) } catch (error) { git = { ...git, error: messageOf(error) } }
  return {
    id,
    title: book.title,
    author: book.author,
    genre: book.genre,
    description: book.description,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
    chapterCount: chapters.length,
    git: { available: git.available, branch: git.branch, dirty: git.dirty, changed: git.files.length, error: git.error },
  }
}

async function loadWork(workDir, id) {
  const book = await readBook(workDir, id)
  let workbench = normalizeWorkbench(await readJson(path.join(workDir, 'workbench.json'), {}))
  if (book.id === 'mist-harbor') workbench = migrateDemoWorkbench(workbench)
  const tree = await readTree(workDir)
  const files = await collectMarkdown(path.join(workDir, 'manuscript'))
  let wordCount = 0
  for (const file of files) {
    try { wordCount += countText(await readFile(file, 'utf8')) } catch { /* ignored */ }
  }
  let git
  try { git = await gitInfo(workDir) } catch (error) {
    git = { available: false, branch: '', dirty: false, files: [], log: [], error: messageOf(error) }
  }
  return {
    work: book,
    workbench,
    tree,
    git,
    stats: { chapterCount: files.length, wordCount },
  }
}

async function createWork(root, body) {
  const title = cleanText(body?.title, 80) || '未命名作品'
  const id = `work-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const workDir = workPath(root, id)
  await mkdir(path.join(workDir, 'manuscript'), { recursive: true })
  const now = new Date().toISOString()
  const book = {
    id,
    title,
    author: cleanText(body?.author, 80),
    genre: cleanText(body?.genre, 40),
    logline: cleanText(body?.logline, 240),
    description: cleanText(body?.description, 2000),
    createdAt: now,
    updatedAt: now,
  }
  await writeJson(path.join(workDir, 'book.json'), book)
  await writeJson(path.join(workDir, 'workbench.json'), emptyWorkbench())
  const firstDir = path.join(workDir, 'manuscript', '001-第一卷')
  await mkdir(firstDir, { recursive: true })
  await writeFile(path.join(firstDir, '001-第一章.md'), '# 第一章\n\n', 'utf8')
  let git
  try {
    await initRepo(workDir)
    const commit = await commitAll(workDir, '初始化作品')
    git = commit.git
  } catch (error) {
    git = { available: false, branch: '', dirty: true, files: [], log: [], error: messageOf(error) }
  }
  return { ok: true, work: book, git, tree: await readTree(workDir) }
}

async function updateBook(workDir, id, body) {
  const book = await readBook(workDir, id)
  const next = {
    ...book,
    title: body?.title === undefined ? book.title : cleanText(body.title, 80) || book.title,
    author: body?.author === undefined ? book.author : cleanText(body.author, 80),
    genre: body?.genre === undefined ? book.genre : cleanText(body.genre, 40),
    logline: body?.logline === undefined ? book.logline : cleanText(body.logline, 240),
    description: body?.description === undefined ? book.description : cleanText(body.description, 4000),
    updatedAt: new Date().toISOString(),
  }
  await writeJson(path.join(workDir, 'book.json'), next)
  let git
  try { git = await gitInfo(workDir) } catch (error) { git = { available: false, dirty: true, files: [], log: [], error: messageOf(error) } }
  return { ok: true, work: next, git }
}

async function trashWork(root, workDir, id) {
  const stamp = `${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 6)}`
  const target = path.join(root, '.trash', `${id}-${stamp}`)
  await mkdir(path.dirname(target), { recursive: true })
  try { await rename(workDir, target) } catch {
    await cp(workDir, target, { recursive: true })
    await rm(workDir, { recursive: true, force: true })
  }
  return { ok: true, trashedTo: target, bootstrap: await bootstrap(root) }
}

/* ------------------------------------------------------------------- chapters */

async function readChapter(workDir, relPath) {
  const full = await chapterPath(workDir, relPath, true)
  const text = await readFile(full, 'utf8')
  const info = await stat(full)
  return {
    path: toPosix(path.relative(workDir, full)),
    content: text,
    bytes: info.size,
    updatedAt: info.mtime.toISOString(),
    words: countText(text),
  }
}

async function syncMarkdownTitle(file, title) {
  const content = await readFile(file, 'utf8')
  const lines = content.split('\n')
  const index = lines.findIndex(line => line.trim() !== '')
  if (index < 0 || !/^#\s+/.test(lines[index].trim())) return
  if (lines[index].trim() === `# ${title}`) return
  lines[index] = `# ${title}`
  await writeAtomic(file, lines.join('\n'))
}

async function saveChapter(workDir, body) {
  const rawPath = body?.path
  if (typeof rawPath !== 'string' || rawPath === '') throw httpError(400, '缺少章节路径')
  const relPath = toPosix(rawPath).replace(/\\/g, '/')
  const content = typeof body?.content === 'string' ? body.content : ''
  if (content.length > MAX_TEXT) throw httpError(413, '章节内容过大')
  const full = await chapterPath(workDir, relPath, false)
  await mkdir(path.dirname(full), { recursive: true })
  await ensureRealInside(path.join(workDir, 'manuscript'), path.dirname(full))
  if (await exists(full)) await ensureRealInside(path.join(workDir, 'manuscript'), full)
  await writeAtomic(full, content)
  const savedAt = new Date().toISOString()
  const workbench = normalizeWorkbench(await readJson(path.join(workDir, 'workbench.json'), {}))
  workbench.chapterMeta[relPath] = {
    ...(workbench.chapterMeta[relPath] ?? {}),
    updatedAt: savedAt,
    words: countText(content),
  }
  await writeJson(path.join(workDir, 'workbench.json'), workbench)
  await touchBook(workDir)
  let git
  try { git = await gitInfo(workDir) } catch (error) { git = { available: false, dirty: true, files: [], log: [], error: messageOf(error) } }
  return { ok: true, savedAt, words: countText(content), path: relPath, git }
}

async function createNode(workDir, body) {
  const kind = body?.kind === 'volume' ? 'volume' : 'chapter'
  const title = cleanText(body?.title, 80) || (kind === 'volume' ? '未命名卷' : '未命名章节')
  await mkdir(path.join(workDir, 'manuscript'), { recursive: true })
  const parentRel = typeof body?.parent === 'string' && body.parent !== '' ? body.parent : 'manuscript'
  const parent = await directoryPath(workDir, parentRel)
  const siblings = await listSiblings(parent)
  const prefix = nextPrefix(siblings)
  let name = kind === 'volume' ? `${prefix}-${safeName(title)}` : `${prefix}-${safeName(title)}.md`
  const used = new Set(siblings.map(entry => entry.name))
  while (used.has(name)) name = kind === 'volume' ? `${name}-2` : `${name.slice(0, -3)}-2.md`
  const target = path.join(parent, name)
  await ensureRealInside(path.join(workDir, 'manuscript'), target)
  if (kind === 'volume') {
    await mkdir(target, { recursive: true })
  } else {
    await writeFile(target, `# ${title}\n\n`, 'utf8')
  }
  await touchBook(workDir)
  const tree = await readTree(workDir)
  return {
    ok: true,
    created: toPosix(path.relative(workDir, target)),
    kind,
    tree,
    workbench: normalizeWorkbench(await readJson(path.join(workDir, 'workbench.json'), {})),
    git: await safeGitInfo(workDir),
  }
}

async function renameNode(workDir, body) {
  const relPath = body?.path
  assertNotManuscript(relPath)
  const title = cleanText(body?.title, 80)
  if (!title) throw httpError(400, '标题不能为空')
  const full = await nodePath(workDir, relPath)
  const info = await stat(full)
  const parent = path.dirname(full)
  const base = path.basename(full)
  const prefix = prefixOf(base)
  const prefixText = prefix > 0 ? String(prefix).padStart(3, '0') : ''
  const nextName = info.isDirectory()
    ? (prefixText ? `${prefixText}-${safeName(title)}` : safeName(title))
    : (prefixText ? `${prefixText}-${safeName(title)}.md` : `${safeName(title)}.md`)
  const target = path.join(parent, nextName)
  if (target !== full) {
    if (await exists(target)) throw httpError(409, '同名节点已存在')
    await rename(full, target)
  }
  const oldRel = toPosix(path.relative(workDir, full))
  const newRel = toPosix(path.relative(workDir, target))
  if (!info.isDirectory() && target.toLowerCase().endsWith('.md')) await syncMarkdownTitle(target, title)
  if (oldRel !== newRel) {
    const workbench = normalizeWorkbench(await readJson(path.join(workDir, 'workbench.json'), {}))
    const remapped = remapWorkbenchPaths(workbench, oldRel, newRel)
    await writeJson(path.join(workDir, 'workbench.json'), remapped)
  }
  await touchBook(workDir)
  return {
    ok: true,
    oldPath: oldRel,
    newPath: newRel,
    tree: await readTree(workDir),
    workbench: normalizeWorkbench(await readJson(path.join(workDir, 'workbench.json'), {})),
    git: await safeGitInfo(workDir),
  }
}

async function deleteNode(root, workDir, id, body) {
  const relPath = body?.path
  if (!relPath) throw httpError(400, '不能删除正文根目录')
  assertNotManuscript(relPath)
  const full = await nodePath(workDir, relPath)
  const stamp = `${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 6)}`
  const target = path.join(root, '.trash', `${id}-${stamp}`, ...relPath.split('/'))
  await mkdir(path.dirname(target), { recursive: true })
  try { await rename(full, target) } catch {
    await cp(full, target, { recursive: true })
    await rm(full, { recursive: true, force: true })
  }
  const workbench = normalizeWorkbench(await readJson(path.join(workDir, 'workbench.json'), {}))
  for (const key of Object.keys(workbench.chapterMeta)) {
    if (key === relPath || key.startsWith(`${relPath}/`)) delete workbench.chapterMeta[key]
  }
  await writeJson(path.join(workDir, 'workbench.json'), workbench)
  await touchBook(workDir)
  return {
    ok: true,
    deletedPath: relPath,
    trashedTo: target,
    tree: await readTree(workDir),
    workbench,
    git: await safeGitInfo(workDir),
  }
}

async function moveNode(workDir, body) {
  const relPath = body?.path
  assertNotManuscript(relPath)
  const direction = body?.direction === 'down' ? 1 : -1
  const full = await nodePath(workDir, relPath)
  const parent = path.dirname(full)
  const siblings = await listSiblings(parent)
  const index = siblings.findIndex(entry => entry.full === full)
  if (index < 0) throw httpError(404, '节点不存在')
  const swapWith = index + direction
  if (swapWith < 0 || swapWith >= siblings.length) {
    return { ok: true, moved: false, tree: await readTree(workDir) }
  }
  const ordered = [...siblings]
  const tmp = ordered[index]
  ordered[index] = ordered[swapWith]
  ordered[swapWith] = tmp

  const mappings = []
  const staged = []
  const nonce = Math.random().toString(36).slice(2, 8)
  for (const [position, entry] of ordered.entries()) {
    const tempName = `.nwb-tmp-${nonce}-${position}-${entry.name}`
    const temp = path.join(parent, tempName)
    await rename(entry.full, temp)
    staged.push({ temp, entry, position })
  }
  for (const stage of staged) {
    const prefix = String(stage.position + 1).padStart(3, '0')
    const title = stage.entry.isDirectory ? cleanText(stage.entry.display, 80) : cleanText(stage.entry.display, 80)
    const nextName = stage.entry.isDirectory ? `${prefix}-${safeName(title)}` : `${prefix}-${safeName(title)}.md`
    const target = path.join(parent, nextName)
    await rename(stage.temp, target)
    mappings.push([toPosix(path.relative(workDir, stage.entry.full)), toPosix(path.relative(workDir, target))])
  }
  let workbench = normalizeWorkbench(await readJson(path.join(workDir, 'workbench.json'), {}))
  for (const [oldRel, newRel] of mappings) workbench = remapWorkbenchPaths(workbench, oldRel, newRel)
  await writeJson(path.join(workDir, 'workbench.json'), workbench)
  await touchBook(workDir)
  return {
    ok: true,
    moved: true,
    mappings,
    tree: await readTree(workDir),
    workbench,
    git: await safeGitInfo(workDir),
  }
}

/* ---------------------------------------------------------------- AI assist */

const ASSIST_ACTIONS = new Set(['rewrite', 'expand', 'analyze', 'suggest'])

const ASSIST_SYSTEM = {
  rewrite: '你是资深中文小说编辑。改写选中的正文，保持叙述视角、时态、人物语气、情节事实和 Markdown 行内格式不变；让句子更准确、更有画面感。只输出改写后的正文，不要解释，不要加标题。',
  expand: '你是资深中文小说编辑。扩写选中的正文，增加动作、感官细节、心理活动或环境氛围，但不改变情节事实、人物关系和时间线。只输出扩写后的正文，不要解释，不要加标题。',
  analyze: '你是资深中文小说编辑。分析选中的正文：节奏、视角、信息密度、人物动机、潜台词和可能的问题。给出 3 到 5 条具体、可执行的修改建议。用简洁的 Markdown 列表输出，不要重写全文。',
  suggest: '你是资深中文小说编辑。基于选段和上下文，给出接下来的 3 到 5 个剧情走向建议。每条写清楚“走向 + 风险/收益”，用简洁的 Markdown 列表输出，不要直接续写正文。',
}

async function runModel(ctx, options) {
  const { system, prompt, maxTokens = 1600, temperature = 0.7, timeoutMs = 60_000 } = options
  const llm = ctx.get?.('llm')
  if (llm === undefined) throw httpError(503, '当前没有可用的 AI 模型服务')
  let selection
  try { selection = ctx.get?.('agentDefaultModel')?.currentSelection?.() } catch { selection = undefined }
  if (!selection || !selection.provider || !selection.model) {
    const providers = await llm.listProviders()
    const provider = providers?.[0]?.id
    if (!provider) throw httpError(503, '当前没有已注册的 AI 模型')
    const models = await llm.listModels(provider)
    const model = models?.[0]?.id
    if (!model) throw httpError(503, '当前 AI 模型没有可用模型')
    selection = { provider, model }
  }
  const signal = AbortSignal.timeout(timeoutMs)
  const prepared = await llm.prepareCall({
    provider: selection.provider,
    model: selection.model,
    ...(selection.reasoningEffort === undefined ? {} : { reasoningEffort: selection.reasoningEffort }),
    maxTokens,
  }, signal, (_controls, model) => ({
    maxTokens: Math.min(maxTokens, model.defaultMaxTokens ?? maxTokens),
    temperature,
  }))
  const messages = [{ role: 'user', content: [{ type: 'text', text: prompt }] }]
  let output = ''
  let blockText = ''
  for await (const chunk of prepared.stream({
    ...prepared.config,
    system,
    messages,
    temperature,
    maxTokens: prepared.config.maxTokens ?? maxTokens,
    signal,
  })) {
    if (chunk.type === 'text-delta') output += chunk.text
    if (chunk.type === 'block-end' && chunk.block?.type === 'text' && output === '') blockText = chunk.block.text
    if (chunk.type === 'finish') {
      if (chunk.reason.kind === 'error') throw httpError(502, chunk.reason.failure?.message ?? 'AI 调用失败')
      if (chunk.reason.kind === 'aborted') throw httpError(499, 'AI 调用已取消')
    }
  }
  output = output.trim() || blockText.trim()
  if (!output) throw httpError(502, 'AI 没有返回内容')
  return { text: output, provider: prepared.config.provider, model: prepared.config.model }
}

async function assistWriting(ctx, body) {
  const action = typeof body?.action === 'string' ? body.action : ''
  if (!ASSIST_ACTIONS.has(action)) throw httpError(400, '未知的 AI 操作')
  const text = cleanBlock(body?.text, 3000)
  if (!text) throw httpError(400, '没有选中文字')
  if (Array.from(text).length > 2000) throw httpError(413, '选区过长，最多 2000 字')
  const workTitle = cleanText(body?.workTitle, 120) || '未命名作品'
  const chapterTitle = cleanText(body?.chapterTitle, 120) || '未命名章节'
  const before = cleanBlock(body?.before, 6000)
  const after = cleanBlock(body?.after, 6000)
  const storyContext = cleanBlock(body?.storyContext, 4000)
  const prompt = [
    `作品：《${workTitle}》`,
    `章节：《${chapterTitle}》`,
    before ? `选段之前的上下文：\n${before}` : '',
    after ? `选段之后的上下文：\n${after}` : '',
    storyContext ? `故事设定（供参考，不要照抄）：\n${storyContext}` : '',
    `选中文本：\n${text}`,
  ].filter(Boolean).join('\n\n')
  const result = await runModel(ctx, {
    system: ASSIST_SYSTEM[action],
    prompt,
    maxTokens: 1600,
    temperature: action === 'analyze' ? 0.3 : action === 'suggest' ? 0.8 : 0.7,
  })
  return { ok: true, action, text: result.text, provider: result.provider, model: result.model }
}

const BOARD_ASSIST_SYSTEM = '你是严谨的中文小说设定编辑助手。你只输出一个合法 JSON 对象，不使用 Markdown 代码块，不解释，不删除已有条目，不编造与正文无关的重大设定。'

const BOARD_ASSIST_SPECS = {
  characters: {
    label: '人物看板',
    fields: 'name, role, age, tags(数组), appearance, personality, goal, ultimateGoal, secret, status, notes',
    shape: 'adds: 新人物对象数组；updates: [{ id: 现有人物 id, changes: { 允许字段 } }]',
  },
  quests: {
    label: '角色任务',
    fields: 'title, type(main|side), status(planned|active|done|failed), involvedCharacterIds(角色 id 数组), note',
    shape: 'adds: [{ characterId, title, type, status, involvedCharacterIds, note }]；updates: [{ characterId, id, changes }]',
  },
  arc: {
    label: '人物八步弧光',
    fields: 'status(todo|doing|done), note',
    shape: 'updates: [{ characterId, stageIndex: 0-7, changes: { status, note } }]；不要新增',
  },
  locations: {
    label: '地图地点',
    fields: 'name, type(港口|建筑|地标|秘密|其他), x(3-97), y(3-97), description, firstChapter',
    shape: 'adds: 新地点对象数组；updates: [{ id, changes }]',
  },
  events: {
    label: '事件时间线',
    fields: 'title, storyTime, type(背景|开端|调查|转折|危机|高潮前夜|结局|其他), importance(高|中|低), chapterPath, characterIds(角色 id 数组), description',
    shape: 'adds: 新事件对象数组；updates: [{ id, changes }]',
  },
  relationships: {
    label: '人物关系',
    fields: 'from(角色 id), to(角色 id), type(盟友|爱情|亲情|师徒|利益|隐瞒|对立|冲突|其他), strength(1-5), description',
    shape: 'adds: 新关系对象数组；updates: [{ id, changes }]',
  },
  items: {
    label: '物品与道具',
    fields: 'name, type(信物|证据|线索|人物物件|其他), ownerId(角色 id 或空), status(持有中|遗失|未送达|已损毁|未知), significance(高|中|低), firstChapter, description',
    shape: 'adds: 新道具对象数组；updates: [{ id, changes }]',
  },
  plotlines: {
    label: '明暗线',
    fields: 'title, kind(main|sub), status(进行中|已收束|待展开), progress(0-100), startChapter, endChapter, description',
    shape: 'adds: 新线索对象数组；updates: [{ id, changes }]',
  },
  foreshadows: {
    label: '伏笔',
    fields: 'title, plantedChapter, payoffChapter, status(未埋设|已埋设|已回收|已放弃), importance(高|中|低), description',
    shape: 'adds: 新伏笔对象数组；updates: [{ id, changes }]',
  },
  tension: {
    label: '剧情起伏',
    fields: 'tension(1-10), note',
    shape: 'updates: [{ path: 章节 path, changes: { tension, note } }]；不要新增',
  },
  hooks: {
    label: '钩子',
    fields: 'title, chapterPath, type(悬念|反转|情感|危机|信息差|恐怖), status(待引爆|已引爆|已失效), content, note',
    shape: 'adds: 新钩子对象数组；updates: [{ id, changes }]',
  },
}

function parseBoardJson(text) {
  const cleaned = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) throw httpError(502, 'AI 返回的看板建议不是合法 JSON')
  try { return JSON.parse(cleaned.slice(start, end + 1)) } catch { throw httpError(502, 'AI 返回的看板建议不是合法 JSON') }
}

async function boardAssist(ctx, body) {
  const board = typeof body?.board === 'string' ? body.board : ''
  const spec = BOARD_ASSIST_SPECS[board]
  if (!spec) throw httpError(400, '未知的看板类型')
  const workTitle = cleanText(body?.workTitle, 120) || '未命名作品'
  const chapterTitle = cleanText(body?.chapterTitle, 120) || '未命名章节'
  const chapterText = cleanBlock(body?.chapterText, 6000)
  const storyContext = cleanBlock(body?.storyContext, 3000)
  const dataText = JSON.stringify(body?.data ?? null).slice(0, 12_000)
  const roster = JSON.stringify(Array.isArray(body?.characters)
    ? body.characters.slice(0, 80).map(character => ({ id: character.id, name: character.name, role: character.role }))
    : [])
  const chapterList = JSON.stringify(Array.isArray(body?.chapters)
    ? body.chapters.slice(0, 120).map(chapter => ({ path: chapter.path, title: chapter.title }))
    : [])
  const characterId = typeof body?.characterId === 'string' ? body.characterId : ''
  const prompt = [
    `请根据当前章节正文，对「${spec.label}」提出增量修改。`,
    '严格规则：只输出一个 JSON 对象；不删除、不重排已有条目；优先更新已有条目，只有确实缺少时才新增；只写有正文依据或明确需要补全的内容；不确定的内容写入 warnings；更新必须使用现有 id；新增不要编造 id；引用角色必须使用角色表 id；引用章节必须使用章节表 path。',
    '输出结构：{"summary":"一句话说明","adds":[],"updates":[],"warnings":[]}',
    `本看板允许字段：${spec.fields}`,
    `本看板输出形态：${spec.shape}`,
    characterId ? `当前聚焦角色 id：${characterId}` : '',
    `作品：《${workTitle}》`,
    `章节：《${chapterTitle}》`,
    `角色表：${roster}`,
    `章节表：${chapterList}`,
    `现有看板数据：${dataText}`,
    storyContext ? `故事设定摘要（供参考，不要照抄）：\n${storyContext}` : '',
    chapterText ? `当前章节正文（节选）：\n${chapterText}` : '',
  ].filter(Boolean).join('\n\n')
  const result = await runModel(ctx, {
    system: BOARD_ASSIST_SYSTEM,
    prompt,
    maxTokens: 3000,
    temperature: 0.4,
    timeoutMs: 90_000,
  })
  const parsed = parseBoardJson(result.text)
  const adds = (Array.isArray(parsed.adds) ? parsed.adds : []).filter(item => item && typeof item === 'object').slice(0, 20)
  const updates = (Array.isArray(parsed.updates) ? parsed.updates : [])
    .filter(item => item && typeof item === 'object')
    .map((item) => {
      if (item.changes && typeof item.changes === 'object' && !Array.isArray(item.changes)) return item
      const changes = {}
      for (const [key, value] of Object.entries(item)) {
        if (key === 'id' || key === 'characterId' || key === 'path' || key === 'stageIndex' || key === 'reason' || key === 'changes') continue
        changes[key] = value
      }
      return { ...item, changes }
    })
    .slice(0, 30)
  const warnings = (Array.isArray(parsed.warnings) ? parsed.warnings : [])
    .filter(item => typeof item === 'string' && item.trim())
    .map(item => item.trim().slice(0, 500))
    .slice(0, 10)
  return {
    ok: true,
    board,
    summary: cleanText(parsed.summary, 1000) || '已生成增量建议。',
    adds,
    updates,
    warnings,
    provider: result.provider,
    model: result.model,
  }
}

/* ------------------------------------------------------------------ workbench */

async function saveWorkbench(workDir, body) {
  const source = body?.workbench ?? body
  if (JSON.stringify(source).length > MAX_BODY_BYTES) throw httpError(413, '看板数据过大')
  const workbench = normalizeWorkbench(source)
  await writeJson(path.join(workDir, 'workbench.json'), workbench)
  await touchBook(workDir)
  return { ok: true, workbench, git: await safeGitInfo(workDir) }
}

function emptyWorkbench() {
  return normalizeWorkbench({})
}

function migrateDemoWorkbench(current) {
  if (current.demoContentVersion >= 1) return current
  const characters = current.characters.map((character) => {
    const source = demoWorkbench.characters.find(candidate => candidate.id === character.id)
    if (!source) return character
    const next = { ...character }
    if (!next.ultimateGoal && source.ultimateGoal) next.ultimateGoal = source.ultimateGoal
    if ((!Array.isArray(next.quests) || next.quests.length === 0) && Array.isArray(source.quests) && source.quests.length > 0) {
      next.quests = source.quests.map(quest => ({ ...quest, involvedCharacterIds: [...(quest.involvedCharacterIds ?? [])] }))
    }
    return next
  })
  const events = current.events.map((event) => {
    const source = demoWorkbench.events.find(candidate => candidate.id === event.id)
    if (!source) return event
    if ((!Array.isArray(event.characterIds) || event.characterIds.length === 0) && Array.isArray(source.characterIds) && source.characterIds.length > 0) {
      return { ...event, characterIds: [...source.characterIds] }
    }
    return event
  })
  return { ...current, characters, events, demoContentVersion: 1 }
}

function normalizeWorkbench(source) {
  const value = source && typeof source === 'object' && !Array.isArray(source) ? source : {}
  const result = {
    ...value,
    version: 1,
    settings: value.settings && typeof value.settings === 'object' ? value.settings : {},
  }
  for (const key of WORKBENCH_ARRAYS) result[key] = Array.isArray(value[key]) ? value[key].filter(entry => entry && typeof entry === 'object') : []
  result.chapterMeta = value.chapterMeta && typeof value.chapterMeta === 'object' && !Array.isArray(value.chapterMeta)
    ? value.chapterMeta
    : {}
  result.arcs = value.arcs && typeof value.arcs === 'object' && !Array.isArray(value.arcs) ? value.arcs : {}
  result.characters = result.characters.map(character => ({
    ...character,
    ultimateGoal: textField(character.ultimateGoal),
    quests: Array.isArray(character.quests)
      ? character.quests.filter(quest => quest && typeof quest === 'object').map(quest => ({
        ...quest,
        title: textField(quest.title),
        type: quest.type === 'side' ? 'side' : 'main',
        status: ['active', 'done', 'failed', 'planned'].includes(quest.status) ? quest.status : 'active',
        involvedCharacterIds: Array.isArray(quest.involvedCharacterIds)
          ? quest.involvedCharacterIds.filter(id => typeof id === 'string')
          : [],
      }))
      : [],
  }))
  result.events = result.events.map(entry => ({
    ...entry,
    characterIds: Array.isArray(entry.characterIds) ? entry.characterIds.filter(id => typeof id === 'string') : [],
    importance: legacyLevel(entry.importance),
  }))
  result.plotlines = result.plotlines.map(entry => ({ ...entry, status: legacyStatus(entry.status, PLOT_STATUS) }))
  result.foreshadows = result.foreshadows.map(entry => ({
    ...entry,
    status: legacyStatus(entry.status, FORESHADOW_STATUS),
    importance: legacyLevel(entry.importance),
  }))
  result.hooks = result.hooks.map(entry => ({ ...entry, status: legacyStatus(entry.status, HOOK_STATUS) }))
  result.items = result.items.map(entry => ({
    ...entry,
    status: entry.status === '已丢失' ? '遗失' : entry.status,
    importance: legacyLevel(entry.importance),
    significance: legacyLevel(entry.significance),
  }))
  result.chapterMeta = Object.fromEntries(Object.entries(result.chapterMeta).map(([key, entry]) => [
    key,
    entry && typeof entry === 'object' ? { ...entry, status: legacyStatus(entry.status, CHAPTER_STATUS) } : entry,
  ]))
  return result
}

const PLOT_STATUS = ['进行中', '已收束', '待展开']
const FORESHADOW_STATUS = ['未埋设', '已埋设', '已回收', '已放弃']
const HOOK_STATUS = ['待引爆', '已引爆', '已失效']
const CHAPTER_STATUS = ['草稿', '修改中', '已完成', '大纲']
const STATUS_MIGRATIONS = {
  active: '进行中', closed: '已收束', planned: '待展开',
  paid: '已回收', planted: '已埋设', dropped: '已放弃',
  fired: '已引爆', armed: '待引爆', expired: '已失效',
  draft: '草稿', revise: '修改中', done: '已完成', outline: '大纲',
  '已丢失': '遗失',
}

function legacyStatus(value, allowed) {
  if (value === undefined || value === null || value === '') return allowed[0]
  if (allowed.includes(value)) return value
  return STATUS_MIGRATIONS[value] ?? value
}

function legacyLevel(value) {
  if (value === 'high') return '高'
  if (value === 'medium') return '中'
  if (value === 'low') return '低'
  return value
}

/* ------------------------------------------------------------------------ git */

async function initRepo(workDir) {
  const gitDir = path.join(workDir, '.git')
  if (!(await exists(gitDir))) {
    const init = await git(workDir, ['init'])
    if (!init.ok) throw httpError(500, init.stderr || 'git init 失败')
  }
  const gitAttributes = path.join(workDir, '.gitattributes')
  if (!(await exists(gitAttributes))) {
    await writeFile(gitAttributes, '* text=auto eol=lf\n*.md text eol=lf\n', 'utf8')
  }
  const gitIgnore = path.join(workDir, '.gitignore')
  if (!(await exists(gitIgnore))) {
    await writeFile(gitIgnore, '.DS_Store\nThumbs.db\n*.nwb-tmp-*\n.nwb-tmp-*\n*.tmp-*\n', 'utf8')
  }
  await git(workDir, ['config', 'core.quotePath', 'false'])
  await git(workDir, ['config', 'user.name', DEFAULT_GIT_NAME])
  await git(workDir, ['config', 'user.email', DEFAULT_GIT_EMAIL])
}

async function commitAll(workDir, message) {
  const add = await git(workDir, ['add', '-A'])
  if (!add.ok) throw httpError(500, add.stderr || 'git add 失败')
  const status = await git(workDir, ['status', '--porcelain=v1', '--untracked-files=all'])
  if (status.ok && status.stdout.trim() === '') {
    return { ok: true, noop: true, git: await gitInfo(workDir) }
  }
  let commit = await git(workDir, ['commit', '-m', message, '--no-gpg-sign'])
  if (!commit.ok && /Please tell me who you are|unable to auto-detect email/i.test(commit.stderr)) {
    await git(workDir, ['config', 'user.name', DEFAULT_GIT_NAME])
    await git(workDir, ['config', 'user.email', DEFAULT_GIT_EMAIL])
    commit = await git(workDir, ['commit', '-m', message, '--no-gpg-sign'])
  }
  if (!commit.ok) throw httpError(500, commit.stderr || 'git commit 失败')
  return { ok: true, noop: false, git: await gitInfo(workDir) }
}

async function commitWork(workDir, body) {
  if (!(await exists(path.join(workDir, '.git')))) await initRepo(workDir)
  const message = cleanText(body?.message, 200) || `保存改动 ${new Date().toLocaleString('zh-CN')}`
  return commitAll(workDir, message)
}

async function initAndCommit(workDir) {
  await initRepo(workDir)
  return commitAll(workDir, '初始化 Git 仓库')
}

async function gitInfo(workDir) {
  if (!(await exists(path.join(workDir, '.git')))) {
    return { available: false, branch: '', dirty: false, files: [], log: [], error: '作品尚未初始化 Git' }
  }
  const branchResult = await git(workDir, ['branch', '--show-current'])
  const commitResult = await git(workDir, ['rev-parse', '--verify', '--quiet', 'HEAD'])
  const status = await git(workDir, ['status', '--porcelain=v1', '--untracked-files=all'])
  if (!status.ok) {
    return { available: false, branch: '', dirty: false, files: [], log: [], error: status.stderr || '无法读取 Git 状态' }
  }
  const files = status.stdout.split('\n').filter(Boolean).map(line => {
    const code = line.slice(0, 2)
    let file = line.slice(3)
    if (file.includes(' -> ')) file = file.split(' -> ').pop() ?? file
    return { status: code.trim() || '?', path: file.replace(/^"|"$/g, '') }
  })
  let log = []
  if (commitResult.ok) {
    const logResult = await git(workDir, ['log', '--pretty=format:%h%x09%ad%x09%s', '--date=format:%Y-%m-%d %H:%M', '-n', '20'])
    if (logResult.ok) {
      log = logResult.stdout.split('\n').filter(Boolean).map(line => {
        const [hash, date, ...subject] = line.split('\t')
        return { hash, date, subject: subject.join('\t') }
      })
    }
  }
  return {
    available: true,
    branch: branchResult.stdout.trim() || (commitResult.ok ? 'detached' : 'main'),
    dirty: files.length > 0,
    files,
    log,
  }
}

async function safeGitInfo(workDir) {
  try { return await gitInfo(workDir) } catch (error) {
    return { available: false, branch: '', dirty: false, files: [], log: [], error: messageOf(error) }
  }
}

async function diffWork(workDir, relPath) {
  if (!relPath) throw httpError(400, '缺少文件路径')
  const normalized = toPosix(relPath).replace(/\\/g, '/')
  if (normalized.startsWith('/') || normalized.split('/').includes('..')) throw httpError(400, '路径无效')
  const full = path.resolve(workDir, ...normalized.split('/'))
  await ensureInside(workDir, full)
  const rel = toPosix(path.relative(workDir, full))
  let diff = await git(workDir, ['diff', '--no-color', 'HEAD', '--', rel])
  if (diff.ok && diff.stdout.trim() === '') {
    const tracked = await git(workDir, ['ls-files', '--error-unmatch', '--', rel])
    if (!tracked.ok && await exists(full) && (await stat(full)).isFile()) {
      const text = await readFile(full, 'utf8')
      diff = {
        ok: true,
        stdout: [`diff --git a/${rel} b/${rel}`, 'new file', '--- /dev/null', `+++ b/${rel}`, ...text.split('\n').map(line => `+${line}`)].join('\n'),
      }
    }
  }
  if (!diff.ok) throw httpError(500, diff.stderr || '无法读取差异')
  return { path: rel, diff: diff.stdout.slice(0, 200_000) }
}

async function git(workDir, args) {
  try {
    const result = await execFileAsync('git', ['-c', 'core.quotePath=false', ...args], {
      cwd: workDir,
      timeout: 25_000,
      maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', LC_ALL: 'C' },
      windowsHide: true,
    })
    return { ok: true, stdout: result.stdout, stderr: result.stderr }
  } catch (error) {
    return {
      ok: false,
      stdout: typeof error?.stdout === 'string' ? error.stdout : '',
      stderr: typeof error?.stderr === 'string' && error.stderr ? error.stderr : messageOf(error),
      code: error?.code,
    }
  }
}

/* ------------------------------------------------------------------ filesystem */

function workPath(root, id) {
  assertWorkId(id)
  return path.join(root, 'works', id)
}

function assertWorkId(id) {
  if (typeof id !== 'string' || !WORK_ID.test(id)) throw httpError(400, '作品 id 无效')
}

async function readBook(workDir, id) {
  const fallback = {
    id, title: id, author: '', genre: '', logline: '', description: '',
    createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString(),
  }
  const value = await readJson(path.join(workDir, 'book.json'), fallback)
  const source = value && typeof value === 'object' ? value : {}
  return {
    ...fallback,
    ...source,
    id,
    title: textField(source.title) || id,
    author: textField(source.author),
    genre: textField(source.genre),
    logline: textField(source.logline),
    description: textField(source.description),
  }
}

function textField(value) {
  return typeof value === 'string' ? value : ''
}

async function touchBook(workDir) {
  const bookPath = path.join(workDir, 'book.json')
  const book = await readJson(bookPath, {})
  await writeJson(bookPath, { ...book, updatedAt: new Date().toISOString() })
}

async function readTree(workDir) {
  const manuscript = path.join(workDir, 'manuscript')
  if (!(await exists(manuscript))) return { type: 'root', path: 'manuscript', children: [] }
  return {
    type: 'root',
    path: 'manuscript',
    children: await readTreeChildren(workDir, manuscript),
  }
}

async function readTreeChildren(workDir, dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nodes = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN', { numeric: true }))) {
    if (entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    const rel = toPosix(path.relative(workDir, full))
    if (entry.isDirectory()) {
      nodes.push({
        type: 'volume',
        name: entry.name,
        title: displayName(entry.name),
        path: rel,
        order: prefixOf(entry.name),
        children: await readTreeChildren(workDir, full),
      })
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      nodes.push({
        type: 'chapter',
        name: entry.name,
        title: displayName(entry.name),
        path: rel,
        order: prefixOf(entry.name),
      })
    }
  }
  return nodes
}

async function listSiblings(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries
    .filter(entry => !entry.name.startsWith('.'))
    .filter(entry => entry.isDirectory() || entry.name.toLowerCase().endsWith('.md'))
    .map(entry => ({
      name: entry.name,
      full: path.join(dir, entry.name),
      isDirectory: entry.isDirectory(),
      display: displayName(entry.name),
      order: prefixOf(entry.name),
    }))
    .sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name, 'zh-Hans-CN', { numeric: true }))
}

async function chapterPath(workDir, relPath, mustExist) {
  if (typeof relPath !== 'string' || relPath === '') throw httpError(400, '缺少章节路径')
  if (!relPath.toLowerCase().endsWith('.md')) throw httpError(400, '章节必须是 Markdown 文件')
  const full = await nodePath(workDir, relPath, mustExist)
  await ensureRealInside(path.join(workDir, 'manuscript'), mustExist ? full : path.dirname(full))
  return full
}

function assertNotManuscript(relPath) {
  if (typeof relPath !== 'string' || relPath === '') throw httpError(400, '缺少路径')
  const normalized = path.posix.normalize(toPosix(relPath).replace(/\\/g, '/'))
  if (normalized === 'manuscript' || normalized === 'manuscript/') throw httpError(400, '不能操作正文根目录')
}

async function nodePath(workDir, relPath, mustExist = true) {
  if (typeof relPath !== 'string' || relPath === '') throw httpError(400, '缺少路径')
  const normalized = relPath.replace(/\\/g, '/')
  if (normalized.startsWith('/') || normalized.split('/').includes('..')) throw httpError(400, '路径无效')
  if (!normalized.startsWith('manuscript/')) throw httpError(400, '路径必须位于正文目录')
  const full = path.resolve(workDir, ...normalized.split('/'))
  await ensureInside(workDir, full)
  if (mustExist && !(await exists(full))) throw httpError(404, '文件或目录不存在')
  return full
}

async function directoryPath(workDir, relPath) {
  const full = await nodePath(workDir, relPath, true)
  if (!(await stat(full)).isDirectory()) throw httpError(400, '目标不是目录')
  await ensureRealInside(path.join(workDir, 'manuscript'), full)
  return full
}

function ensureInside(base, target) {
  const rel = path.relative(base, target)
  if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) return
  throw httpError(400, '路径越界')
}

async function ensureRealInside(base, target) {
  const realBase = await realpath(base)
  try {
    const realTarget = await realpath(target)
    ensureInside(realBase, realTarget)
    return
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  ensureInside(realBase, await realpath(path.dirname(target)))
}

async function collectMarkdown(dir) {
  if (!(await exists(dir))) return []
  const result = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) result.push(...await collectMarkdown(full))
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) result.push(full)
  }
  return result
}

function nextPrefix(siblings) {
  const max = siblings.reduce((value, entry) => Math.max(value, entry.order), 0)
  return String(max + 1).padStart(3, '0')
}

function prefixOf(name) {
  const match = /^(\d{1,6})[-_. ]+/.exec(name)
  return match ? Number(match[1]) : 0
}

function displayName(name) {
  return name
    .replace(/\.md$/i, '')
    .replace(/^\d{1,6}[-_. ]+/, '')
    .trim() || name
}

function safeName(value) {
  return String(value).replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || '未命名'
}

function cleanText(value, limit) {
  if (value === undefined || value === null) return ''
  return String(value).replace(/\u0000/g, '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function cleanBlock(value, limit) {
  if (value === undefined || value === null) return ''
  return String(value).replace(/\u0000/g, '').slice(0, limit).trim()
}

function countText(content) {
  return Array.from(
    String(content)
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[#>*_`~[\]()!-]/g, ' ')
      .replace(/\s+/g, ''),
  ).length
}

function toPosix(value) {
  return value.split(path.sep).join('/')
}

function remapWorkbenchPaths(value, oldPath, newPath) {
  if (typeof value === 'string') return remapPathString(value, oldPath, newPath)
  if (Array.isArray(value)) return value.map(item => remapWorkbenchPaths(item, oldPath, newPath))
  if (value && typeof value === 'object') {
    const out = {}
    for (const [key, item] of Object.entries(value)) {
      const nextKey = remapPathString(key, oldPath, newPath)
      out[nextKey] = remapWorkbenchPaths(item, oldPath, newPath)
    }
    return out
  }
  return value
}

function remapPathString(value, oldPath, newPath) {
  if (value === oldPath) return newPath
  if (value.startsWith(`${oldPath}/`)) return `${newPath}${value.slice(oldPath.length)}`
  return value
}

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')) } catch { return fallback }
}

async function writeJson(file, value) {
  await writeAtomic(file, `${JSON.stringify(value, null, 2)}\n`)
}

async function writeAtomic(file, text) {
  await mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`
  await writeFile(tmp, text, 'utf8')
  await rename(tmp, file)
}

async function exists(target) {
  try { await access(target, fsConstants.F_OK); return true } catch { return false }
}

/* --------------------------------------------------------------------- http */

async function readJsonBody(req) {
  const essence = String(req.headers['content-type'] ?? '').split(';', 1)[0]?.trim().toLowerCase()
  if (essence !== 'application/json') {
    const length = Number(req.headers['content-length'] ?? 0)
    const hasBody = (Number.isFinite(length) && length > 0) || req.headers['transfer-encoding'] !== undefined
    if (!hasBody) return {}
    throw httpError(415, '请求必须是 application/json')
  }
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw httpError(413, '请求体过大')
    chunks.push(chunk)
  }
  if (size === 0) return {}
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw httpError(400, 'JSON 格式无效') }
}

function sendJson(res, status, payload) {
  if (res.headersSent) return
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}
