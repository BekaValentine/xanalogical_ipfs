console.json_log = function (x) {
  console.log(JSON.stringify(x));
}

//////////////// Equality ////////////////

function deep_equality(a, b) {
  if (typeof a === typeof b && a === b) {
    return true
  };

  if (a instanceof Array && b instanceof Array) {
    if (a.length != b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!deep_equality(a[i], b[i])) {
        return false;
      }
    }

    return true;

  } else if (a instanceof Array || b instanceof Array) {
    return false;

  } else if (a instanceof Object && b instanceof Object) {

    let a_keys = Object.keys(a).sort();
    let b_keys = Object.keys(b).sort();

    if (a_keys.length != b_keys.length) {
      return false;
    }

    for (let i = 0; i < a_keys.length; i++) {
      if (a_keys[i] != b_keys[i]) {
        return false;
      }
    }

    for (let k of a_keys) {
      if (!deep_equality(a[k], b[k])) {
        return false;
      }
    }

    return true;

  } else {
    return false;
  }
}



//////////////// IPFS ////////////////

let IPFS = {};
IPFS.cat = async function (cid) {
  return (await Neutralino.os.execCommand(`ipfs cat ${cid}`)).stdOut;
};
IPFS.add = async function (obj) {
  let str = JSON.stringify(obj);
  console.log(`Adding object: ${str}`);
  let cid = (await Neutralino.os.execCommand("ipfs add --quieter", {
    stdIn: str
  })).stdOut.trim();
  console.log(`  Succeeded with cid: ${cid}`);
  return cid;
};
IPFS.resolve = async function () {
  return (await Neutralino.os.execCommand("ipfs name resolve")).stdOut.trim();
}
IPFS.publish = async function (cid) {
  console.log(`Publishing cid: ${cid}`);
  let res = (await Neutralino.os.execCommand(`ipfs name publish ${cid}`)).stdOut.trim();
  console.log(`  Succeeded with: ${res}`);
  return res;
}



//////////////// Core Types ////////////////

function check_entity_kind(x) {
  return x == "thing" || x == "action";
}
function check_protocol_version(x) {
  return typeof x == "string";
}
function check_file_type(x) {
  // file types are file extentions/whitespace-free text
  return typeof x == "string" && x.match(/^\S+$/);
}
function check_string(x) {
  return typeof x == "string";
}
function check_integer(x) {
  return typeof x == "string" && x.match(/^\d+$/);
}
function check_boolean(x) {
  return x === true || x === false;
}
function check_url(x) {
  // wrong but sufficient for now
  return typeof x == "string" && x.match(/^\S+$/);
}
function check_cid(x) {
  // wrong but sufficient for now
  return typeof x == "string" && x.match(/^\S+$/);
}
function check_part_name(x) {
  return typeof x == "string" && x.match(/^[a-z0-9_]+$/);
}
function check_parts_definition(x) {
  if (x instanceof Array || !(x instanceof Object)) {
    throw `Expected object for parts definition: ${x}`;
  }

  for (let [k, t] of Object.entries(x)) {
    if (!check_part_name(k)) {
      throw `Expected a part name: ${k}`;
    } else if (!check_type(t)) {
      throw `Expected a type: ${k}`;
    }
  }

  return true;
}
function check_type(x) {
  return x == "string" ||
          x == "integer" ||
          x == "boolean" ||
          x == "url" ||
          x == "file_info" ||
          x == "entity_definition" ||
          check_entity_kind(x);
}

function FileInfo(cid, protocol_version, file_type, file_size, raw_data_cid) {
  this.cid = cid;
  this.protocol_version = protocol_version;
  this.file_type = file_type;
  this.file_size = file_size;
  this.raw_data_cid = raw_data_cid;
}
FileInfo.cache = {};
FileInfo.load = async function (cid) {
  if (!(await FileInfo.check(cid))) {
    return null;
  } else {
    return FileInfo.cache[cid];
  }
};
FileInfo.check = async function (cid) {
  if (!check_cid(cid)) {
    return false;
  }

  if (cid in FileInfo.cache) {
    return true;
  }

  let info = JSON.parse(await IPFS.cat(cid));

  if (info instanceof Array || !(info instanceof Object)) {
    return false;
  }

  if (!deep_equality(
        ["file_size", "file_type", "protocol_version", "raw_data_cid"],
        Object.keys(info).sort())) {
    return false;
  }

  if (!check_integer(info.file_size) ||
      !check_file_type(info.file_type) ||
      !check_protocol_version(info.protocol_version) ||
      !check_cid(info.raw_data_cid)) {
    return false;
  }

  FileInfo.cache[cid] = new FileInfo(
    cid,
    info.protocol_version,
    info.file_type,
    info.file_size,
    info.raw_data_cid
  );

  return true;
}
FileInfo.prototype.store = async function () {
  this.cid = await IPFS.add({
    "protocol_version": this.protocol_version,
    "file_type": this.file_type,
    "file_size": this.file_size,
    "raw_data_cid": this.raw_data_cid
  });
};

function EntityDefinition(cid, protocol_version, kind, name, parts) {
  this.cid = cid;
  this.protocol_version = protocol_version;
  this.kind = kind;
  this.name = name;
  this.parts = parts;
}
EntityDefinition.cache = {};
EntityDefinition.load = async function (cid) {
  if (!(await EntityDefinition.check(cid))) {
    return null;
  } else {
    return EntityDefinition.cache[cid];
  }
};
EntityDefinition.check = async function (cid) {
  if (!check_cid(cid)) {
    return false;
  }

  if (cid in EntityDefinition.cache) {
    return true;
  }

  let info = JSON.parse(await IPFS.cat(cid))

  if (info instanceof Array || !(info instanceof Object)) {
    return false;
  }

  if (!deep_equality(
        ["kind", "name", "parts", "protocol_version"],
        Object.keys(info).sort())) {
    return false;
  }

  if (!check_entity_kind(info.kind) ||
      !check_string(info.name) ||
      !check_protocol_version(info.protocol_version) ||
      !check_parts_definition(info.parts)) {
    return false;
  }

  EntityDefinition.cache[cid] = new EntityDefinition(
    cid,
    info.protocol_version,
    info.kind,
    info.name,
    info.parts
  );

  return true;
};
EntityDefinition.prototype.store = async function () {
  this.cid = await IPFS.add({
    "protocol_version": this.protocol_version,
    "kind": this.kind,
    "name": this.name,
    "parts": this.parts
  });
};
EntityDefinition.prototype.check_entity = async function (ent) {
  if (this.protocol_version != ent.protocol_version) {
    throw `Mismatched protocol versions: ${this.protocol_version} and ${ent.protocol_version}`;
    return false;
  } else if (this.cid != ent.entity_type) {
    throw `Mismatched types: ${this.cid} and ${ent.entity_type}`;
    return false;
  }

  if (!deep_equality(
        Object.keys(this.parts).sort(),
        Object.keys(ent.parts).sort())) {
    throw `Different keys: ${JSON.stringify(this.parts)} and ${JSON.stringify(ent.parts)}`;
    return false
  }
  for (let [k, t] of Object.entries(this.parts)) {
    if (t == "string") {
      if (!check_string(ent.parts[k])) {
        throw `Not string: ${ent.parts[k]}`;
        return false;
      }
    } else if (t == "integer") {
      if (!check_integer(ent.parts[k])) {
        throw `Not integer: ${ent.parts[k]}`;
        return false;
      }
    } else if (t == "boolean") {
      if (!check_boolean(ent.parts[k])) {
        throw `Not boolean: ${ent.parts[k]}`;
        return false;
      }
    } else if (t == "url") {
      if (!check_url(ent.parts[k])) {
        throw `Not url: ${ent.parts[k]}`;
        return false;
      }
    } else if (t == "file_info") {
      if (!(FileInfo.check(ent.parts[k]))) {
        throw `Not file info: ${ent.parts[k]}`;
        return false;
      }
    } else if (t == "entity_definition") {
      if (!(await EntityDefinition.check(ent.parts[k]))) {
        throw `Not entity definition: ${ent.parts[k]}`;
        return false;
      }
    } else if (t == "thing") {
      if (!check_cid(ent.parts[k])) {
        throw `Not cid: ${ent.parts[k]}`;
        return false;
      }

      let info = JSON.parse(await IPFS.cat(ent.parts[k]));
      let entity_definition = await EntityDefinition.load(info.entity_type);
      if (!entity_definition || entity_definition.kind != "thing") {
        throw `Not thing: ${ent.parts[k]}`;
        return false;
      }
    } else if (t == "action") {
      if (!check_cid(ent.parts[k])) {
        throw `Not cid: ${ent.parts[k]}`;
        return false;
      }

      let info = JSON.parse(await IPFS.cat(ent.parts[k]));
      let entity_definition = await EntityDefinition.load(info.entity_type);
      if (!entity_definition || entity_definition.kind != "action") {
        throw `Not action: ${ent.parts[k]}`;
        return false;
      }
    } else {
      return false;
    }
  }

  return true;

};



//////////////// Search Spine Trees ////////////////

function SearchSpineTree(cid, first, rest) {
  this.cid = cid;
  this.first = first;
  this.rest = rest;
}
SearchSpineTree.make = async function (first, rest) {
  let cid = await IPFS.add({ first, rest });
  return new SearchSpineTree(cid, first, rest);
};
SearchSpineTree.load = async function (cid) {
  let data = JSON.parse(await IPFS.cat(cid));
  return new SearchSpineTree(cid, data.first, rest.rest);
};

// these don't live on IPFs independently!
function SearchSpineStack(items) {
  this.items = items; // array of { depth, first_key, last_key, item }
}
SearchSpineStack.prototype.push = async function (first_key, last_key, first) {
  let rest = [];
  let depth = 0;
  let new_items = [...this.items];

  while (new_items.length > 0 && new_items[0].depth == depth) {
    rest.push(new_items.shift());
    depth++;
  }

  new_items.unshift({
    depth,
    first_key,
    last_key: rest.length == 0 ? last_key : rest[rest.length-1].last_key,
    item: (await SearchSpineTree.make(first, rest)).cid
  });

  return new SearchSpineStack(new_items);
}



//////////////// Feeds ////////////////

function Feed(cid, protocol_version, optimal_recent, next_sequence_number, recent, older) {
  this.cid = cid;
  this.protocol_version = protocol_version;
  this.optimal_recent = optimal_recent;
  this.next_sequence_number = next_sequence_number;
  // holds up to 2*this.optimal_recent-1. at 2*this.optimal_recent, it moves the oldest this.optimal_recent to a new feed segment
  this.recent = recent;
  this.older = older;
}
Feed.cache = {};
Feed.load = async function (cid) {
  if (!(cid in Feed.cache)) {
    let obj = JSON.parse(await IPFS.cat(cid));
    Feed.cache[cid] = new Feed(
      cid,
      obj.protocol_version,
      obj.optimal_recent,
      obj.next_sequence_number,
      obj.recent,
      obj.older
    );
  }

  return Feed.cache[cid];
};
Feed.make = async function (protocol_version, optimal_recent, next_sequence_number, recent, older) {
  let cid = await IPFS.add({
    protocol_version, optimal_recent, next_sequence_number, recent, older
  });
  return new Feed(cid, protocol_version, optimal_recent, next_sequence_number, recent, older);
};
Feed.make_empty = async function (protocol_version, optimal_recent) {
  return await Feed.make(protocol_version, optimal_recent, 0, [], new SearchSpineStack([]));
};
Feed.prototype.add = async function (item) {
  let new_recent = [
    { sequence_number: this.next_sequence_number, item },
    ...this.recent
  ];

  let new_stack_item = [];
  if (new_recent.length >= 2*this.optimal_recent) {
    while (new_recent.length > this.optimal_recent) {
      new_stack_item.unshift(new_recent.pop());
    }
  }

  let new_older;
  if (new_stack_item.length == 0) {
    // older stack is fine as is
    new_older = this.older;
  } else {
    // have to add stuff to the older stack
    new_older = await this.older.push(
      new_stack_item[0].sequence_number,
      new_stack_item[new_stack_item.length-1].sequence_number,
      new_stack_item
    );
  }

  return await Feed.make(
    this.protocol_version,
    this.optimal_recent,
    this.next_sequence_number+1,
    new_recent,
    new_older
  );
}


//////////////// Index ////////////////

function Index(protocol_version, index_tree) {
  this.cid = null;
  this.protocol_version = protocol_version;
  this.index_tree = index_tree;
}
Index.cache = {};
Index.load = async function (cid) {
  if (!(cid in Index.cache)) {
    let obj = JSON.parse(await IPFS.cat(cid));
    let f = new Index(
      obj.protocol_version
    );
    f.cid = cid;
    Index.cache[cid] = f;
  }

  return Index.cache[cid];
}



//////////////// Users ////////////////

function UserManager() {
  this.feeds = null;
  this.indexes = null;
  this.file_to_upload = null;
}
UserManager.prototype.load = async function () {
  let cid = await IPFS.resolve();
  if (cid == "" || cid == "/ipfs/bafkqaaa") {
    console.log("Initializing user data to empty.");
    this.feeds = {};
    this.indexes = {};
    this.store();
  } else {
    console.log(`Loading pre-existing user data: ${cid}`);

    let user_data = JSON.parse(await IPFS.cat(cid));

    // load feeds
    this.feeds = {};
    for (let [entity_type, cid] of Object.entries(user_data.feeds)) {
      this.feeds[entity_type] = await Feed.load(cid);
    }

    this.indexes = {};
    for (let [entity_type, cid] of Object.entries(user_data.indexes)) {
      this.indexes[entity_type] = await Index.load(cid);
    }
  }
}
UserManager.prototype.store = async function () {
  let stored_feeds = {};

  for (let [entity_type, entity_feed] of Object.entries(this.feeds)) {
    await entity_feed.store();
    stored_feeds[entity_type] = entity_feed.cid;
  }

  let feeds_cid = await IPFS.add(stored_feeds);

  let user_data_cid = await IPFS.add({
    "feeds": feeds_cid,
    "indexes": indexes_cid
  });
  IPFS.publish(user_data_cid);
};
UserManager.prototype.ensure_feed_exists = function (feed_type) {
  if (!(feed_type in this.feeds)) {
    this.feeds[feed_type] = new Feed();
  }
}
UserManager.prototype.publish_entity = async function (ent) {
  this.ensure_feed_exists(ent.entity_type);
  let ed = await EntityDefinition.load(ent.entity_type);
  if (!(await ed.check_entity(ent))) {
    return false;
  }

  let ent_cid = await IPFS.add({
    "protocol_version": ent.protocol_version,
    "entity_type": ent.entity_type,
    "datetime": ent.datetime,
    "parts": ent.parts
  });
  ent.cid = ent_cid;
  await this.feeds[ent.entity_type].add(ent_cid);
  this.store();

  return true;
};



//////////////// Entities ////////////////

function Entity(cid, protocol_version, entity_type, datetime, parts) {
  this.cid = cid;
  this.protocol_version = protocol_version;
  this.entity_type = entity_type;
  this.datetime = datetime;
  this.parts = parts;
}
Entity.from_json = function (cid, data) {
  return new Entity(
    cid,
    data.protocol_version,
    data.entity_type,
    data.datetime,
    data.parts
  );
};
Entity.cache = {};
Entity.load = async function (cid) {
  if (!(cid in Entity.cache)) {
    Entity.cache[cid] = Entity.from_json(cid, JSON.parse(await IPFS.cat(cid)));
  }

  return Entity.cache[cid];
};



//////////////// UI Components ////////////////

let timeline = document.getElementById("timeline");
let my_stuff = document.getElementById("my_stuff");
let entity_view = document.getElementById("entity_view");



//////////////// Functionality ////////////////

async function show_timeline() {
  timeline.style.display = "block";
  my_stuff.style.display = "none";
  entity_view.style.display = "none";
}
async function show_my_stuff() {
  timeline.style.display = "none";
  my_stuff.style.display = "block";
  entity_view.style.display = "none";

  let children = [];
  for (let [entity_type, feed] of Object.entries(user_manager.feeds)) {
    let h2 = document.createElement("h2");
    h2.innerText = entity_type;
    children.push(h2);

    let p = document.createElement("p");
    p.innerText = JSON.stringify(await EntityDefinition.load(entity_type));
    children.push(p);

    for (let entity_cid of feed.recent) {
      let entity = await Entity.load(entity_cid);
      let a = document.createElement("a");
      a.innerText = entity_cid;
      a.onclick = async function () {
        await show_entity(entity);
      };

      let h3 = document.createElement("h3");
      h3.replaceChildren(a);
      children.push(h3);

      let p = document.createElement("p");
      p.innerText = JSON.stringify(entity);
      children.push(p);
    }
  }

  my_stuff.replaceChildren(...children);
}
async function show_entity(entity) {
  timeline.style.display = "none";
  my_stuff.style.display = "none";
  entity_view.style.display = "block";

  let h2 = document.createElement("h2");
  h2.innerText = "Entity";

  let p = document.createElement("p");
  p.innerText = JSON.stringify(entity);
  entity_view.replaceChildren(h2, p);
}


//////////////// App ////////////////

Neutralino.init();
Neutralino.events.on("windowClose", () => {
  Neutralino.app.exit();
});

// set up test entity defs
if (false) {
  (async function () {
    // EntityDefinition(cid, protocol_version, kind, name, parts)
    let user_profile_def = new EntityDefinition(
      null,
      "v0",
      "thing",
      "User Profile",
      {
        "name": "string",
        "bio": "string"
      }
    );

    await user_profile_def.store();
    console.log("User Profile Definition:", user_profile_def.cid);

    let short_post_def = new EntityDefinition(
      null,
      "v0",
      "thing",
      "Short Post",
      {
        "content": "string"
      }
    );

    await short_post_def.store();
    console.log("Short Post Definition:", short_post_def.cid);

    let comment_def = new EntityDefinition(
      null,
      "v0",
      "action",
      "Comment",
      {
        "comment": "thing",
        "commented_on": "thing"
      }
    );

    await comment_def.store();
    console.log("Comment Definition:", comment_def.cid);
  })();
}

// main code
let user_manager = null;
if (true) {
  (async function () {
    // user_manager = new UserManager();
    // await user_manager.load();

    // user profile QmPWRJsprtbkn4CkcNK1DWQo1E4LCPbpqooTDn6HPEBCxX
    // short post QmZ3fb1vc7YpeQrVH1qxTuoLA2jJve9vFYRGPTqHErjKZZ
    // comment QmSj2fk4Bu56H4bBGCpaYnREq891c3Uf3MHcxWieq9gHmV

    // let user_profile = new Entity(
    //   null,
    //   null,
    //   "v0",
    //   "QmPWRJsprtbkn4CkcNK1DWQo1E4LCPbpqooTDn6HPEBCxX",
    //   "2022-10-31T03:33:33Z",
    //   {
    //     "name": "kate libby",
    //     "bio": "hacker aka burn"
    //   }
    // );
    // let res = await user_manager.publish_entity(user_profile);
    // console.log("Successfully published user profile.", user_profile.cid);

    let f = await Feed.make_empty("v0", 20);
    for (let i = 0; i < 100; i++) {
      f = await f.add("item_" + i.toString());
    }
    console.json_log(f);
  })();
}
