/* corrections.js, the correction drafter on what-changed.html
 * (rotation 22, T-CREATOR-5). The manual has no inbox, so a filed
 * correction is a finished note the reader copies and sends. This
 * script only composes the note in the page; nothing is transmitted. */
(function () {
  'use strict';
  var form = document.querySelector('[data-corr-form]');
  if (!form) return;
  var outWrap = form.querySelector('[data-corr-out-wrap]');
  var out = form.querySelector('[data-corr-out]');
  var actions = form.querySelector('[data-corr-actions]');
  var status = form.querySelector('[data-corr-status]');
  var copyBtn = form.querySelector('[data-corr-copy]');
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var page = (form.elements.page.value || '').trim();
    var says = (form.elements.says.value || '').trim();
    var should = (form.elements.should.value || '').trim();
    if (!page || !says || !should) return;
    var today = new Date().toISOString().slice(0, 10);
    out.value = [
      'Correction for Creator Growth Empire',
      'Date: ' + today,
      'Page: ' + page,
      'The page says: ' + says,
      'It should say: ' + should
    ].join('\n');
    outWrap.hidden = false;
    actions.hidden = false;
    if (status) status.textContent = 'Draft ready. Copy it and send it to the editor.';
  });
  if (copyBtn) copyBtn.addEventListener('click', function () {
    if (!out.value) return;
    function done() { if (status) status.textContent = 'Copied. Send it wherever you reach the editor.'; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(out.value).then(done, function () { out.select(); });
    } else { out.select(); }
  });
})();
