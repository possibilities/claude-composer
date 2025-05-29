#!/usr/bin/env tsx

import * as readline from 'readline'

const args = process.argv.slice(2)

if (args.includes('--echo-args')) {
  console.log('ARGS:', args.join(' '))
  process.exit(0)
}

if (args.includes('--exit')) {
  const exitCodeIndex = args.indexOf('--exit')
  const exitCode = parseInt(args[exitCodeIndex + 1] || '0', 10)
  process.exit(exitCode)
}

if (args.includes('--color')) {
  console.log('\x1b[31mRed text\x1b[0m')
  console.log('\x1b[32mGreen text\x1b[0m')
  console.log('\x1b[33mYellow text\x1b[0m')
  console.log('\x1b[34mBlue text\x1b[0m')
  console.log('Normal text')
  process.exit(0)
}

if (args.includes('--welcome')) {
  console.log('╭───────────────────────────────────────────────────╮')
  console.log('│ ✻ TEST_PATTERN_TRIGGER Mock App Test              │')
  console.log('│                                                   │')
  console.log('│   This is a test pattern for automated testing    │')
  console.log('│                                                   │')
  console.log('│   cwd: /home/mike/code/claude-composer-next       │')
  console.log('╰───────────────────────────────────────────────────╯')

  if (process.stdout.isTTY) {
    process.stdout.write('')
  }

  setTimeout(() => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    })

    rl.on('line', (input: string) => {
      console.log(`Received input: ${input}`)
      if (input.trim() === 'exit') {
        rl.close()
        process.exit(0)
      }
    })
  }, 500)
} else if (args.includes('--size')) {
  console.log(
    'Terminal size:',
    process.stdout.columns + 'x' + process.stdout.rows,
  )

  if (args.includes('--watch')) {
    console.log('Watching for resize events...')
    process.stdout.on('resize', () => {
      console.log(
        'Resized to:',
        process.stdout.columns + 'x' + process.stdout.rows,
      )
    })
    setTimeout(() => {
      console.log('Size watch complete')
      process.exit(0)
    }, 5000)
  } else {
    process.exit(0)
  }
}

if (args.includes('--sleep')) {
  const sleepIndex = args.indexOf('--sleep')
  const sleepMs = parseInt(args[sleepIndex + 1] || '1000', 10)
  setTimeout(() => {
    console.log('Sleep complete')
    process.exit(0)
  }, sleepMs)
} else if (args.includes('--interactive')) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'mock> ',
  })

  console.log('Mock interactive mode')
  rl.prompt()

  rl.on('line', line => {
    if (line.trim() === 'exit') {
      rl.close()
    } else {
      console.log(`Echo: ${line}`)
      rl.prompt()
    }
  })

  rl.on('close', () => {
    console.log('Goodbye!')
    process.exit(0)
  })
} else if (args.includes('--stdin')) {
  console.log('Reading from stdin...')

  let inputData = ''
  process.stdin.on('data', chunk => {
    inputData += chunk.toString()
  })

  process.stdin.on('end', () => {
    console.log('Received input:')
    console.log(inputData)
    console.log('Input length:', inputData.length)
    process.exit(0)
  })
} else if (!args.includes('--welcome')) {
  console.log('Mock child app running')
  console.log('Environment:', process.env.MOCK_ENV || 'not set')
  process.exit(0)
}

process.on('SIGINT', () => {
  console.log('Mock app received SIGINT')
  process.exit(130)
})

process.on('SIGTERM', () => {
  console.log('Mock app received SIGTERM')
  process.exit(143)
})
