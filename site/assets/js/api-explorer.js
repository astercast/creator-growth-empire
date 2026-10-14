/* API Explorer: browse api/v1 endpoints and preview JSON responses, client-side only.
   Fetches relative to the site root (the deployed site ships its own api/ mirror). */
(function () {
  "use strict";
  var BASE = "data/v1/";
  var list = document.getElementById("explorer-list");
  var out = document.getElementById("explorer-code");
  var meta = document.getElementById("explorer-meta");
  var pre = document.getElementById("explorer-out");
  var empty = document.getElementById("explorer-empty");
  var errBox = document.getElementById("explorer-error");
  if (!list || !out) return;

  /* Static fallback catalogue if index.json itself can't be reached.
     Kept in sync with data/v1/index.json by hand, update both together. */
  var FALLBACK = [
    { name: "index.json", desc: "Self-describing manifest: every endpoint, schema URL, timestamp, record counts." },
    { name: "chapters.json", desc: "All 9 phases: id, title, words, read time, path." },
    { name: "glossary.json", desc: "Creator-economy terms + definitions." },
    { name: "calculators.json", desc: "RPM bands, thresholds, splits, 2026 rate card." },
    { name: "skills.json", desc: "Skill index: name, description, path (12 skills)." },
    { name: "case-files.json", desc: "Case-file index: id, title, path, words, read time." },
    { name: "tools.json", desc: "Every tool's programmatic input schema." },
    { name: "schema/index.json", desc: "JSON Schema for the manifest." },
    { name: "schema/chapters.json", desc: "JSON Schema for the chapters doc." },
    { name: "schema/chapter.json", desc: "JSON Schema for chapter entries." },
    { name: "schema/glossary.json", desc: "JSON Schema for glossary entries." },
    { name: "schema/calculators.json", desc: "JSON Schema for the calculators data contract." },
    { name: "schema/skills.json", desc: "JSON Schema for the skills doc." },
    { name: "schema/skill.json", desc: "JSON Schema for skill entries." },
    { name: "schema/case-files.json", desc: "JSON Schema for the case-files doc." },
    { name: "schema/case-file.json", desc: "JSON Schema for case-file entries." },
    { name: "schema/tools.json", desc: "JSON Schema for the tools doc." },
    { name: "schema/tool.json", desc: "JSON Schema for tool entries." }
  ];

  /* Design-treated failure state: callout-style error panel + restore
     the empty state behind it. */
  function showError(msg) {
    errBox.hidden = false;
    errBox.className = "error-state";
    errBox.innerHTML = "";
    var strong = document.createElement("strong");
    strong.textContent = "FETCH FAILED";
    var p = document.createElement("p");
    p.textContent = msg;
    errBox.appendChild(strong);
    errBox.appendChild(p);
    if (empty) empty.hidden = false;
    if (meta) meta.hidden = true;
    if (pre) pre.hidden = true;
  }
  function clearError() { errBox.hidden = true; errBox.textContent = ""; }

  /* Toggle between the empty state and the live preview. */
  function setPreview(on) {
    if (empty) empty.hidden = on;
    if (meta) meta.hidden = !on;
    if (pre) pre.hidden = !on;
  }

  function topKeys(obj) {
    if (Array.isArray(obj)) return "array[" + obj.length + "]";
    if (obj && typeof obj === "object") return Object.keys(obj).slice(0, 8).join(", ") + (Object.keys(obj).length > 8 ? ", …" : "");
    return typeof obj;
  }

  function load(name) {
    clearError();
    setPreview(true);
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
        meta.textContent = "GET " + BASE + name + ", " +
          (bytes / 1024).toFixed(1) + " KB · top-level: " + topKeys(data);
        out.textContent = JSON.stringify(data, null, 2);
      })
      .catch(function (e) {
        showError("Could not load " + BASE + name + ", fetch failed (" +
          (e && e.message ? e.message : "unknown error") + "). " +
          "Check that data/v1/ is deployed alongside this page and try again.");
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
      btn.setAttribute("aria-label", "Preview " + BASE + it.name + ", " + (it.desc || ""));
      btn.addEventListener("click", function () { load(it.name); });
      li.appendChild(btn);
      var span = document.createElement("span");
      span.className = "muted";
      span.textContent = " " + (it.desc || "");
      li.appendChild(span);
      list.appendChild(li);
    });
  }

  /* Discover endpoints from the API index itself; fall back to the static list.
     Wave 12: the manifest is a list of endpoint records. JSON endpoints are
     listed directly, schema files come from the "schemas" record's files[]. */
  fetch(BASE + "index.json", { headers: { "Accept": "application/json" } })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (idx) {
      var eps = (idx && idx.endpoints) || [];
      var items = [];
      var schemaItems = [];
      eps.forEach(function (ep) {
        if (ep.kind === "json" && ep.path) {
          items.push({
            name: ep.path.replace(/^api\/v1\//, ""),
            desc: (ep.records != null ? ep.records + " records, " : "") +
                  (ep.description || (ep.id + " endpoint."))
          });
        } else if (ep.id === "schemas" && ep.files) {
          ep.files.forEach(function (f) {
            var parts = String(f).split(", ");
            schemaItems.push({
              name: "schema/" + parts[0],
              desc: parts.slice(1).join(", ") || ("JSON Schema: " + parts[0])
            });
          });
        }
      });
      items = items.concat(schemaItems);
      if (!items.length) throw new Error("empty index");
      if (idx && idx.version && meta) {
        meta.textContent = "Manifest v" + idx.version + " · updated " + (idx.updated || "unknown") +
          " · " + items.length + " browsable endpoints/schemas";
        setPreview(true);
      }
      render(items);
    })
    .catch(function () {
      render(FALLBACK);
      showError("Could not reach " + BASE + "index.json, showing the static endpoint list. " +
        "Previews below will retry the fetch when you pick one.");
    });
})();
