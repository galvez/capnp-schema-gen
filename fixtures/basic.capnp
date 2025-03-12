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