// Play clips
document.querySelectorAll('.embed-placeholder').forEach(embed => {
  embed.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey) { return; }
    event.preventDefault();
    let embedUrl = embed.dataset.embedUrl;
    let iframe = document.createElement("iframe");
    iframe.setAttribute("src", embedUrl);
    iframe.setAttribute("frameBorder", "0");
    iframe.setAttribute("scrolling", "no");
    iframe.setAttribute("allowFullScreen", "true");
    embed.replaceWith(iframe)
  });
});
