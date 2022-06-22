const body = document.querySelector('body');
const canvas = document.getElementById('map');

let debug = false;

let imagesLoaded = 0;
let totalImages = 2 + games.length;

const mapImg = loadImage('/img/gamemap/map.png');
const gregorImg = loadImage(gregorPaths.png, gregorPaths.webp);

games.forEach(function (game) {
  game.gameImg = loadGameImageSrcSet(game.image.img, game.image.srcset, game.image.webpSrcset);
});

let state = {
  modal: false
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
    this._callbacks[key]();
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

function Camera(map, width, height) {
  this.x = 0;
  this.y = 0;
  this.map = map;
  this.resize(width, height);
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
  this.x = this.following.x - this.width / 2;
  this.y = this.following.y - this.height / 2;
  // clamp values
  this.x = Math.max(0, Math.min(this.x, this.maxX));
  this.y = Math.max(0, Math.min(this.y, this.maxY));

  // in map corners, the sprite cannot be placed in the center of the screen
  // and we have to change its screen coordinates

  // left and right sides
  if (this.following.x < this.width / 2 ||
    this.following.x > this.maxX + this.width / 2) {
    this.following.screenX = this.following.x - this.x;
  }
  // top and bottom sides
  if (this.following.y < this.height / 2 ||
    this.following.y > this.maxY + this.height / 2) {
    this.following.screenY = this.following.y - this.y;
  }
};

Camera.prototype.resize = function (width, height) {
  this.width = width;
  this.height = height;
  this.maxX = this.map.width - width;
  this.maxY = this.map.height - height;
}

//
// Gregor object
//

function Gregor(image, map, x, y) {
  this.image = image;
  this.map = map;
  this.x = x;
  this.y = y;
  this.width = image.width / 2;
  this.height = image.height / 2;
  this.flipped = false;
}

Gregor.SPEED = 256; // pixels per second

Gregor.prototype.move = function (delta, dirX, dirY) {
  // move hero
  this.x += dirX * delta;
  this.y += dirY * delta;
  if (dirX < 0 && !this.flipped) this.flipped = true;
  if (dirX > 0 && this.flipped) this.flipped = false;

  // clamp values
  const maxX = this.map.width - this.width / 2 - 10; // extra offset for shadow
  const maxY = this.map.height - this.height / 2;
  this.x = Math.max(this.width / 2, Math.min(this.x, maxX));
  this.y = Math.max(this.height / 2, Math.min(this.y, maxY));
};

Gregor.prototype.render = function (ctx) {
  ctx.save();

  ctx.shadowOffsetX = 12;
  ctx.shadowOffsetY = 8;
  ctx.shadowBlur = 1;
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";

  ctx.translate(this.screenX, this.screenY);
  ctx.scale(this.flipped ? -1 : 1, 1);

  ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);

  ctx.restore();
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
  Keyboard.addCallback(Keyboard.OPEN, () => Game._openGame());
  Touch.listenForEvents();
  document.addEventListener('click', (event) => Game._openGame());

  this.gregor = new Gregor(gregorImg, mapImg, 200, 665);
  this.camera = new Camera(mapImg, this.canvas.width, this.canvas.height);
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
  this.ctx.drawImage(mapImg, -this.camera.x, -this.camera.y);
  this._renderLandmarks();

  this.gregor.render(this.ctx);
};

Game._renderLandmarks = function () {
  if (debug) {
    this.ctx.strokeStyle = '#00ff00';
    games.forEach((game) => {
      this.ctx.strokeRect(game.pos.x - this.camera.x,game.pos.y - this.camera.y, game.pos.w, game.pos.h);
    });
  }
}

Game.resize = function () {
  this.canvas.width = Math.min(mapImg.width, document.body.clientWidth);
  this.canvas.height = Math.min(mapImg.height, document.body.clientHeight);
  this.camera.resize(this.canvas.width, this.canvas.height);
}

Game._openGame = function () {
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

function startGame() {
  if (body.classList.contains('running')) { return; }

  window.addEventListener('resize', () => Game.resize(), false);
  body.querySelector('.loading-screen').classList.add('hide');
  body.classList.add('running');
  canvas.classList.remove('hidden');
  Game.run(canvas);
}

function loadImage(path, webpPath) {
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
        start();
      }
    }
    const start = () => {
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
    body.removeChild(backdrop);
    state.modal = false;
    document.removeEventListener('keydown', lightboxKeyboardListener);
  }

  document.addEventListener('keydown', lightboxKeyboardListener);
  backdrop.addEventListener('click', closeLightbox);
  state.modal = true;
  body.append(backdrop);
}
