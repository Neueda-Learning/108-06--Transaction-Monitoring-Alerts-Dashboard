// Builds the app, serves the production build, and runs a Lighthouse audit against it.
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'

const PORT = 4173
const URL = `http://localhost:${PORT}`
const OUT_DIR = 'lighthouse-report'

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 404) return
    } catch {
      // server not ready yet
    }
    await delay(300)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function run() {
  const preview = spawn('npx vite preview --port ' + PORT + ' --strictPort', {
    stdio: 'inherit',
    shell: true,
  })

  let chrome
  try {
    await waitForServer(URL)

    chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new'] })
    const result = await lighthouse(URL, {
      port: chrome.port,
      output: ['html', 'json'],
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    })

    mkdirSync(OUT_DIR, { recursive: true })
    writeFileSync(`${OUT_DIR}/report.html`, result.report[0])
    writeFileSync(`${OUT_DIR}/report.json`, result.report[1])

    const scores = result.lhr.categories
    console.log('\nLighthouse scores:')
    for (const category of Object.values(scores)) {
      console.log(`  ${category.title}: ${Math.round(category.score * 100)}`)
    }
    console.log(`\nFull report: ${OUT_DIR}/report.html`)
  } finally {
    // chrome-launcher can fail to clean up its temp profile dir on Windows if Chrome hasn't released file handles yet; non-fatal.
    if (chrome) await chrome.kill().catch(() => {})
    preview.kill()
  }
}

run().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
