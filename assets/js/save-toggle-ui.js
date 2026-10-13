/* Save toggle — page wiring for every tool page except the shelf
 * itself. The generator puts one [data-save-tool] button in each
 * tool page's briefing panel; this script reflects the saved
 * state from the Saved Shelf engine's localStorage key and
 * toggles it. No state leaves the browser. */
(function () {
  "use strict";
  var SS = window.SavedShelf;
  if (!SS) return;
  var btns = Array.prototype.slice.call(document.querySelectorAll("[data-save-tool]"));
  if (!btns.length) return;

  function load() {
    try {
      var v = window.localStorage.getItem(SS.STORAGE_KEY);
      var parsed = v ? JSON.parse(v) : [];
      return SS.normalizeSaved(parsed);
    } catch (e) { return []; }
  }
  function save(list) {
    try { window.localStorage.setItem(SS.STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* storage blocked — the toggle still reflects for this page view */ }
  }
  function render() {
    var list = load();
    btns.forEach(function (b) {
      var on = list.indexOf(b.getAttribute("data-save-tool")) >= 0;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.textContent = on ? "Saved to your shelf ✓ — tap to remove" : "Save to your shelf";
    });
  }
  btns.forEach(function (b) {
    b.addEventListener("click", function () {
      save(SS.toggleSaved(load(), b.getAttribute("data-save-tool")));
      render();
    });
  });
  render();
})();
