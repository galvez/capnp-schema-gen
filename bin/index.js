#!/usr/bin/env node

import { readFileSync } from 'fs'
import { generateSchema } from '../index.js'

async function processInput(entity, source) {
  try {
    const schema = generateSchema(entity, JSON.parse(source))
    console.log(schema)
  } catch (error) {
    console.error('Error generating schema:', error.message)
    process.exit(1)
  }
}

async function readStream(stream) {
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

async function main() {
  const [filePath, entity] = process.argv.slice(2,4)

  if (filePath && entity) {
    try {
      const fileContent = readFileSync(filePath, 'utf8')
      await processInput(entity, fileContent)
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error.message)
      process.exit(1)
    }
  } else if (!process.stdin.isTTY) {
    const entity = process.argv[2]
    if (!entity) {
      showUsage()
    }
    const stdinContent = await readStream(process.stdin)
    await processInput(entity, stdinContent)
  } else {
    showUsage()
  }
}

function showUsage () {
  console.log('Usage:')
  console.log('  capnp-schema-gen [file]')
  console.log('  cat file | capnp-schema-gen')
  process.exit(0)
}

await main()
