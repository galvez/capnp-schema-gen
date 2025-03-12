# capnp-schema-gen

[![npm downloads](https://img.shields.io/npm/dm/capnp-schema-gen)](https://npm.chart.dev/capnp-schema-gen)
[![Module type: ESM](https://img.shields.io/badge/module%20type-esm-brightgreen)](https://github.com/voxpelli/badges-cjs-esm)

A [Cap'n Proto](https://capnproto.org/) schema and setter function generator compatible with Pooya Parsa's [capnp-es](https://github.com/unjs/capnp-es).

Given an arbitrary JavaScript object:

```js
const data = {
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

You can generate an inferred Cap'n Proto schema:

```js
const schema = generateSchema('Person', data)
console.log(schema)
```

```c
@0xe3603ad8685d0f0c;

struct Person {
  name @0 :Text;
  email @1 :Text;
  friends @2 :List(PersonFriendsItem);
}

struct PersonFriendsItem {
  name @0 :Text;
  email @1 :Text;
}
```

And an accompanying setter function:

```js
const defs = generateDefinitions('Person', data)
const setter = generateSetterFunction('Person', data, defs)
console.log(setter)
```

```js
function setter(capnp, schemaClass, data) {
  const message = new capnp.Message();
  const obj = message.initRoot(schemaClass);
  if (typeof data.name !== 'undefined') {
    obj.name = data.name;
  }
  if (typeof data.email !== 'undefined') {
    obj.email = data.email;
  }
  const friendsList = obj._initFriends(data.friends.length);
  for (let i = 0; i < data.friends.length; i++) {
    if (data.friends[i] !== null && typeof data.friends[i] === 'object') {
      const friendsItem = friendsList.get(i);
      if (typeof data.friends[i].name !== 'undefined') {
        friendsItem.name = data.friends[i].name;
      }
      if (typeof data.friends[i].email !== 'undefined') {
        friendsItem.email = data.friends[i].email;
      }
    }
  }
  return message.toArrayBuffer();
}
```

## License

MIT
