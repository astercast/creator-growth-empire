/* rule-source.js: the amber watch on rule checkers.
 * The line itself is printed by the build (source page + the date a
 * person last checked it). This script reads the heartbeat's
 * data/v1/source-checks.json; when the watched page's words have
 * changed since that hand check, the line turns amber and says so.
 * No change on record, no amber. A failed read changes nothing. */
(function () {
  "use strict";
  var hosts = document.querySelectorAll("[data-rule-source]");
  if (!hosts.length) return;
  fetch("data/v1/source-checks.json")
    .then(function (r) { if (!r.ok) throw new Error("bad"); return r.json(); })
    .then(function (doc) {
      var byId = {};
      (doc.sources || []).forEach(function (s) { byId[s.id] = s; });
      hosts.forEach(function (host) {
        var rec = byId[host.getAttribute("data-rule-source")];
        if (!rec) return;
        var live = host.querySelector(".rule-source-live");
        if (rec.changed) {
          host.classList.add("is-changed");
          if (live) {
            live.innerHTML = '<span class="rule-source-warn">The source page changed on ' +
              String(rec.changed_at || "").slice(0, 10) +
              ". Check it before you trust the numbers on this page.</span>";
          }
        } else if (live && rec.checked_at) {
          live.textContent = "The watch last read it on " + String(rec.checked_at).slice(0, 10) + ". No change found.";
        }
      });
    })
    .catch(function () { /* the printed line stands on its own */ });
})();
