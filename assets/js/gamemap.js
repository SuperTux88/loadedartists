const map = document.getElementById('map');
map.width = document.body.clientWidth;
map.height = document.body.clientHeight;

let imagesLoaded = 0;
let totalImages = 2 + games.length;

const mapImg = loadImage('/img/gamemap/map.png');
const gregorImg = loadImage('/img/gamemap/gregor.png');

games.forEach(function (game) {
  game.landmarkImg = loadImage(game.landmark);
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
  this.width = image.width;
  this.height = image.height;
}

Gregor.SPEED = 256; // pixels per second

Gregor.prototype.move = function (delta, dirx, diry) {
  // move hero
  this.x += dirx * Gregor.SPEED * delta;
  this.y += diry * Gregor.SPEED * delta;

  // clamp values
  const maxX = this.map.width;
  const maxY = this.map.height;

  this.x = Math.max(0, Math.min(this.x, maxX));
  this.y = Math.max(0, Math.min(this.y, maxY));
};

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

  this.gregor = new Gregor(gregorImg, mapImg, 224, 689);
  this.camera = new Camera(mapImg, this.canvas.width, this.canvas.height);
  this.camera.follow(this.gregor);
};

Game.update = function (delta) {
  let dirx = 0;
  let diry = 0;
  if (Keyboard.isDown(Keyboard.LEFT)) {
    dirx += -1;
  }
  if (Keyboard.isDown(Keyboard.RIGHT)) {
    dirx += 1;
  }
  if (Keyboard.isDown(Keyboard.UP)) {
    diry += -1;
  }
  if (Keyboard.isDown(Keyboard.DOWN)) {
    diry += 1;
  }

  this.gregor.move(delta, dirx, diry);
  this.camera.update();
};

Game.render = function () {
  this.ctx.drawImage(mapImg, -this.camera.x, -this.camera.y);
  this._renderLandmarks();

  this.ctx.drawImage(
    this.gregor.image,
    this.gregor.screenX - this.gregor.width / 2,
    this.gregor.screenY - this.gregor.height / 2);
};

Game._renderLandmarks = function () {
  games.forEach((game) => {
    const img = game.landmarkImg;
    this.ctx.drawImage(
      img,
      game.pos.x - img.width / 2 - this.camera.x,
      game.pos.y - img.height - 60 - this.camera.y);
  });
}

Game.resize = function () {
  this.canvas.width = document.body.clientWidth;
  this.canvas.height = document.body.clientHeight;
  this.camera.resize(this.canvas.width, this.canvas.height);
}

Game._openGame = function () {
  if (state.modal) { return; }

  const x = this.gregor.x, y = this.gregor.y;
  const game = games.find((game) => {
    return game.pos.x - 100 < x && x < game.pos.x + 100 &&
      game.pos.y - 200 < y && y < game.pos.y + 60;
  })
  if (game) {
    addModal(game);
  }
}

function startGame() {
  window.addEventListener('resize', () => Game.resize(), false);
  Game.run(map);
}

function loadImage(path) {
  const img = new Image();
  img.src = path;
  img.onload = onImageLoad
  return img;
}

function onImageLoad() {
  imagesLoaded++;
  if (imagesLoaded === totalImages) {
    startGame();
  }
}

//
// Lightbox
//

const body = document.querySelector('body');
const modalTemplate = document.getElementById('modal-template').content.firstElementChild;

function addModal(game) {
  const backdrop = document.importNode(modalTemplate, true);
  const lightbox = backdrop.querySelector('.lightbox');

  const title = document.createElement('h1');
  title.textContent = game.title;
  lightbox.prepend(title);

  backdrop.querySelector('img').src = game.image;
  backdrop.querySelector('a.img-link').href = game.image;

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
    if (event.key === 'Escape') {
      closeLightbox(event);
    }
  }
  const closeLightbox = event => {
    if (event.ctrlKey || event.metaKey) { return; }
    body.removeChild(backdrop);
    state.modal = false;
    document.removeEventListener('keydown', lightboxKeyboardListener);
  }

  document.addEventListener('keydown', lightboxKeyboardListener);
  backdrop.addEventListener('click', closeLightbox);
  state.modal = true;
  body.append(backdrop);
}
