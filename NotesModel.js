// Parses `find <root> -mindepth 1 -not -path "*/.*" \( -type d -o -name
// "*.md" \) -printf "%y\t%P\t%T@\n"` output into { type: "d"|"f", path, mtime }.
function parseEntries(raw) {
  var lines = String(raw || "").split("\n")
  var out = []
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i]
    if (!line) continue
    var t1 = line.indexOf("\t")
    if (t1 === -1) continue
    var type = line.slice(0, t1)
    var rest = line.slice(t1 + 1)
    var t2 = rest.indexOf("\t")
    var relPath = t2 === -1 ? rest : rest.slice(0, t2)
    var mtime = t2 === -1 ? 0 : (parseFloat(rest.slice(t2 + 1)) || 0)
    out.push({ type: type, path: relPath, mtime: mtime })
  }
  return out
}

// Builds a folder tree from relative paths so browsing can drill down one
// directory at a time, same shape as weblauncher's bookmark tree. Any
// directory under the notes root becomes a browsable category automatically
// (including ones the user creates later) — no hardcoded category list.
function buildTree(entries) {
  var root = { children: {}, files: [] }

  function ensureDir(segments) {
    var node = root
    for (var i = 0; i < segments.length; i++) {
      var seg = segments[i]
      if (!node.children[seg]) node.children[seg] = { children: {}, files: [] }
      node = node.children[seg]
    }
    return node
  }

  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    var segments = e.path.split("/")
    if (e.type === "d") {
      ensureDir(segments)
    } else {
      var parent = ensureDir(segments.slice(0, -1))
      var filename = segments[segments.length - 1]
      parent.files.push({
        name: filename.replace(/\.md$/, ""),
        mtime: e.mtime,
        path: e.path
      })
    }
  }
  return root
}

function nodeAtPath(root, pathSegments) {
  var node = root
  for (var i = 0; i < pathSegments.length; i++) {
    if (!node || !node.children[pathSegments[i]]) return null
    node = node.children[pathSegments[i]]
  }
  return node
}

function folderNames(node) {
  if (!node) return []
  return Object.keys(node.children).sort(function(a, b) {
    return a.localeCompare(b, undefined, { sensitivity: "base" })
  })
}

function relativeTime(epochSeconds) {
  var diff = Math.floor(Date.now() / 1000) - epochSeconds
  if (diff < 60) return "just now"
  if (diff < 3600) return Math.floor(diff / 60) + "m ago"
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago"
  if (diff < 2592000) return Math.floor(diff / 86400) + "d ago"
  if (diff < 31536000) return Math.floor(diff / 2592000) + "mo ago"
  return Math.floor(diff / 31536000) + "y ago"
}

// Folders (alphabetical) first, then this level's own files (most recently
// modified first) — each normalized to { type: "folder"|"file", name, ... }.
function childrenOf(node) {
  if (!node) return []
  var folders = folderNames(node).map(function(name) {
    return { type: "folder", name: name, subtitle: "" }
  })
  var files = node.files.slice().sort(function(a, b) { return b.mtime - a.mtime }).map(function(f) {
    return { type: "file", name: f.name, subtitle: relativeTime(f.mtime), path: f.path }
  })
  return folders.concat(files)
}

// Flat, recursive file listing used once the user starts typing — search
// ignores the current drill-down depth and matches across every category.
function flattenFiles(node, prefix) {
  var out = []
  var names = folderNames(node)
  for (var i = 0; i < names.length; i++) {
    out = out.concat(flattenFiles(node.children[names[i]], prefix.concat([names[i]])))
  }
  var files = node.files.slice().sort(function(a, b) {
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  })
  for (var j = 0; j < files.length; j++) {
    var f = files[j]
    var category = prefix.join("/")
    out.push({
      type: "file",
      name: f.name,
      subtitle: (category ? category + " · " : "") + relativeTime(f.mtime),
      path: f.path
    })
  }
  return out
}

function filterFiles(allFiles, filterText, limit) {
  var q = String(filterText || "").toLowerCase().trim()
  var out = []
  for (var i = 0; i < allFiles.length; i++) {
    var f = allFiles[i]
    if (!q || f.name.toLowerCase().indexOf(q) !== -1 || f.subtitle.toLowerCase().indexOf(q) !== -1) {
      out.push(f)
      if (out.length >= limit) break
    }
  }
  return out
}

// Used for both new file and new folder names. Strips path separators and a
// trailing .md so a typed name can't escape the target directory and doesn't
// end up with a doubled extension, and turns spaces into underscores
// ("test file" -> "test_file") since bare spaces in filenames are a pain on
// the command line.
function sanitizeName(name) {
  var cleaned = String(name || "").trim()
    .replace(/[\/\\]/g, "")
    .replace(/\.md$/i, "")
    .replace(/\s+/g, "_")
  if (cleaned === "." || cleaned === "..") return ""
  return cleaned
}
