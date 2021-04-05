'use strict'

// Show fixed nav on scroll
let stickyHeaderObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    document.getElementById('menu-nav').classList.toggle('fixed', !entry.isIntersecting);
  })
}, {});
stickyHeaderObserver.observe(document.querySelector('.main-header'));

// Keyboard Navigation
document.addEventListener('keydown', event => {
  switch (event.code) {
    case 'ArrowLeft':
      let prevLink = document.querySelector('[data-kb-nav-prev]')
      if (prevLink) window.location = prevLink.href;
      break;
    case 'ArrowRight':
      let nextLink = document.querySelector('[data-kb-nav-next]')
      if (nextLink) window.location = nextLink.href;
      break;
    case 'Slash':
      let randLink = document.querySelector('[data-kb-nav-random]')
      if (randLink) window.location = randLink.href;
      break;
  }
});

// Play clips
document.querySelectorAll('.embed-placeholder').forEach(embed => {
  embed.addEventListener('click', event => {
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
