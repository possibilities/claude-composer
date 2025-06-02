#!/usr/bin/env node

// Test script to simulate the "to interrupt)" text appearing and disappearing

console.log('Starting test...')
console.log(
  'This will simulate the appearance and disappearance of the interrupt text.',
)

// Show the text for 3 seconds
console.log('\nShowing interrupt text for 3 seconds...')
const showInterval = setInterval(() => {
  console.log('Press ENTER to continue or Ctrl+C to interrupt)')
}, 500)

setTimeout(() => {
  clearInterval(showInterval)
  console.log('\nRemoving interrupt text...')

  // Keep printing other messages without the trigger text
  const hideInterval = setInterval(() => {
    console.log('Working... processing data...')
  }, 500)

  // After 5 seconds, stop everything
  setTimeout(() => {
    clearInterval(hideInterval)
    console.log('\nTest complete! You should see a notification now.')
    process.exit(0)
  }, 5000)
}, 3000)
