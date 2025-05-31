import * as fs from 'fs'
import * as readline from 'readline'

export async function askYesNo(
  question: string,
  defaultNo: boolean = true,
  stdin?: NodeJS.ReadableStream,
  stdout?: NodeJS.WritableStream,
): Promise<boolean> {
  const prompt = defaultNo
    ? `\x1b[33m${question} (y/N): \x1b[0m`
    : `\x1b[33m${question} (Y/n): \x1b[0m`

  const input = stdin || process.stdin
  const output = stdout || process.stdout

  // Write the prompt
  output.write(prompt)

  if (!input.isTTY) {
    // In production, we want to read from /dev/tty to avoid consuming piped data
    // In tests, /dev/tty might not be available, so we fall back to stdin
    let ttyInput: NodeJS.ReadableStream = input
    let tty: fs.ReadStream | undefined

    try {
      // Only try /dev/tty if we're not in a test environment
      // Tests will have stdin available for interaction
      if (
        !process.env.NODE_ENV?.includes('test') &&
        fs.existsSync('/dev/tty')
      ) {
        tty = fs.createReadStream('/dev/tty')
        await new Promise((resolve, reject) => {
          tty!.once('error', reject)
          tty!.once('open', resolve)
        })
        ttyInput = tty
      }
    } catch (error) {
      if (tty) {
        tty.close()
      }
    }

    // Fall back to readline for non-TTY inputs
    const rl = readline.createInterface({
      input: ttyInput,
      output,
    })

    return new Promise(resolve => {
      rl.question('', answer => {
        rl.close()
        if (tty) {
          tty.close()
        }

        const normalizedAnswer = answer.trim().toLowerCase()

        if (normalizedAnswer === '') {
          resolve(!defaultNo)
        } else {
          resolve(normalizedAnswer === 'y' || normalizedAnswer === 'yes')
        }
      })
    })
  } else {
    // Enable raw mode for immediate key detection
    if ('setRawMode' in input && typeof input.setRawMode === 'function') {
      input.setRawMode(true)
    }

    return new Promise(resolve => {
      const onKeypress = (chunk: Buffer) => {
        const key = chunk.toString().toLowerCase()

        // Handle y/n keys
        if (key === 'y') {
          output.write('y\n')
          cleanup()
          resolve(true)
        } else if (key === 'n') {
          output.write('n\n')
          cleanup()
          resolve(false)
        } else if (key === '\r' || key === '\n') {
          // Enter key - use default
          output.write(defaultNo ? 'n' : 'y')
          output.write('\n')
          cleanup()
          resolve(!defaultNo)
        } else if (key === '\u0003') {
          // Ctrl+C
          output.write('\n')
          cleanup()
          process.exit(130)
        }
      }

      const cleanup = () => {
        input.removeListener('data', onKeypress)
        if ('setRawMode' in input && typeof input.setRawMode === 'function') {
          input.setRawMode(false)
        }
        if (input.isPaused && 'resume' in input) {
          input.resume()
        }
      }

      input.on('data', onKeypress)
    })
  }
}
