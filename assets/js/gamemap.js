const mapContainer = document.getElementById('gamemap');
const canvas = document.getElementById('map');

let imagesLoaded = 0;
let totalImages = 0;

const mapImgs = Object.fromEntries(Object.entries(mapPaths).map(([k, img]) => [k, loadImage(img.png, img.webp)]));
const gregorImgs = Object.fromEntries(Object.entries(gregorPaths).map(([k, img]) => [k, loadImage(img.png, img.webp)]));

games.forEach(function (game) {
  game.gameImg = loadGameImageSrcSet(game.image.img, game.image.srcset, game.image.webpSrcset);
});

let state = {
  modal: false,
  debug: false,
  mode: 1
};

//
// Keyboard handler
//

const Keyboard = {};

Keyboard.LEFT = ['ArrowLeft', 'a'];
Keyboard.RIGHT = ['ArrowRight', 'd'];
Keyboard.UP = ['ArrowUp', 'w'];
Keyboard.DOWN = ['ArrowDown', 's'];

Keyboard.OPEN = [' ', 'Enter'];
Keyboard.DEBUG = ['`'];
Keyboard.MODE = ['1', '2', '3'];

Keyboard._keys = {};
Keyboard._callbacks = {};

Keyboard.listenForEvents = function (keys) {
  window.addEventListener('keydown', this._onKeyDown.bind(this));
  window.addEventListener('keyup', this._onKeyUp.bind(this));

  keys.flat().forEach(function (key) {
    this._keys[key] = false;
  }.bind(this));
}

Keyboard.addCallback = function (keys, callback) {
  keys.forEach(function (key) {
    this._callbacks[key] = callback;
  }.bind(this));
}

Keyboard._onKeyDown = function (event) {
  const key = event.key;
  if (key in this._keys) {
    event.preventDefault();
    this._keys[key] = true;
  }
  if (key in this._callbacks) {
    this._callbacks[key](event);
  }
};

Keyboard._onKeyUp = function (event) {
  const key = event.key;
  if (key in this._keys) {
    event.preventDefault();
    this._keys[key] = false;
  }
};

Keyboard.isDown = function (keys) {
  keys.forEach((key) => {
    if (!key in this._keys) {
      throw new Error('Key "' + key + '" is not being listened to');
    }
  });
  return keys.some((key) => this._keys[key]);
};

//
// Touch handler
//

const Touch = {};

Touch._touching = false;
Touch._initial = {x: 0, y: 0};
Touch._current = {x: 0, y: 0};

Touch.listenForEvents = function () {
  window.addEventListener('touchstart', this._onTouchStart.bind(this));
  window.addEventListener('touchmove', this._onTouchMove.bind(this));
  window.addEventListener('touchend', this._onTouchEnd.bind(this));
};

Touch._onTouchStart = function (event) {
  this._touching = true;
  this._initial = {x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY};
  this._current = this._initial;
};

Touch._onTouchMove = function (event) {
  this._current = {x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY};
};

Touch._onTouchEnd = function (event) {
  this._touching = false;
};

Touch.isTouching = function () {
  return this._touching;
};

Touch.getX = function () {
  const diffX = this._current.x - this._initial.x;
  return Math.abs(diffX) > 20 ? diffX * 2 : 0;
};

Touch.getY = function () {
  const diffY = this._current.y - this._initial.y;
  return Math.abs(diffY) > 20 ? diffY * 2 : 0;
};

//
// Camera object
//

function Camera() {
  this.x = 0;
  this.y = 0;
}

Camera.prototype.follow = function (sprite) {
  this.following = sprite;
  sprite.screenX = 0;
  sprite.screenY = 0;
};

Camera.prototype.update = function () {
  // assume followed sprite should be placed at the center of the screen
  // whenever possible
  this.following.screenX = this.width / 2;
  this.following.screenY = this.height / 2;

  // make the camera follow the sprite
  this.scaledPos = {x: Game.scale(this.following.x), y: Game.scale(this.following.y)};
  this.x = this.scaledPos.x - this.width / 2;
  this.y = this.scaledPos.y - this.height / 2;
  // clamp values
  this.x = Math.max(0, Math.min(this.x, this.maxX));
  this.y = Math.max(0, Math.min(this.y, this.maxY));

  // in map corners, the sprite cannot be placed in the center of the screen
  // and we have to change its screen coordinates

  // left and right sides
  if (this.scaledPos.x < this.width / 2 ||
    this.scaledPos.x > this.maxX + this.width / 2) {
    this.following.screenX = this.scaledPos.x - this.x;
  }
  // top and bottom sides
  if (this.scaledPos.y < this.height / 2 ||
    this.scaledPos.y > this.maxY + this.height / 2) {
    this.following.screenY = this.scaledPos.y - this.y;
  }
};

Camera.prototype.resize = function (canvas, width, height) {
  this.width = canvas.width;
  this.height = canvas.height;
  this.maxX = width - this.width;
  this.maxY = height - this.height;
}

//
// Gregor object
//

function Gregor(images, overlay, x, y) {
  this.images = {
    land: {img: images.land, offset: {x: 183, y: 239}},
    water: {img: images.water, offset: {x: 245, y: 250}},
  };
  this.max = {x: 300, top: 240, bottom: 175};
  this.overlay = overlay;
  this.x = x;
  this.y = y;

  this.flipped = false;
  this.currentImg = this.images.land;
}

Gregor.SPEED = 360; // pixels per second

Gregor.prototype.move = function (delta, dirX, dirY) {
  let x = this.x + dirX * delta;
  let y = this.y + dirY * delta;

  if (dirX < 0 && !this.flipped) this.flipped = true;
  if (dirX > 0 && this.flipped) this.flipped = false;

  // clamp values
  x = Math.max(this.max.x, Math.min(x, this.overlay.width - this.max.x));
  y = Math.max(this.max.top, Math.min(y, this.overlay.height - this.max.bottom));

  const newLocation = this.overlay.getMapDataAtLocation(x, y);
  if (newLocation === Overlay.WATER) {
    this.currentImg = this.images.water;
  } else if (newLocation === Overlay.LAND) {
    this.currentImg = this.images.land;
  } else if (newLocation === Overlay.BLOCKED) {
    if (state.mode !== 3) {
      return; // Don't move
    }
  }

  this.x = x;
  this.y = y;
};

Gregor.prototype.render = function (ctx) {
  ctx.save();

  ctx.shadowOffsetX = Game.scale(12);
  ctx.shadowOffsetY = Game.scale(8);
  ctx.shadowBlur = 1;
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";

  ctx.translate(this.screenX, this.screenY);
  ctx.scale(this.flipped ? -1 : 1, 1);

  ctx.drawImage(this.currentImg.img, Game.scale(-this.currentImg.offset.x), Game.scale(-this.currentImg.offset.y),
    Game.scale(this.currentImg.img.width), Game.scale(this.currentImg.img.height));

  if (state.debug) {
    ctx.fillStyle = '#ff0000';
    ctx.shadowColor = 'transparent';
    ctx.fillRect(0, 0, Game.scale(4), Game.scale(4));
  }

  ctx.restore();
}

//
// Overlay object
//

function Overlay(overlayImg) {
  this.width = overlayImg.width;
  this.height = overlayImg.height;

  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = this.width;
  overlayCanvas.height = this.height;
  this.overlay = overlayCanvas.getContext('2d');
  this.overlay.drawImage(overlayImg, 0, 0);
}

Overlay.LAND = 'LAND';
Overlay.WATER = 'WATER';
Overlay.BLOCKED = 'BLOCKED';

Overlay.prototype.getMapDataAtLocation = function (x, y) {
  const [r, g, b, a] = this.overlay.getImageData(x, y, 1, 1).data;
  if (a <= 50) {
    return Overlay.LAND;
  } else if (b >= 200) {
    return Overlay.WATER;
  } else if (r >= 200) {
    return Overlay.BLOCKED;
  } else {
    console.log('unknown overlay color', x, y, r, g, b, a);
  }
}

//
// Game object
//

const Game = {};

Game.run = function (canvas) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this._previousElapsed = 0;

  this.init();
  window.requestAnimationFrame(this.tick);
};

Game.tick = function (elapsed) {
  window.requestAnimationFrame(this.tick);
  if (state.modal) { return; }

  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

  // compute delta time in seconds -- also cap it
  let delta = (elapsed - this._previousElapsed) / 1000.0;
  delta = Math.min(delta, 0.25); // maximum delta of 250 ms
  this._previousElapsed = elapsed;

  this.update(delta);
  this.render();
}.bind(Game);

Game.init = function () {
  Keyboard.listenForEvents([Keyboard.LEFT, Keyboard.RIGHT, Keyboard.UP, Keyboard.DOWN]);
  Keyboard.addCallback(Keyboard.OPEN, () => Game._openImg());
  Keyboard.addCallback(Keyboard.DEBUG, (event) => Game._toggleDebug(event));
  Keyboard.addCallback(Keyboard.MODE, (event) => Game._switchMode(event));
  Touch.listenForEvents();
  document.addEventListener('click', () => Game._openImg());

  this.overlay = new Overlay(mapImgs.overlay);
  this.width = this.overlay.width;
  this.height = this.overlay.height;

  this.gregor = new Gregor(gregorImgs, this.overlay, 400, 2050);
  this.camera = new Camera();
  this.camera.resize(this.canvas, this.width, this.height);
  this.camera.follow(this.gregor);

  this.resize();
};

Game.update = function (delta) {
  let dirX = 0;
  let dirY = 0;
  if (Keyboard.isDown(Keyboard.LEFT)) {
    dirX -= Gregor.SPEED;
  }
  if (Keyboard.isDown(Keyboard.RIGHT)) {
    dirX += Gregor.SPEED;
  }
  if (Keyboard.isDown(Keyboard.UP)) {
    dirY -= Gregor.SPEED;
  }
  if (Keyboard.isDown(Keyboard.DOWN)) {
    dirY += Gregor.SPEED;
  }
  if (Touch.isTouching()) {
    dirX += Touch.getX();
    dirY += Touch.getY();
  }

  dirX = Math.min(Gregor.SPEED, Math.max(-Gregor.SPEED, dirX));
  dirY = Math.min(Gregor.SPEED, Math.max(-Gregor.SPEED, dirY));

  this.gregor.move(delta, dirX, dirY);
  this.camera.update();
};

Game.render = function () {
  this.ctx.drawImage(state.mode === 1 ? mapImgs.map : mapImgs.line, -this.camera.x, -this.camera.y, Game.scale(this.width), Game.scale(this.height));
  if (state.debug) {
    this.ctx.globalAlpha = 0.2;
    this.ctx.drawImage(mapImgs.overlay, -this.camera.x, -this.camera.y, Game.scale(this.width), Game.scale(this.height));
    this.ctx.globalAlpha = 1;
    this._renderLandmarks();
  }

  this.gregor.render(this.ctx);
};

Game._renderLandmarks = function () {
  this.ctx.strokeStyle = '#00ff00';
  games.forEach((game) => {
    this.ctx.strokeRect(Game.scale(game.pos.x) - this.camera.x, Game.scale(game.pos.y) - this.camera.y,
      Game.scale(game.pos.w), Game.scale(game.pos.h));
  });
}

Game.resize = function () {
  this.currentScale = 0.8;
  this.canvas.width = Math.min(Game.scale(this.width), document.body.clientWidth);
  this.canvas.height = Math.min(Game.scale(this.height), document.body.clientHeight);
  this.camera.resize(this.canvas, Game.scale(this.width), Game.scale(this.height));
}

Game.scale = function (number) {
  return this.currentScale * number;
}

Game._openImg = function () {
  if (state.modal) { return; }

  const x = this.gregor.x, y = this.gregor.y;
  const game = games.find((game) => {
    return game.pos.x < x && x < game.pos.x + game.pos.w &&
      game.pos.y < y && y < game.pos.y + game.pos.h;
  })
  if (game) {
    addModal(game);
  }
}

Game._toggleDebug = function (event) {
  if (event.ctrlKey || event.altKey) {
    event.preventDefault();
    state.debug = !state.debug;
  }
}

Game._switchMode = function (event) {
  if (event.ctrlKey || event.altKey) {
    event.preventDefault();
    state.mode = parseInt(event.key);
  }
}

function startGame() {
  if (mapContainer.classList.contains('running')) { return; }

  window.addEventListener('resize', () => Game.resize(), false);

  const loadingScreen = mapContainer.querySelector('.loading-screen');
  loadingScreen.classList.add('hide');
  window.setTimeout(() => { mapContainer.removeChild(loadingScreen) }, 1000);

  mapContainer.classList.add('running');
  canvas.classList.remove('hidden');
  Game.run(canvas);
}

function loadImage(path, webpPath) {
  totalImages++;

  const picture = document.createElement('picture')

  if (webpPath !== undefined) {
    const webpSource = document.createElement('source');
    webpSource.type = 'image/webp';
    webpSource.srcset = webpPath;
    picture.append(webpSource);
  }

  const img = new Image();
  img.src = path;
  img.onload = onImageLoad
  picture.append(img)
  return img;
}

function loadGameImageSrcSet(path, srcset, webpSrcset) {
  totalImages++;

  const picture = document.createElement('picture')

  if (webpSrcset !== undefined) {
    const webpSource = document.createElement('source');
    webpSource.type = 'image/webp';
    webpSource.srcset = webpSrcset;
    webpSource.sizes = '90vw';
    picture.append(webpSource);
  }

  const img = new Image();
  img.srcset = srcset;
  img.sizes = '90vw';
  img.src = path;
  img.onload = onImageLoad

  picture.append(img)
  return picture;
}

function onImageLoad() {
  imagesLoaded++;
  if (imagesLoaded === totalImages) {
    const loading = document.querySelector('.loading-screen');
    loading.querySelector('h1').textContent = "Click seal to open!";
    loading.querySelector('.lds-ring').classList.add('hide');
    loading.querySelector('.start-game').classList.remove('hidden');

    const startKeyboardListener = event => {
      if ([' ', 'Enter'].includes(event.key)) {
        start(event);
      }
    }
    const start = (event) => {
      event.preventDefault();
      event.stopPropagation();

      document.removeEventListener('keydown', startKeyboardListener);

      startGame();
    }

    document.querySelector('.start-game').addEventListener('click', start);
    document.addEventListener('keydown', startKeyboardListener);
  }
}

//
// Lightbox
//
const modalTemplate = document.getElementById('modal-template').content.firstElementChild;

function addModal(game) {
  const backdrop = document.importNode(modalTemplate, true);
  const lightbox = backdrop.querySelector('.lightbox');

  lightbox.prepend(game.gameImg)

  const title = document.createElement('h1');
  title.textContent = game.title;
  lightbox.prepend(title);

  backdrop.querySelector('a.img-link').href = game.image.img;

  let author;
  if (game.authorLink) {
    author = document.createElement('a');
    author.setAttribute("href", game.authorLink);
    author.setAttribute("target", "_blank");
    author.setAttribute("rel", "noopener");
  } else {
    author = document.createElement('span');
  }
  author.textContent = `By ${game.author}`;
  lightbox.querySelector('.lightbox-footer').appendChild(author);

  const lightboxKeyboardListener = event => {
    if ([' ', 'Enter', 'Escape'].includes(event.key)) {
      closeLightbox(event);
    }
  }
  const closeLightbox = event => {
    if (event.ctrlKey || event.metaKey) { return; }
    event.stopPropagation();
    mapContainer.removeChild(backdrop);
    state.modal = false;
    document.removeEventListener('keydown', lightboxKeyboardListener);
  }

  document.addEventListener('keydown', lightboxKeyboardListener);
  backdrop.addEventListener('click', closeLightbox);
  state.modal = true;
  mapContainer.append(backdrop);
}
