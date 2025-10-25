/**
 * Debug log capture utility for tracking navigation and race conditions
 */

interface LogEntry {
  timestamp: number
  level: 'log' | 'warn' | 'error' | 'debug'
  message: string
  source: string
}

class DebugLogCapture {
  private logs: LogEntry[] = []
  private isCapturing = false
  private maxLogs = 500 // Keep last 500 logs

  start() {
    if (this.isCapturing) return

    this.isCapturing = true
    this.logs = []

    // Override console methods
    const originalLog = console.log
    const originalWarn = console.warn
    const originalError = console.error
    const originalDebug = console.debug

    const captureLog = (level: LogEntry['level'], args: any[]) => {
      const message = args.map(arg => {
        if (typeof arg === 'string') return arg
        if (arg instanceof Error) return `${arg.name}: ${arg.message}`
        try {
          return JSON.stringify(arg)
        } catch {
          return String(arg)
        }
      }).join(' ')

      // Extract source from first arg if it has bracket notation [Source]
      const sourceMatch = message.match(/\[([^\]]+)\]/)
      const source = sourceMatch ? sourceMatch[1] : 'app'

      this.addLog({
        timestamp: Date.now(),
        level,
        message,
        source
      })

      // Still call original console methods
      switch (level) {
        case 'log':
          originalLog(...args)
          break
        case 'warn':
          originalWarn(...args)
          break
        case 'error':
          originalError(...args)
          break
        case 'debug':
          originalDebug(...args)
          break
      }
    }

    console.log = (...args: any[]) => captureLog('log', args)
    console.warn = (...args: any[]) => captureLog('warn', args)
    console.error = (...args: any[]) => captureLog('error', args)
    console.debug = (...args: any[]) => captureLog('debug', args)

    console.log('[DebugLogCapture] Log capture started')
  }

  stop() {
    if (!this.isCapturing) return
    this.isCapturing = false
    console.log('[DebugLogCapture] Log capture stopped')
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  getLogsBySource(source: string): LogEntry[] {
    return this.logs.filter(log => log.source.includes(source))
  }

  getRecentLogs(seconds: number): LogEntry[] {
    const cutoff = Date.now() - (seconds * 1000)
    return this.logs.filter(log => log.timestamp > cutoff)
  }

  exportAsText(): string {
    return this.logs
      .map(log => {
        const time = new Date(log.timestamp).toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          fractionalSecondDigits: 3
        })
        return `[${time}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`
      })
      .join('\n')
  }

  exportAsJSON(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  downloadLogs(filename = 'liftlog-debug.log') {
    const content = this.exportAsText()
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  clear() {
    this.logs = []
  }
}

// Create singleton instance
const debugLogCapture = new DebugLogCapture()

// Attach to window for easy access
if (typeof window !== 'undefined') {
  (window as any).__debugLogs = {
    start: () => debugLogCapture.start(),
    stop: () => debugLogCapture.stop(),
    getLogs: () => debugLogCapture.getLogs(),
    exportText: () => debugLogCapture.exportAsText(),
    exportJSON: () => debugLogCapture.exportAsJSON(),
    downloadLogs: (filename?: string) => debugLogCapture.downloadLogs(filename),
    getBySource: (source: string) => debugLogCapture.getLogsBySource(source),
    getRecent: (seconds: number) => debugLogCapture.getRecentLogs(seconds),
    print: () => console.log(debugLogCapture.exportAsText()),
    clear: () => debugLogCapture.clear(),
  }
}

export { debugLogCapture }
