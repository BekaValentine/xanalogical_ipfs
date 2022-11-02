# Type Syntax

This document tries to outline the way that type declarations can be done for p2p schemas.

## Examples

```
let UserProfile = {
  name : string,
  bio : string,
  pictures : Collection Picture
};

let Picture = bytestring;

tagged Collection a {
  ListCol (list a),
  TreeCol (Tree a),
  SkipCol (SkipList a)
};

tagged Tree a {
  Empty,
  Branch {
    label : a
    left : Tree a,
    right : Tree a
  }
};
```

## Mapping to JSON

Basic types map directly to JSON strings. So `string`, `number`, `list a`, map directly into JSON strings, numbers (as strings), and lists.

Same for record types `{ foo : Bar }` which maps to just a JSON object.

Tagged types map to objects with a key `@tag` and a key `@content`.

Any type can also be represented by a cid in the form of a JSON object `{ "@cid": ... }`, but this should never then point to another cid.

## Auto Fields vs. Not

Some fields should be automatically computed by the system, rather than provided by the user. For example, the datetime of publication.

## Example: Bandcamp

```
// user.cid
{
  name : string,
  bio : string,
  profile_picture : cid image
}

// song.cid
{
  title : string,
  description : string,
  song_art : optional (cid image)
}

// album.cid
{
  title : string,
  description : string,
  album_art : optional (cid image),
  song_list : list (cid song)
}
```
