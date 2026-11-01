// Print some HTML through a hidden iframe: no extra window is left open,
// the iframe is removed once the print dialog closes (printed or cancelled)
export function printHtml(title: string, bodyHtml: string, style = "") {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);

  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  if (!win || !doc) {
    frame.remove();
    return;
  }

  doc.open();
  doc.write(`<!doctype html><html><head><title>${title}</title><style>${style}</style></head><body>${bodyHtml}</body></html>`);
  doc.close();

  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    setTimeout(() => frame.remove(), 100);
  };
  win.onafterprint = remove;

  // the page title is what the browser prints in the header, so show the document no for a moment
  const pageTitle = document.title;
  document.title = title;
  win.focus();
  win.print();
  document.title = pageTitle;
  // fallback for browsers that do not fire afterprint (print() blocks until the dialog closes)
  remove();
}
