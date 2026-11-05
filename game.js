const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;
const WORLD_WIDTH = 2800;

const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#8ed5c0",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 1000 }, debug: false }
  },
  scene: { create, update }
};

new Phaser.Game(config);

let player;
let keys;
let score = 0;
let scoreText;
let messageText;
let messageTimer;
let lives = 3;
let livesText;
let invulnerableUntil = 0;
let levelComplete = false;

function create() {
  createTextures(this);
  createAnimations(this);
  createJungleBackground(this);
  score = 0;
  lives = 3;
  invulnerableUntil = 0;
  levelComplete = false;

  const platforms = this.physics.add.staticGroup();

  const ground = platforms.create(WORLD_WIDTH / 2, 526, "ground");
  ground.setScale(WORLD_WIDTH / 64, 1);
  ground.refreshBody();

  [
    [340, 430], [570, 365], [820, 420], [1080, 355],
    [1340, 410], [1590, 350], [1850, 415], [2110, 355],
    [2370, 410], [2600, 350]
  ].forEach(([x, y]) => {
    platforms.create(x, y, "platform").refreshBody();
  });

  player = this.physics.add.sprite(100, 440, "hero-walk-sheet", 0);
  player.setCollideWorldBounds(true);
  player.setDepth(10);
  player.setBounce(0);
  player.body.setSize(34, 50);
  player.body.setOffset(15, 22);
  this.physics.add.collider(player, platforms);

  // Moving platforms add a timing challenge between the fixed platforms.
  const movingPlatforms = this.physics.add.group({ allowGravity: false, immovable: true });
  [[455, 300, 70], [1460, 285, 65], [2260, 300, 75]].forEach(([x, y, travel]) => {
    const moving = movingPlatforms.create(x, y, "platform");
    moving.setImmovable(true);
    moving.body.allowGravity = false;
    moving.setDepth(8);
    this.tweens.add({
      targets: moving,
      y: y - travel,
      duration: 1900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  });
  this.physics.add.collider(player, movingPlatforms);

  // Beetles patrol the forest floor. Touching one costs a life.
  const beetles = this.physics.add.group({ allowGravity: true });
  [[940, 490], [1510, 490], [2020, 490]].forEach(([x, y], index) => {
    const beetle = beetles.create(x, y, "beetle");
    beetle.setDepth(9);
    beetle.setCollideWorldBounds(true);
    beetle.setBounceX(1);
    beetle.setVelocityX(index % 2 === 0 ? 75 : -75);
    beetle.body.setSize(34, 22);
  });
  this.physics.add.collider(beetles, platforms);
  this.physics.add.collider(beetles, movingPlatforms);
  this.physics.add.overlap(player, beetles, () => damagePlayer(this));

  // Snakes guard parts of the trail. Touching one costs a life.
  const snakes = this.physics.add.staticGroup();
  [[690, 478], [1190, 478], [1740, 478], [2240, 478]].forEach(([x, y]) => {
    const snake = snakes.create(x, y, "snake");
    snake.setScale(1.25);
    snake.setDepth(22);
    snake.refreshBody();
    this.tweens.add({ targets: snake, angle: { from: -4, to: 4 }, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  });
  this.physics.add.overlap(player, snakes, () => damagePlayer(this));

  const gems = this.physics.add.staticGroup();
  [
    [340, 385], [570, 320], [820, 375], [1080, 310],
    [1340, 365], [1590, 305], [1850, 370], [2110, 310],
    [2370, 365], [2600, 305]
  ].forEach(([x, y]) => gems.create(x, y, "gem"));

  this.physics.add.overlap(player, gems, (hero, gem) => {
    gem.destroy();
    score += 10;
    scoreText.setText("GEMS: " + score);
    showMessage(this, "Gem collected! +10");
  });

  keys = this.input.keyboard.addKeys({
    left: Phaser.Input.Keyboard.KeyCodes.LEFT,
    right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    up: Phaser.Input.Keyboard.KeyCodes.UP,
    space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    a: Phaser.Input.Keyboard.KeyCodes.A,
    d: Phaser.Input.Keyboard.KeyCodes.D,
    w: Phaser.Input.Keyboard.KeyCodes.W,
    restart: Phaser.Input.Keyboard.KeyCodes.R
  });

  this.cameras.main.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
  this.cameras.main.startFollow(player, true, 0.09, 0.08);

  scoreText = this.add.text(20, 18, "GEMS: 0", {
    fontFamily: "Arial",
    fontSize: "20px",
    fontStyle: "bold",
    color: "#ffffff",
    backgroundColor: "#17452e",
    padding: { x: 12, y: 8 }
  }).setScrollFactor(0).setDepth(30);

  livesText = this.add.text(190, 18, "LIVES: 3", {
    fontFamily: "Arial", fontSize: "20px", fontStyle: "bold", color: "#ffffff",
    backgroundColor: "#8a332b", padding: { x: 12, y: 8 }
  }).setScrollFactor(0).setDepth(30);

  this.add.text(20, 64, "JUNGLE TRAIL  |  REACH THE END", {
    fontFamily: "Arial",
    fontSize: "13px",
    color: "#173d2b",
    backgroundColor: "#e6f1c9",
    padding: { x: 9, y: 6 }
  }).setScrollFactor(0).setDepth(30);

  messageText = this.add.text(GAME_WIDTH / 2, 24, "", {
    fontFamily: "Arial",
    fontSize: "16px",
    fontStyle: "bold",
    color: "#ffffff",
    backgroundColor: "#17452e",
    padding: { x: 10, y: 7 }
  }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(30);

  this.add.text(WORLD_WIDTH - 30, 465, "TRAIL END", {
    fontFamily: "Arial",
    fontSize: "16px",
    fontStyle: "bold",
    color: "#ffffff",
    backgroundColor: "#17452e",
    padding: { x: 10, y: 7 }
  }).setOrigin(1, 0.5).setDepth(5);

  this.physics.world.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
  player.anims.play("hero-idle");
}

function update() {
  if (levelComplete && Phaser.Input.Keyboard.JustDown(keys.restart)) {
    this.scene.restart();
    return;
  }
  if (levelComplete) return;

  const speed = 250;
  const onGround = player.body.blocked.down || player.body.touching.down;

  if (keys.left.isDown || keys.a.isDown) {
    player.setVelocityX(-speed);
    player.setFlipX(true);
  } else if (keys.right.isDown || keys.d.isDown) {
    player.setVelocityX(speed);
    player.setFlipX(false);
  } else {
    player.setVelocityX(0);
  }

  const jumpPressed =
    Phaser.Input.Keyboard.JustDown(keys.space) ||
    Phaser.Input.Keyboard.JustDown(keys.up) ||
    Phaser.Input.Keyboard.JustDown(keys.w);

  if (jumpPressed && onGround) player.setVelocityY(-480);

  if (!onGround || Math.abs(player.body.velocity.y) > 30) {
    player.anims.play("hero-jump", true);
  } else if (Math.abs(player.body.velocity.x) > 0) {
    player.anims.play("hero-walk", true);
  } else {
    player.anims.play("hero-idle", true);
  }

  if (player.y > GAME_HEIGHT + 100) {
    player.setPosition(100, 430);
    player.setVelocity(0, 0);
    showMessage(this, "Back to the trail!");
  }

  const atExit = player.x >= WORLD_WIDTH - 105;
  const landedAtExit = player.body.blocked.down || player.body.touching.down;
  if (atExit && landedAtExit) {
    levelComplete = true;
    player.setX(WORLD_WIDTH - 90);
    freezePlayer();
    showEndScreen(this, "TRAIL COMPLETE!", "You made it through the jungle!", "PLAY AGAIN");
  }
}

function createTextures(scene) {
  // Rounded cartoon explorer sprite sheet, with consistent proportions in every pose.
  const fw = 64, fh = 80;
  const g = scene.make.graphics({ x: 0, y: 0 });
  const swing = [-3, -1, 3, 1];

  for (let i = 0; i < 4; i++) {
    const x = i * fw, s = swing[i];
    // Soft shadow.
    g.fillStyle(0x153b25, 0.22); g.fillEllipse(x + 32, 75, 34, 7);
    // Backpack and rolled bedroll.
    g.fillStyle(0x573a25); g.fillRoundedRect(x + 9, 32, 17, 29, 6);
    g.fillStyle(0x9a6336); g.fillRoundedRect(x + 11, 34, 13, 23, 4);
    g.fillStyle(0xd5a45c); g.fillRoundedRect(x + 12, 43, 11, 8, 2);
    g.fillStyle(0xddd0a0); g.fillRoundedRect(x + 10, 27, 16, 7, 3);
    // Legs and hiking boots.
    g.fillStyle(0x344c3b); g.fillRoundedRect(x + 23 + s, 49, 10, 17, 4);
    g.fillStyle(0x405b43); g.fillRoundedRect(x + 34 - s, 49, 10, 17, 4);
    g.fillStyle(0x513725); g.fillRoundedRect(x + 19 + s, 64, 16, 8, 3);
    g.fillRoundedRect(x + 32 - s, 64, 16, 8, 3);
    g.fillStyle(0xc08a4c); g.fillRect(x + 22 + s, 66, 8, 2); g.fillRect(x + 35 - s, 66, 8, 2);
    // Shirt and belt.
    g.fillStyle(0x174b35); g.fillRoundedRect(x + 20, 28, 27, 27, 8);
    g.fillStyle(0x38865a); g.fillRoundedRect(x + 23, 30, 21, 20, 6);
    g.fillStyle(0xe0c27b); g.fillRect(x + 32, 32, 2, 15);
    g.fillStyle(0x6c492d); g.fillRoundedRect(x + 23, 51, 22, 5, 2);
    // Arms swing opposite the legs.
    g.fillStyle(0x246344); g.fillRoundedRect(x + 14, 31, 11, 16, 5); g.fillRoundedRect(x + 42, 31, 11, 16, 5);
    g.fillStyle(0xd99b70);
    g.lineStyle(7, 0xd99b70, 1);
    g.lineBetween(x + 19, 42, x + 17 + s, 55);
    g.lineBetween(x + 48, 42, x + 48 - s, 55);
    g.fillCircle(x + 17 + s, 56, 4); g.fillCircle(x + 48 - s, 56, 4);
    // Neck and expressive face.
    g.fillStyle(0xb87952); g.fillRoundedRect(x + 29, 23, 10, 10, 3);
    g.fillStyle(0xdda47d); g.fillEllipse(x + 34, 18, 24, 27);
    g.fillStyle(0x633c29); g.fillEllipse(x + 34, 8, 25, 15);
    g.fillStyle(0x633c29); g.fillEllipse(x + 23, 15, 7, 13);
    g.fillStyle(0x29231d); g.fillCircle(x + 40, 18, 1.8);
    g.fillStyle(0xffffff); g.fillCircle(x + 40.5, 17.5, 0.7);
    g.lineStyle(1.5, 0x8c4e3c, 1); g.lineBetween(x + 39, 25, x + 43, 25);
    // Soft safari hat.
    g.fillStyle(0x79552f); g.fillEllipse(x + 34, 11, 36, 9);
    g.fillStyle(0xc69b5b); g.fillEllipse(x + 34, 6, 24, 11);
    g.fillStyle(0xe5c783); g.fillRect(x + 23, 9, 22, 2);
    g.fillStyle(0x77502d); g.fillRect(x + 31, 4, 6, 3);
  }
  g.generateTexture("hero-walk-sheet", fw * 4, fh);
  const tex = scene.textures.get("hero-walk-sheet");
  for (let i = 1; i < 4; i++) tex.add(i, 0, i * fw, 0, fw, fh);
  g.destroy();

  const jump = scene.make.graphics({ x: 0, y: 0 });
  jump.fillStyle(0x573a25); jump.fillRoundedRect(8, 34, 17, 27, 6);
  jump.fillStyle(0x9a6336); jump.fillRoundedRect(11, 36, 13, 21, 4);
  jump.fillStyle(0x174b35); jump.fillRoundedRect(20, 28, 27, 27, 8);
  jump.fillStyle(0x38865a); jump.fillRoundedRect(23, 30, 21, 20, 6);
  jump.fillStyle(0x344c3b); jump.fillRoundedRect(22, 51, 11, 13, 4); jump.fillRoundedRect(35, 49, 11, 13, 4);
  jump.fillStyle(0x513725); jump.fillRoundedRect(10, 61, 17, 8, 3); jump.fillRoundedRect(40, 59, 15, 8, 3);
  jump.fillStyle(0xd99b70); jump.lineStyle(7, 0xd99b70, 1);
  jump.lineBetween(19, 42, 8, 29); jump.lineBetween(48, 41, 57, 27);
  jump.fillStyle(0xdda47d); jump.fillEllipse(34, 18, 24, 27);
  jump.fillStyle(0x633c29); jump.fillEllipse(34, 8, 25, 15);
  jump.fillStyle(0x29231d); jump.fillCircle(40, 18, 1.8);
  jump.fillStyle(0x79552f); jump.fillEllipse(34, 11, 36, 9);
  jump.fillStyle(0xc69b5b); jump.fillEllipse(34, 6, 24, 11);
  jump.generateTexture("hero-jump", 64, 80); jump.destroy();

  // Richer hand-painted-looking ground and wooden platforms.
  const ground = scene.make.graphics({ x: 0, y: 0 });
  ground.fillStyle(0x765039); ground.fillRect(0, 0, 64, 32);
  ground.fillStyle(0x347c3d); ground.fillRect(0, 0, 64, 10);
  ground.fillStyle(0x75b94d); ground.fillRect(0, 0, 64, 4);
  ground.lineStyle(2, 0x4a3527, 0.7);
  for (let x = 8; x < 64; x += 18) ground.lineBetween(x, 13, x - 4, 29);
  ground.generateTexture("ground", 64, 32); ground.destroy();

  const platform = scene.make.graphics({ x: 0, y: 0 });
  platform.fillStyle(0x4b3020); platform.fillRoundedRect(0, 6, 128, 26, 5);
  platform.fillStyle(0x9a693d); platform.fillRoundedRect(0, 1, 128, 14, 5);
  platform.fillStyle(0x5b9b43); platform.fillRoundedRect(0, 0, 128, 7, 4);
  platform.lineStyle(2, 0xd0a36a, 0.8);
  platform.lineBetween(8, 9, 120, 9);
  platform.fillStyle(0x563923); platform.fillCircle(12, 19, 2); platform.fillCircle(116, 19, 2);
  platform.generateTexture("platform", 128, 32); platform.destroy();

  const beetle = scene.make.graphics({ x: 0, y: 0 });
  beetle.fillStyle(0x172d20); beetle.fillEllipse(25, 24, 43, 18);
  beetle.fillStyle(0x2d773f); beetle.fillEllipse(24, 20, 37, 16);
  beetle.fillStyle(0x62b84f); beetle.fillEllipse(25, 15, 24, 13);
  beetle.lineStyle(2, 0x1c512f, 1); beetle.lineBetween(25, 9, 25, 22);
  beetle.fillStyle(0x4b3424); beetle.fillCircle(43, 18, 7);
  beetle.fillStyle(0xf2e477); beetle.fillCircle(45, 16, 2);
  beetle.lineStyle(3, 0x493323, 1);
  beetle.lineBetween(12, 24, 7, 30); beetle.lineBetween(23, 25, 21, 31);
  beetle.lineBetween(34, 24, 39, 30); beetle.lineBetween(43, 22, 49, 28);
  beetle.generateTexture("beetle", 56, 34); beetle.destroy();

  const snake = scene.make.graphics({ x: 0, y: 0 });
  snake.fillStyle(0x173b29, 0.25); snake.fillEllipse(48, 55, 88, 10);
  snake.lineStyle(17, 0x173d2c, 1); snake.beginPath();
  snake.moveTo(8, 43); snake.lineTo(22, 34); snake.lineTo(39, 39); snake.lineTo(54, 32); snake.lineTo(67, 35); snake.strokePath();
  snake.lineStyle(11, 0x398d4c, 1); snake.beginPath();
  snake.moveTo(8, 41); snake.lineTo(22, 34); snake.lineTo(39, 39); snake.lineTo(54, 32); snake.lineTo(67, 35); snake.strokePath();
  snake.lineStyle(4, 0xb6d66a, 1); snake.beginPath();
  snake.moveTo(12, 44); snake.lineTo(24, 39); snake.lineTo(39, 43); snake.lineTo(54, 37); snake.lineTo(66, 39); snake.strokePath();
  snake.lineStyle(14, 0x173d2c, 1); snake.lineBetween(63, 35, 73, 20);
  snake.lineStyle(9, 0x398d4c, 1); snake.lineBetween(63, 34, 73, 20);
  snake.fillStyle(0x173d2c); snake.fillEllipse(77, 17, 29, 20);
  snake.fillStyle(0x55a957); snake.fillEllipse(77, 15, 24, 15);
  snake.fillStyle(0xf4e477); snake.fillCircle(82, 12, 3.5);
  snake.fillStyle(0x172319); snake.fillCircle(83, 12, 1.7);
  snake.lineStyle(2, 0xd94c46, 1); snake.lineBetween(90, 21, 97, 24);
  snake.lineBetween(97, 24, 100, 22); snake.lineBetween(97, 24, 100, 27);
  snake.fillStyle(0xb7d86a); snake.fillCircle(24, 31, 2); snake.fillCircle(42, 35, 2); snake.fillCircle(57, 29, 2);
  snake.generateTexture("snake", 104, 64); snake.destroy();

  const gem = scene.make.graphics({ x: 0, y: 0 });
  gem.fillStyle(0xffdf59);
  gem.fillPoints([new Phaser.Geom.Point(12, 0), new Phaser.Geom.Point(24, 12), new Phaser.Geom.Point(12, 24), new Phaser.Geom.Point(0, 12)], true);
  gem.fillStyle(0xfff4b0); gem.fillTriangle(12, 3, 19, 12, 12, 12);
  gem.generateTexture("gem", 24, 24); gem.destroy();
}

function createAnimations(scene) {
  scene.anims.create({
    key: "hero-idle",
    frames: [{ key: "hero-walk-sheet", frame: 0 }],
    frameRate: 1,
    repeat: -1
  });

  scene.anims.create({
    key: "hero-walk",
    frames: scene.anims.generateFrameNumbers("hero-walk-sheet", { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1
  });

  scene.anims.create({
    key: "hero-jump",
    frames: [{ key: "hero-jump" }],
    frameRate: 1,
    repeat: -1
  });
}

function createJungleBackground(scene) {
  // Layered tropical sky with distant mountain silhouettes.
  scene.add.rectangle(WORLD_WIDTH / 2, 270, WORLD_WIDTH, 540, 0x9bdccf).setScrollFactor(0.08).setDepth(-30);
  scene.add.circle(760, 105, 48, 0xffe6a0, 0.9).setScrollFactor(0.12).setDepth(-28);
  for (let x = -150; x < WORLD_WIDTH + 400; x += 650) {
    scene.add.ellipse(x + 180, 380, 650, 210, 0x8acb9b).setScrollFactor(0.16).setDepth(-25);
    scene.add.ellipse(x + 470, 395, 590, 190, 0x69b484).setScrollFactor(0.2).setDepth(-24);
    // Distant palms and broadleaf silhouettes.
    scene.add.rectangle(x + 180, 310, 17, 210, 0x648c5a).setScrollFactor(0.28).setDepth(-20);
    scene.add.ellipse(x + 180, 210, 155, 75, 0x4c9a68).setScrollFactor(0.28).setDepth(-20);
  }

  // Midground tree trunks, layered canopies and hanging vines.
  for (let x = 0; x < WORLD_WIDTH + 260; x += 250) {
    const shift = (Math.floor(x / 250) % 3) * 24;
    scene.add.rectangle(x + 65, 342, 42, 390, 0x765039).setScrollFactor(0.58).setDepth(-8);
    scene.add.rectangle(x + 52, 340, 8, 350, 0x9a7048).setScrollFactor(0.58).setDepth(-7);
    scene.add.ellipse(x + 65, 205 + shift, 220, 155, 0x246b3d).setScrollFactor(0.58).setDepth(-6);
    scene.add.ellipse(x + 5, 245 + shift, 145, 120, 0x34864a).setScrollFactor(0.58).setDepth(-5);
    scene.add.ellipse(x + 122, 245 + shift, 155, 125, 0x3c9650).setScrollFactor(0.58).setDepth(-5);
    scene.add.ellipse(x + 63, 160 + shift, 130, 100, 0x55a957).setScrollFactor(0.58).setDepth(-5);
    // Highlights on the canopy.
    scene.add.ellipse(x + 25, 218 + shift, 54, 25, 0x78bd5c, 0.75).setScrollFactor(0.58).setDepth(-4).setAngle(-25);
    if (Math.floor(x / 250) % 2 === 0) {
      scene.add.rectangle(x + 148, 300, 5, 160, 0x347a43).setScrollFactor(0.58).setDepth(-3);
      for (let v = 0; v < 5; v++) scene.add.ellipse(x + 148 + (v % 2 ? 7 : -7), 345 + v * 19, 15, 8, v % 2 ? 0x79bf58 : 0x4e9e4d).setScrollFactor(0.58).setDepth(-2).setAngle(v % 2 ? 35 : -35);
    }
  }

  // Near-ground bushes and ferns decorate the scene edges without obscuring play.
  for (let x = 40; x < WORLD_WIDTH + 200; x += 300) {
    scene.add.ellipse(x, 488, 145, 45, 0x1e6338).setDepth(3);
    scene.add.ellipse(x + 42, 480, 105, 38, 0x328346).setDepth(3);
    scene.add.ellipse(x + 86, 491, 100, 35, 0x4b9b4b).setDepth(3);
    // Fern fronds.
    for (let f = 0; f < 4; f++) {
      const fx = x + 135 + f * 7;
      scene.add.line(fx, 503, 0, 0, (f - 1.5) * 13, -26 - (f % 2) * 8, 0x80bd55).setLineWidth(3).setDepth(4);
      scene.add.ellipse(fx + (f - 1.5) * 7, 481 - (f % 2) * 8, 17, 7, 0x8ac75d).setDepth(4).setAngle((f - 1.5) * 20);
    }
  }

  // Floating pollen motes add atmosphere.
  for (let i = 0; i < 28; i++) {
    const px = (i * 173) % WORLD_WIDTH;
    const py = 115 + (i * 47) % 285;
    const mote = scene.add.circle(px, py, 2 + (i % 2), 0xfff0a6, 0.65).setDepth(-1);
    scene.tweens.add({ targets: mote, y: py - 14, alpha: 0.2, duration: 1800 + (i % 5) * 300, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }
}

function freezePlayer() {
  if (!player || !player.body) return;
  player.setVelocity(0, 0);
  player.body.setAllowGravity(false);
  player.setImmovable(true);
  player.anims.stop();
  player.setTexture("hero-walk-sheet", 0);
  player.clearTint();
}

function damagePlayer(scene) {
  if (levelComplete || scene.time.now < invulnerableUntil) return;

  lives -= 1;
  livesText.setText("LIVES: " + lives);
  invulnerableUntil = scene.time.now + 1300;
  player.setVelocityY(-300);
  player.setVelocityX(player.x < WORLD_WIDTH - 100 ? -220 : 220);
  player.setTint(0xff7777);
  scene.time.delayedCall(1300, () => {
    if (player && player.active) player.clearTint();
  });

  if (lives <= 0) {
    levelComplete = true;
    freezePlayer();
    showEndScreen(scene, "GAME OVER", "The jungle trail was tough. Give it another try!", "TRY AGAIN");
  } else {
    showMessage(scene, "Snake bite! You lost a life.");
  }
}


function showEndScreen(scene, title, subtitle, buttonLabel) {
  scene.add.rectangle(480, 270, 960, 540, 0x071b12, 0.78).setScrollFactor(0).setDepth(100);
  scene.add.rectangle(480, 270, 440, 280, 0x173b2b).setStrokeStyle(4, 0xa8d66d).setScrollFactor(0).setDepth(101);
  scene.add.text(480, 166, title, {
    fontFamily: "Arial", fontSize: title === "GAME OVER" ? "34px" : "30px",
    fontStyle: "bold", color: title === "GAME OVER" ? "#ffd2bd" : "#f3f5b5"
  }).setOrigin(0.5).setScrollFactor(0).setDepth(102);
  scene.add.text(480, 215, subtitle, {
    fontFamily: "Arial", fontSize: "16px", color: "#e5f0df",
    align: "center", wordWrap: { width: 370 }
  }).setOrigin(0.5).setScrollFactor(0).setDepth(102);
  scene.add.text(480, 260, "Gems collected: " + score + "     Lives left: " + lives, {
    fontFamily: "Arial", fontSize: "16px", fontStyle: "bold", color: "#f6e7a6"
  }).setOrigin(0.5).setScrollFactor(0).setDepth(102);
  const button = scene.add.rectangle(480, 326, 210, 48, 0x79a947)
    .setStrokeStyle(2, 0xd8ef9b).setScrollFactor(0).setDepth(102)
    .setInteractive({ useHandCursor: true });
  scene.add.text(480, 326, buttonLabel, {
    fontFamily: "Arial", fontSize: "17px", fontStyle: "bold", color: "#102719"
  }).setOrigin(0.5).setScrollFactor(0).setDepth(103);
  button.on("pointerover", () => button.setFillStyle(0x96c85a));
  button.on("pointerout", () => button.setFillStyle(0x79a947));
  button.on("pointerdown", () => scene.scene.restart());
}

function showMessage(scene, message) {
  if (!messageText) return;
  messageText.setText(message);
  if (messageTimer) messageTimer.remove(false);
  messageTimer = scene.time.delayedCall(1800, () => {
    if (messageText && messageText.active) messageText.setText("");
  });
}
