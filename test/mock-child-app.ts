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
  // Non-interactive mode that reads from stdin
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
} else {
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
