/* Saved Shelf — engine (UMD, importable in node for tests).
 *
 * Tool 32 — gap closure T-CREATOR-4 (the saved-tools shelf, the
 * favourites pattern): a creator who works this manual daily
 * uses a handful of its tools over and over, and until now the
 * only way back to them was the full 31-tool hub every time.
 * This tool is the shelf: any tool can be saved from its own
 * page, and this page holds the saved set — in the order it was
 * saved — with a way back to each tool and a way to remove it.
 *
 * The catalogue is committed data: data/v1/tools.json, the
 * hub's own tool records, generated from build.py's TOOLS_API.
 * The saved set is the visitor's own: it lives only in this
 * browser's localStorage (key cge.saved-tools.v1), is never
 * sent anywhere, and no account exists to sync it with. The
 * engine's only work is set arithmetic on those two lists —
 * normalize, toggle, join — no ranking, no scoring, no counts
 * of anyone else's saves.
 *
 * The "most-saved" half of the favourites pattern is honestly
 * absent: a most-saved ranking needs usage collected across
 * visitors, this site collects none, and the shelf says so
 * instead of inventing a popularity order. A saved slug the
 * catalogue no longer lists (a tool renamed or retired since
 * it was saved) is counted apart as stale — named, never
 * silently dropped and never rendered as a tool.
 *
 * States stay distinct: nothing saved yet (emptyShelf) and
 * saves that are all stale (staleOnly) are different states,
 * and this engine says which one it is.
 *
 * A planning aid — not financial, legal, or tax advice. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.SavedShelf = api;
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  var ADVICE = "Planning aid, not financial, legal, or tax advice.";
  var STORAGE_KEY = "cge.saved-tools.v1";

  /* The saved set as a clean list: strings only, no duplicates,
   * first-save order kept. Anything else in storage (an older
   * shape, a hand-edited value) normalizes to what it honestly
   * is — never guessed at. Pure: no mutation. */
  function normalizeSaved(raw) {
    if (!Array.isArray(raw)) return [];
    var out = [], seen = {};
    raw.forEach(function (v) {
      if (typeof v !== "string" || !v || seen[v]) return;
      seen[v] = true; out.push(v);
    });
    return out;
  }

  function isSaved(saved, id) { return normalizeSaved(saved).indexOf(id) >= 0; }

  /* Save appends (the shelf keeps save order); unsave removes.
   * Returns a new list — the caller's array is never mutated. */
  function toggleSaved(saved, id) {
    var list = normalizeSaved(saved);
    if (!id) return list;
    var i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.push(id);
    return list;
  }

  /* Join the saved set against the catalogue (data/v1/tools.json
   * records: id, title, description, page). Entries come back in
   * save order; saved slugs with no catalogue record are counted
   * apart as stale. */
  function buildShelf(catalog, saved) {
    if (!Array.isArray(catalog)) return { ok: false, errors: ["the tool catalogue is required (data/v1/tools.json)"] };
    var byId = {};
    catalog.forEach(function (t) { if (t && t.id) byId[t.id] = t; });
    var ids = normalizeSaved(saved);
    var entries = [], staleIds = [];
    ids.forEach(function (id) {
      var t = byId[id];
      if (t) entries.push({ id: t.id, title: t.title, description: t.description, page: t.page });
      else staleIds.push(id);
    });
    return {
      ok: true, entries: entries,
      savedCount: entries.length,
      staleCount: staleIds.length, staleIds: staleIds,
      catalogCount: catalog.length,
      emptyShelf: ids.length === 0,
      staleOnly: ids.length > 0 && entries.length === 0,
      advice: ADVICE
    };
  }

  function shelfFromToolsJson(doc, saved) {
    if (!doc || !Array.isArray(doc.tools)) return { ok: false, errors: ["tools.json with a tools array is required"] };
    return buildShelf(doc.tools, saved);
  }

  function exportShelf(shelf) {
    if (!shelf || !shelf.ok) return "";
    var out = [];
    out.push("SAVED TOOLS SHELF — " + shelf.savedCount + " tool(s) saved of " +
      shelf.catalogCount + " in the catalogue");
    if (shelf.emptyShelf) {
      out.push("Nothing is saved yet — this shelf is empty because no tool has been saved from its page, not because the catalogue is empty.");
    } else if (shelf.staleOnly) {
      out.push("Every saved slug is stale — the catalogue no longer lists any of them, so the shelf renders no tools.");
    }
    shelf.entries.forEach(function (e, i) {
      out.push("");
      out.push((i + 1) + ". " + e.title + " — " + e.page);
      out.push("   " + e.description);
    });
    if (shelf.staleCount) {
      out.push("");
      out.push("Plus " + shelf.staleCount + " stale save(s) (" + shelf.staleIds.join(", ") +
        ") — slugs the catalogue no longer lists, counted apart and never rendered as tools.");
    }
    out.push("");
    out.push(shelf.advice + " The shelf is stored only in this browser (localStorage " + STORAGE_KEY + ") and is never sent anywhere. There is no most-saved ranking: that signal needs usage collected across visitors, and this site collects none — the shelf is your own set, in the order you saved it.");
    return out.join("\n");
  }

  return {
    normalizeSaved: normalizeSaved, isSaved: isSaved, toggleSaved: toggleSaved,
    buildShelf: buildShelf, shelfFromToolsJson: shelfFromToolsJson,
    exportShelf: exportShelf, STORAGE_KEY: STORAGE_KEY, ADVICE: ADVICE
  };
});
