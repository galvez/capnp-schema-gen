import { test } from 'node:test'
import { equal } from 'node:assert'
import { readFileSync } from 'node:fs'
import { resolve, join } from 'node:path' 

import { generateSchema, generateSetterFunction } from './index.js'

import basic from './fixtures/basic.js'

const fixturesPath = resolve(import.meta.dirname, 'fixtures')

test('generate basic schema', () => {
  const schema = generateSchema('Person', basic)
  equal(
    withoutID(readFileSync(join(fixturesPath, 'basic.capnp'), 'utf8')),
    withoutID(schema)
  )
  const setter = generateSetterFunction(basic)
  equal(
    readFileSync(join(fixturesPath, 'basic.setter.js'), 'utf8'),
    setter
  )
})

function withoutID(schema) {
  return schema.replace(/@0x(.*?);/gm, '')
}
