/* API Explorer: browse api/v1 endpoints and preview JSON responses, client-side only.
   Fetches relative to the site root (the deployed site ships its own api/ mirror). */
(function () {
  "use strict";
  var BASE = "api/v1/";
  var list = document.getElementById("explorer-list");
  var out = document.getElementById("explorer-code");
  var meta = document.getElementById("explorer-meta");
  var errBox = document.getElementById("explorer-error");
  if (!list || !out) return;

  /* Static fallback catalogue if index.json itself can't be reached. */
  var FALLBACK = [
    { name: "index.json", desc: "Site manifest: version, endpoint list." },
    { name: "chapters.json", desc: "All 9 phases: id, title, words, read time, path." },
    { name: "glossary.json", desc: "Creator-economy terms + definitions." },
    { name: "calculators.json", desc: "RPM bands, thresholds, splits, 2026 rate card." },
    { name: "skills.json", desc: "Skill index: name, description, path (10 skills)." }
  ];

  function showError(msg) {
    errBox.hidden = false;
    errBox.textContent = msg;
  }
  function clearError() { errBox.hidden = true; errBox.textContent = ""; }

  function topKeys(obj) {
    if (Array.isArray(obj)) return "array[" + obj.length + "]";
    if (obj && typeof obj === "object") return Object.keys(obj).slice(0, 8).join(", ") + (Object.keys(obj).length > 8 ? ", …" : "");
    return typeof obj;
  }

  function load(name) {
    clearError();
    meta.textContent = "Loading " + BASE + name + " …";
    out.textContent = "// fetching …";
    fetch(BASE + name, { headers: { "Accept": "application/json" } })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function (text) {
        var data;
        try { data = JSON.parse(text); }
        catch (e) { throw new Error("Response was not valid JSON."); }
        var bytes = new Blob([text]).size;
        meta.textContent = "GET " + BASE + name + " — " +
          (bytes / 1024).toFixed(1) + " KB · top-level: " + topKeys(data);
        out.textContent = JSON.stringify(data, null, 2);
      })
      .catch(function (e) {
        meta.textContent = "Could not load " + BASE + name + ".";
        out.textContent = "// Nothing loaded yet.";
        showError("Fetch failed (" + (e && e.message ? e.message : "unknown error") +
          "). The endpoint list below was loaded from a static fallback — " +
          "check that api/v1/ is deployed alongside this page and try again.");
      });
  }

  function render(items) {
    list.innerHTML = "";
    items.forEach(function (it) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-ghost";
      btn.style.margin = "0 .5rem .5rem 0";
      btn.textContent = "GET " + it.name;
      btn.setAttribute("aria-label", "Preview " + BASE + it.name + " — " + (it.desc || ""));
      btn.addEventListener("click", function () { load(it.name); });
      li.appendChild(btn);
      var span = document.createElement("span");
      span.className = "muted";
      span.textContent = " " + (it.desc || "");
      li.appendChild(span);
      list.appendChild(li);
    });
  }

  /* Discover endpoints from the API index itself; fall back to the static list. */
  fetch(BASE + "index.json", { headers: { "Accept": "application/json" } })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (idx) {
      var ep = (idx && idx.endpoints) || {};
      var items = [];
      ["index", "chapters", "glossary", "calculators", "skills"].forEach(function (k) {
        if (ep[k]) items.push({ name: ep[k].replace(/^api\/v1\//, ""), desc: k + " endpoint." });
      });
      items.push({ name: "schema/chapter.json", desc: "JSON Schema for chapter entries." });
      items.push({ name: "schema/glossary.json", desc: "JSON Schema for glossary entries." });
      items.push({ name: "schema/case-file.json", desc: "JSON Schema for case-file entries." });
      items.push({ name: "schema/calculators.json", desc: "JSON Schema for the calculators data contract." });
      if (!items.length) throw new Error("empty index");
      render(items);
    })
    .catch(function () {
      render(FALLBACK);
      showError("Could not reach " + BASE + "index.json — showing the static endpoint list. " +
        "Previews below will retry the fetch when you pick one.");
    });
})();
