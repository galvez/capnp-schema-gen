#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { generateSetterFunction, generateSchema } from '../index.js'

async function processInputSetter(generateSetter, source) {
  try {
    const setter = generateSetter(JSON.parse(source))
    console.log(setter)
  } catch (error) {
    console.error('Error generating setter:', error.message)
    process.exit(1)
  }
}

async function processInputSchema(generateSchema, entity, source) {
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
  const argv = process.argv.slice()
  const setter = argv.findIndex(_ => _ === '--setter')
  if (setter !== -1) {
    argv.splice(setter, 1)
    printSetter(generateSetterFunction, argv)
  } else {
    printSchema(generateSchema, argv)
  }
}

async function printSetter (generateSetterFunction, argv) {
  const filePath = argv[2]
  if (filePath) {
    try {
      const fileContent = readFileSync(filePath, 'utf8')
      await processInputSetter(generateSetterFunction, fileContent)
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
    await processInputSetter(generateSetterFunction, stdinContent)
  } else {
    showUsage()
  }
}

async function printSchema (generateSchema, argv) {
  const [filePath, entity] = argv.slice(2,4)
  if (filePath && entity) {
    try {
      const fileContent = readFileSync(filePath, 'utf8')
      await processInputSchema(generateSchema, entity, fileContent)
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
    await processInputSchema(generateSchema, entity, stdinContent)
  } else {
    showUsage()
  }
}


function showUsage () {
  console.log('Usage:')
  console.log('  capnp-schema-gen [file] [Entity]')
  console.log('  cat file | capnp-schema-gen [Entity]')
  console.log('  capnp-schema-gen --setter [file]')
  console.log('  cat file | capnp-schema-gen --setter')

  process.exit(0)
}

main()
