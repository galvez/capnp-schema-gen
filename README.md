# capnp-schema-gen

[![npm downloads](https://img.shields.io/npm/dm/capnp-schema-gen)](https://npm.chart.dev/capnp-schema-gen)
[![Module type: ESM](https://img.shields.io/badge/module%20type-esm-brightgreen)](https://github.com/voxpelli/badges-cjs-esm)

A Cap'n Proto schema and setter function generator.

Given an arbitrary JavaScript object, this library allows you to generate a schema:

```js
const obj = {
  name: 'John', 
  email: 'john@doe.com', 
  friends: [
    { 
      name: 'Jane',
      email: 'jane@doe.com'
    }
  ]
}
```
