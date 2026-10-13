/* Saved Shelf — page wiring. The catalogue is the committed
 * data/v1/tools.json (the hub's own tool records); the saved set
 * is this browser's localStorage (key cge.saved-tools.v1), the
 * same key the save toggle on every tool page writes. Removing a
 * tool here writes the same key back. Nothing is sent anywhere. */
(function () {
  "use strict";
  var SS = window.SavedShelf;
  var shelfEl = document.getElementById("svs-shelf");
  if (!SS || !shelfEl) return;
  var exportBox = document.getElementById("svs-export");
  var statusEl = document.getElementById("svs-status");
  var DATA = { catalog: null };

  function load() {
    try {
      var v = window.localStorage.getItem(SS.STORAGE_KEY);
      var parsed = v ? JSON.parse(v) : [];
      return SS.normalizeSaved(parsed);
    } catch (e) { return []; }
  }
  function save(list) {
    try { window.localStorage.setItem(SS.STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* storage blocked — shelf still renders in memory */ }
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function render() {
    if (!DATA.catalog) {
      statusEl.textContent = "Loading the catalogue…";
      return;
    }
    var s = SS.shelfFromToolsJson(DATA.catalog, load());
    if (!s.ok) { shelfEl.innerHTML = "<p class=\"muted\">" + esc(s.errors.join("; ")) + "</p>"; return; }
    statusEl.textContent = s.emptyShelf
      ? "Nothing saved yet — save any tool from its own page and it waits for you here."
      : s.staleOnly
        ? "Every save is stale — the catalogue no longer lists those tools."
        : s.savedCount + " tool(s) on your shelf of " + s.catalogCount + " in the catalogue" +
          (s.staleCount ? " · " + s.staleCount + " stale save(s) counted apart" : "");
    if (!s.entries.length) {
      shelfEl.innerHTML = "<div class=\"svs-empty\"><p><strong>" +
        (s.emptyShelf ? "No saves, no shelf." : "Stale saves only — no shelf to show.") + "</strong> " +
        (s.emptyShelf
          ? "This page holds the tools you save from their own pages — open any tool in the <a href=\"tools.html\">hub</a>, tap “Save to your shelf” in its briefing panel, and it is listed here in the order you saved it. Nothing has been saved in this browser yet."
          : "The slugs saved in this browser no longer match any tool in the catalogue (a tool was renamed or retired after it was saved). They are counted above and in the export, and never rendered as tools. Save a current tool from its page and the shelf rebuilds around it.") +
        "</p></div>";
    } else {
      shelfEl.innerHTML = "<ol class=\"svs-list\">" + s.entries.map(function (e, i) {
        return "<li class=\"svs-item\">" +
          "<p class=\"svs-head\"><strong>" + (i + 1) + ". <a href=\"" + esc(e.page) + "\">" + esc(e.title) + "</a></strong> " +
          "<button type=\"button\" class=\"btn\" data-unsave=\"" + esc(e.id) + "\">Remove</button></p>" +
          "<p class=\"muted\">" + esc(e.description) + "</p>" +
          "</li>";
      }).join("") + "</ol>";
      Array.prototype.forEach.call(shelfEl.querySelectorAll("[data-unsave]"), function (b) {
        b.addEventListener("click", function () {
          save(SS.toggleSaved(load(), b.getAttribute("data-unsave")));
          render();
        });
      });
    }
    exportBox.value = SS.exportShelf(s);
  }

  var hubBtn = document.getElementById("svs-hub");
  if (hubBtn) hubBtn.addEventListener("click", function () { render(); });
  var copyBtn = document.getElementById("svs-copy");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    exportBox.select();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(exportBox.value);
    else document.execCommand("copy");
    copyBtn.textContent = "Copied ✓";
    setTimeout(function () { copyBtn.textContent = "Copy the shelf"; }, 2000);
  });

  render();
  fetch("data/v1/tools.json").then(function (r) { return r.json(); }).then(function (doc) {
    DATA.catalog = doc; render();
  }).catch(function () {
    statusEl.textContent = "The catalogue could not be loaded — the shelf cannot be built without it.";
  });
})();
