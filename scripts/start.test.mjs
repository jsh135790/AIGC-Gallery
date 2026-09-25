import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { access, copyFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { isSupportedNode, start } from './start.mjs'

async function fixture(t) {
  const temporary = await mkdtemp(join(tmpdir(), 'aigc-launcher-'))
  t.after(() => rm(temporary, { recursive: true, force: true }))
  const root = join(temporary, 'repo with spaces \u56fe\u5e93')
  await mkdir(root)
  await writeFile(join(root, 'package.json'), JSON.stringify({ private: true }))
  await writeFile(join(root, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3 }))
  const fingerprint = join(root, 'node_modules', '.aigc-gallery-deps.sha256')
  const calls = []
  const options = {
    root,
    version: '24.13.0',
    async portCheck() {},
    log() {},
    async run(args, cwd) {
      assert.equal(cwd, root)
      calls.push(args)
      if (args[0] === 'ci') {
        await mkdir(join(root, 'node_modules', 'vite', 'bin'), { recursive: true })
        await mkdir(join(root, 'node_modules', '.bin'), { recursive: true })
        await writeFile(join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '')
        await writeFile(join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite'), '')
      }
      return { code: 0, interrupted: false }
    },
  }
  return { root, fingerprint, calls, options }
}

test('Node version requirement includes 22.12 and newer versions', () => {
  for (const version of ['20.19.0', '22.11.9']) assert.equal(isSupportedNode(version), false)
  for (const version of ['22.12.0', '22.20.0', '24.0.0', '25.1.0']) assert.equal(isSupportedNode(version), true)
})

test('old Node fails before npm or filesystem changes', async t => {
  const { options, calls, fingerprint } = await fixture(t)
  await assert.rejects(start({ ...options, version: '22.11.0' }), /Node.js 22.12\+.*nodejs.org/)
  assert.deepEqual(calls, [])
  await assert.rejects(access(fingerprint), { code: 'ENOENT' })
})

test('first start installs dev dependencies and keeps the exact localhost origin', async t => {
  const { options, calls, fingerprint } = await fixture(t)
  await start(options)
  assert.deepEqual(calls, [
    ['--version'],
    ['ci', '--include=dev'],
    ['run', 'dev', '--', '--host', 'localhost', '--port', '5173', '--strictPort', '--open', 'http://localhost:5173'],
  ])
  assert.match(await readFile(fingerprint, 'utf8'), /^[a-f0-9]{64}\n$/)
})

test('unchanged dependencies start without another installation', async t => {
  const { options, calls } = await fixture(t)
  await start(options)
  calls.length = 0
  await start(options)
  assert.deepEqual(calls.map(args => args[0]), ['--version', 'run'])
})

for (const file of ['package.json', 'package-lock.json']) {
  test(`a changed ${file} triggers installation again`, async t => {
    const { options, root, calls, fingerprint } = await fixture(t)
    await start(options)
    const previous = await readFile(fingerprint, 'utf8')
    await writeFile(join(root, file), JSON.stringify({ changed: true }))
    calls.length = 0
    await start(options)
    assert.deepEqual(calls.map(args => args[0]), ['--version', 'ci', 'run'])
    assert.notEqual(await readFile(fingerprint, 'utf8'), previous)
  })
}

test('changing Node major version reinstalls platform dependencies', async t => {
  const { options, calls } = await fixture(t)
  await start(options)
  calls.length = 0
  await start({ ...options, version: '22.12.0' })
  assert.deepEqual(calls.map(args => args[0]), ['--version', 'ci', 'run'])
})

test('a missing Vite entry forces repair despite a matching fingerprint', async t => {
  const { options, root, calls } = await fixture(t)
  await start(options)
  await rm(join(root, 'node_modules', 'vite', 'bin', 'vite.js'))
  calls.length = 0
  await start(options)
  assert.deepEqual(calls.map(args => args[0]), ['--version', 'ci', 'run'])
})

test('npm not found or a failed npm probe shows installation guidance', async t => {
  const { options, fingerprint } = await fixture(t)
  for (const run of [async () => { throw new Error('ENOENT') }, async () => ({ code: 1 })]) {
    await assert.rejects(start({ ...options, run }), /npm is unavailable.*nodejs.org/)
  }
  await assert.rejects(access(fingerprint), { code: 'ENOENT' })
})

test('a failed repair invalidates the old fingerprint and does not start Vite', async t => {
  const { options, root, calls, fingerprint } = await fixture(t)
  await start(options)
  await rm(join(root, 'node_modules', 'vite', 'bin', 'vite.js'))
  calls.length = 0
  await assert.rejects(start({ ...options, run: async (args, cwd) => {
    if (args[0] === 'ci') return { code: 1 }
    return options.run(args, cwd)
  } }), /Dependency installation failed/)
  assert.deepEqual(calls.map(args => args[0]), ['--version'])
  await assert.rejects(access(fingerprint), { code: 'ENOENT' })
  await start(options)
  await access(fingerprint)
})

test('an install that reports success without Vite is not cached', async t => {
  const { options, fingerprint } = await fixture(t)
  await assert.rejects(start({ ...options, run: async () => ({ code: 0 }) }), /did not provide Vite/)
  await assert.rejects(access(fingerprint), { code: 'ENOENT' })
})

test('interrupted installation neither starts Vite nor records success', async t => {
  const { options, fingerprint, calls } = await fixture(t)
  await start({ ...options, run: async (args, cwd) => {
    if (args[0] === 'ci') return { code: 130, interrupted: true }
    return options.run(args, cwd)
  } })
  assert.deepEqual(calls.map(args => args[0]), ['--version'])
  await assert.rejects(access(fingerprint), { code: 'ENOENT' })
})

test('server failure stops with a fixed-port hint and never retries a different port', async t => {
  const { options, calls } = await fixture(t)
  await assert.rejects(start({ ...options, run: async (args, cwd) => {
    await options.run(args, cwd)
    return { code: args[0] === 'run' ? 1 : 0 }
  } }), /port 5173 is occupied/)
  assert.equal(calls.filter(args => args[0] === 'run').length, 1)
})

test('an occupied port stops before installing or changing the fingerprint', async t => {
  const { options, calls, fingerprint } = await fixture(t)
  await assert.rejects(start({ ...options, portCheck: async () => { throw new Error('Port 5173 is already in use') } }), /5173/)
  assert.deepEqual(calls.map(args => args[0]), ['--version'])
  await assert.rejects(access(fingerprint), { code: 'ENOENT' })
})

test('the actual entry point runs from a temporary path and reports missing npm', async t => {
  const { root } = await fixture(t)
  await mkdir(join(root, 'scripts'))
  const script = join(root, 'scripts', 'start.mjs')
  await copyFile(new URL('./start.mjs', import.meta.url), script)
  const result = spawnSync(process.execPath, [script], {
    cwd: tmpdir(), encoding: 'utf8', timeout: 15000,
    env: { ...process.env, PATH: process.platform === 'win32' ? join(process.env.SystemRoot, 'System32') : root },
  })
  assert.ifError(result.error)
  assert.equal(result.status, 1, result.stdout + result.stderr)
  assert.match(result.stderr, /npm is unavailable.*nodejs.org/)
})

test('Ctrl+C stopping the server is a normal shutdown', async t => {
  const { options } = await fixture(t)
  await start({ ...options, run: async (args, cwd) => {
    await options.run(args, cwd)
    return { code: args[0] === 'run' ? 130 : 0, interrupted: args[0] === 'run' }
  } })
})

for (const launcher of ['start.bat', 'start.sh']) {
  test(`${launcher} rejects old Node before loading the module`, async t => {
    if (launcher === 'start.bat' && process.platform !== 'win32') return t.skip('Windows only')
    const bash = process.platform === 'win32'
      ? join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'bin', 'bash.exe') : 'bash'
    if (launcher === 'start.sh' && spawnSync(bash, ['--version']).error) return t.skip('Bash unavailable')
    const { root } = await fixture(t)
    await copyFile(new URL(`../${launcher}`, import.meta.url), join(root, launcher))
    const shim = join(root, 'old-node.cjs')
    for (const version of ['12.22.12', '22.11.0']) {
      await writeFile(shim, `Object.defineProperty(process.versions, 'node', { value: '${version}' });`)
      const options = {
        cwd: tmpdir(), encoding: 'utf8', input: '\n', timeout: 15000,
        env: { ...process.env, NODE_OPTIONS: `--require "${shim}"` },
      }
      const result = launcher === 'start.bat'
        ? spawnSync(`"${join(root, launcher)}"`, { ...options, shell: process.env.ComSpec || 'cmd.exe' })
        : spawnSync(bash, ['--noprofile', '--norc', join(root, launcher)], options)
      assert.ifError(result.error)
      assert.equal(result.status, 1, result.stdout + result.stderr)
      assert.match(result.stdout + result.stderr, /Node.js 22.12 or newer is required.*nodejs.org/)
    }
  })

  test(`${launcher} finds its own directory and propagates startup failures`, async t => {
    if (launcher === 'start.bat' && process.platform !== 'win32') return t.skip('Windows only')
    const bash = process.platform === 'win32'
      ? join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'bin', 'bash.exe') : 'bash'
    if (launcher === 'start.sh' && spawnSync(bash, ['--version']).error) return t.skip('Bash unavailable')
    const { root } = await fixture(t)
    await copyFile(new URL(`../${launcher}`, import.meta.url), join(root, launcher))
    await mkdir(join(root, 'scripts'))
    await writeFile(join(root, 'scripts', 'start.mjs'), `
      console.log(JSON.stringify({ root: process.cwd() }));
      process.exitCode = Number(process.env.AIGC_TEST_EXIT_CODE || 0);
    `)
    for (const exitCode of [0, 1]) {
      const options = {
        cwd: tmpdir(), encoding: 'utf8', input: '\n', timeout: 15000,
        env: { ...process.env, AIGC_TEST_EXIT_CODE: String(exitCode) },
      }
      const result = launcher === 'start.bat'
        ? spawnSync(`"${join(root, launcher)}"`, { ...options, shell: process.env.ComSpec || 'cmd.exe' })
        : spawnSync(bash, ['--noprofile', '--norc', join(root, launcher)], options)
      assert.ifError(result.error)
      assert.equal(result.status, exitCode, result.stdout + result.stderr)
      const actualRoot = JSON.parse(result.stdout.split(/\r?\n/).find(line => line.startsWith('{'))).root
      assert.equal(await realpath(actualRoot), await realpath(root))
      if (launcher === 'start.bat' && exitCode === 1) assert.match(result.stdout, /continue|继续/)
    }
  })
}

test('Windows launcher reports a missing Node installation and exits with failure', async t => {
  if (process.platform !== 'win32') return t.skip('Windows only')
  const { root } = await fixture(t)
  await copyFile(new URL('../start.bat', import.meta.url), join(root, 'start.bat'))
  const result = spawnSync(`"${join(root, 'start.bat')}"`, {
    shell: process.env.ComSpec || 'cmd.exe', cwd: tmpdir(), encoding: 'utf8', input: '\n', timeout: 15000,
    env: { ...process.env, PATH: join(process.env.SystemRoot, 'System32') },
  })
  assert.ifError(result.error)
  assert.equal(result.status, 1, result.stdout + result.stderr)
  assert.match(result.stdout, /Node.js is required.*nodejs.org/)
})
