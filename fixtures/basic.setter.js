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