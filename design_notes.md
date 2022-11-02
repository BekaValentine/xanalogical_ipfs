# design notes

## rough structure

- user pubkey DHT: maps a user's pubkey to feed info record
  - feed info record: a dict mapping data types to feed info for that type
    - feed info for a given type: metadata about a feed, and a pointer to the feed
- block store DHT: maps the hash of a block of data to the hosts of that data

## styling

everything that can be styled has the option for styling info:

- individual feed entries
- feeds as a whole, providing default styling for the elements of a feed
- client apps can also provide options for styling that overall all of these

data type declarations DO NOT have default styling info attached to them because they need to be identifiable independent of the styling

## relations

some relations, like "reply-to", motivate creating new items from existing ones: when you're viewing something, you can always reply

some relations, like "attachment", motivate the other way around: when you're composing a post, you want to find attachments to add

## core types

- entity kinds
  - `thing`
  - `action`

- base types -- these definitions are not stored anywhere, this is just part of the spec
  - immediate types, whos values are present directly in other objects
    - `string`
    - `integer`
    - `boolean`
    - `url`
  - indirect types, whos values are pointers to content
    - raw data -- this type has no name and cannot be referenced
    - `file_info`
      all file infos have the following form:
      ```json
      {
        "protocol_version": "string",
        "file_type": "file_type",
        "file_size": "integer",
        "raw_data_cid": "cid"
      }
      ```
    - `entity_definition`
      all entity definitions have the following form:
      ```json
      {
        "protocol_version": "string",
        "kind": "entity_kind",
        "name": "string",
        "parts": "record_type_signature"
      }
      ```
- entity types. all values have an the form
  ```json
  {
    "protocol_version": "string",
    "entity_type": "some entity type's cid",
    "datetime": "the datetime of creation",
    "parts": "some object conforming to the entity type's parts definition"
  }
  ```
  - actions
    - comment
      ```json
      {
        "kind": "action",
        "name": "Comment",
        "parts": {
          "comment": "thing",
          "commented_on": "thing"
        }
      }
      ```
    - share
      ```json
      {
        "kind": "action",
        "name": "Share",
        "parts": {
          "shared": "thing"
        }
      }
      ```
    - binary_rate
      ```json
      {
        "kind": "action",
        "name": "Binary Rate",
        "parts": {
          "rating_is_positive": "boolean",
          "rated": "thing"
        }
      }
      ```
    - update
      ```json
      {
        "kind": "action",
        "name": "Update",
        "parts": {
          "old": "thing",
          "new": "thing"
        }
      }
      ```
    - undo
      ```json
      {
        "kind": "action",
        "name": "Undo",
        "parts": {
          "undone": "action"
        }
      }
      ```
  - things
    - user_profile
      ```json
      {
        "kind": "thing",
        "name": "User Profile",
        "parts": {
          "name": "string",
          "bio": "string",
          "profile_pic": "thing"
        }
      }
      ```
    - `post`
      - short_post
        ```json
        {
          "kind": "thing",
          "name": "Short Post",
          "parts": {
            "content": "string"
          }
        }
        ```
      - long_post
        ```json
        {
          "kind": "thing",
          "name": "Long Post",
          "parts": {
            "title": "string",
            "summary": "string",
            "content": "string"
          }
        }
        ```
      - code_snippet
        ```json
        {
          "kind": "thing",
          "name": "Code Snippet",
          "parts": {
            "language": "string",
            "content": "string"
          }
        }
        ```
    - file
      ```json
      {
        "kind": "thing",
        "name": "File",
        "parts": {
          "name": "string",
          "description": "string",
          "file_info": "file_info"
        }
      }
      ```
    - collection
      ```json
      {
        "kind": "thing",
        "name": "Collection",
        "parts": {
          "name": "string",
          "description": "string"
        }
      }
      ```
    - bookmark
      ```json
      {
        "kind": "thing",
        "name": "Bookmark",
        "parts": {
          "title": "string",
          "description": "string",
          "?thing": "thing",
          "?url": "url"
        }
      }
      ```
    - entity_definition_info
      ```json
      {
        "kind": "thing",
        "name": "Entity Definition Info",
        "parts": {
          "entity_definition": "entity_definition",
          "description": "string"
        }
      }
      ```
