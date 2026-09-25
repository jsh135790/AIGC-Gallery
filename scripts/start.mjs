import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const installGuide = 'Install Node.js 24 LTS (including npm) from https://nodejs.org/ and reopen this launcher.'
const fingerprintName = '.aigc-gallery-deps.sha256'

export function isSupportedNode(version) {
  const [major, minor] = version.split('.').map(Number)
  return major > 22 || (major === 22 && minor >= 12)
}

export function checkPort() {
  // 在 npm ci 前检查，避免重复启动先重装正在使用的依赖；竞态仍由 Vite 的 strictPort 兜底。
  return new Promise((resolveCheck, reject) => {
    const probe = createServer()
    probe.once('error', error => reject(error.code === 'EADDRINUSE'
      ? new Error('Port 5173 is already in use. If AIGC Gallery is running, open http://localhost:5173; otherwise close the other server and retry.')
      : error))
    probe.listen(5173, 'localhost', () => probe.close(error => error ? reject(error) : resolveCheck()))
  })
}

export function runNpm(args, cwd) {
  // Windows 的 npm 是批处理入口；命令参数全部由本文件固定提供，不拼入路径或用户输入。
  const command = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : 'npm'
  const commandArgs = process.platform === 'win32' ? ['/d', '/s', '/c', `npm ${args.join(' ')}`] : args
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, commandArgs, { cwd, stdio: 'inherit' })
    let interrupted = false
    // 终端会把 Ctrl+C 同时发给父子进程；等待 npm/Vite 退出，避免提前返回后遗留服务。
    const onInterrupt = () => { interrupted = true }
    process.on('SIGINT', onInterrupt)
    child.once('error', error => {
      process.off('SIGINT', onInterrupt)
      reject(error)
    })
    child.once('close', (code, signal) => {
      process.off('SIGINT', onInterrupt)
      resolveRun({ code, interrupted: interrupted || signal === 'SIGINT' })
    })
  })
}

async function dependenciesReady(root) {
  const executable = process.platform === 'win32' ? 'vite.cmd' : 'vite'
  try {
    await access(join(root, 'node_modules', 'vite', 'bin', 'vite.js'))
    await access(join(root, 'node_modules', '.bin', executable))
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

export async function start({ root = projectRoot, version = process.versions.node, run = runNpm, portCheck = checkPort, log = console.log } = {}) {
  if (!isSupportedNode(version)) {
    throw new Error(`Node.js ${version} is unsupported; Node.js 22.12+ is required. ${installGuide}`)
  }

  let npmCheck
  try {
    npmCheck = await run(['--version'], root)
  } catch {
    throw new Error(`npm is unavailable. ${installGuide}`)
  }
  if (npmCheck.interrupted) return
  if (npmCheck.code !== 0) throw new Error(`npm is unavailable. ${installGuide}`)

  await portCheck()

  const manifests = await Promise.all(['package.json', 'package-lock.json'].map(name => readFile(join(root, name), 'utf8')))
  // 平台与 Node 主版本也参与指纹，防止复制的 node_modules 复用不兼容的原生依赖。
  const fingerprint = createHash('sha256').update(JSON.stringify({
    manifests, platform: process.platform, arch: process.arch, node: version.split('.')[0],
  })).digest('hex')
  const fingerprintPath = join(root, 'node_modules', fingerprintName)
  let installedFingerprint
  try {
    installedFingerprint = (await readFile(fingerprintPath, 'utf8')).trim()
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  if (installedFingerprint !== fingerprint || !(await dependenciesReady(root))) {
    log('Installing dependencies with npm ci. The first start or a dependency update requires internet access.')
    await rm(fingerprintPath, { force: true })
    const install = await run(['ci', '--include=dev'], root)
    if (install.interrupted) return
    if (install.code !== 0) throw new Error('Dependency installation failed. Check the npm output and your connection, then rerun the launcher.')
    if (!(await dependenciesReady(root))) throw new Error('Installation did not provide Vite. Check the npm output and rerun the launcher.')
    await writeFile(fingerprintPath, `${fingerprint}\n`)
  }

  log('Starting AIGC Gallery at http://localhost:5173. Press Ctrl+C to stop.')
  log('Port 5173 must be free; the launcher will not switch ports or stop another process.')
  const server = await run(['run', 'dev', '--', '--host', 'localhost', '--port', '5173', '--strictPort', '--open', 'http://localhost:5173'], root)
  if (!server.interrupted && server.code !== 0) {
    throw new Error('The development server exited with an error. Check the Vite output above; if port 5173 is occupied, close the other server and retry.')
  }
}

// Windows 短路径与模块 URL 的长路径可能指向同一文件，比较前统一解析。
if (process.argv[1] && await realpath(process.argv[1]) === await realpath(fileURLToPath(import.meta.url))) {
  start().catch(error => {
    console.error(`\n${error.message}`)
    process.exitCode = 1
  })
}
