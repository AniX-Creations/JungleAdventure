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
  player.body.setSize(32, 48);
  player.body.setOffset(12, 18);
  this.physics.add.collider(player, platforms);

  // Snakes guard parts of the trail. Touching one costs a life.
  const snakes = this.physics.add.staticGroup();
  [[690, 478], [1190, 478], [1740, 478], [2240, 478]].forEach(([x, y]) => {
    const snake = snakes.create(x, y, "snake");
    snake.setScale(1.25);
    snake.setDepth(22);
    snake.refreshBody();

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
    showMessage(this, "TRAIL COMPLETE! Press R to play again.");
  }
}

function createTextures(scene) {
  // Block-style explorer sprite sheet inspired by voxel adventure games.
  const frameWidth = 56;
  const frameHeight = 72;
  const sheet = scene.make.graphics({ x: 0, y: 0 });
  const stride = [-3, 2, 3, -2];

  for (let frame = 0; frame < 4; frame++) {
    const x = frame * frameWidth;
    const step = stride[frame];

    // Backpack: squared-off voxel shape.
    sheet.fillStyle(0x49321e);
    sheet.fillRect(x + 7, 29, 14, 25);
    sheet.fillStyle(0x9b6534);
    sheet.fillRect(x + 9, 31, 11, 19);
    sheet.fillStyle(0xc18a4d);
    sheet.fillRect(x + 10, 39, 9, 7);

    // Legs and boots, alternating for a simple walk cycle.
    sheet.fillStyle(0x263d31);
    sheet.fillRect(x + 21, 45, 9, 15 + step);
    sheet.fillRect(x + 30, 45, 9, 15 - step);
    sheet.fillStyle(0x354b3b);
    sheet.fillRect(x + 21, 45, 9, 8);
    sheet.fillRect(x + 30, 45, 9, 8);
    sheet.fillStyle(0x38291f);
    sheet.fillRect(x + 17 + step, 59 + step, 14, 8);
    sheet.fillRect(x + 29 - step, 59 - step, 14, 8);
    sheet.fillStyle(0xb58a50);
    sheet.fillRect(x + 19 + step, 60 + step, 8, 2);
    sheet.fillRect(x + 31 - step, 60 - step, 8, 2);

    // Square torso with a brighter front panel.
    sheet.fillStyle(0x17452f);
    sheet.fillRect(x + 19, 25, 23, 24);
    sheet.fillStyle(0x347b4e);
    sheet.fillRect(x + 22, 27, 17, 18);
    sheet.fillStyle(0x9ab56d);
    sheet.fillRect(x + 29, 29, 2, 14);
    sheet.fillStyle(0x183a29);
    sheet.fillRect(x + 27, 45, 7, 4);

    // Block arms swing with the legs.
    sheet.fillStyle(0x245c3d);
    sheet.fillRect(x + 14, 27, 8, 13);
    sheet.fillRect(x + 40, 27, 8, 13);
    sheet.fillStyle(0xd99e75);
    sheet.fillRect(x + 14 + step, 39, 8, 12 + step);
    sheet.fillRect(x + 40 - step, 39, 8, 12 - step);

    // Square head, hair, face and pixel eyes.
    sheet.fillStyle(0xb97852);
    sheet.fillRect(x + 23, 9, 22, 20);
    sheet.fillStyle(0xd99e75);
    sheet.fillRect(x + 25, 11, 18, 16);
    sheet.fillStyle(0x563522);
    sheet.fillRect(x + 22, 6, 24, 7);
    sheet.fillRect(x + 22, 10, 4, 7);
    sheet.fillStyle(0x29251e);
    sheet.fillRect(x + 37, 17, 3, 3);
    sheet.fillStyle(0x8b4e3b);
    sheet.fillRect(x + 37, 23, 5, 2);

    // Square safari hat.
    sheet.fillStyle(0x77532e);
    sheet.fillRect(x + 19, 7, 31, 4);
    sheet.fillStyle(0xc49a58);
    sheet.fillRect(x + 24, 1, 21, 7);
    sheet.fillStyle(0xe0bd79);
    sheet.fillRect(x + 25, 6, 19, 2);
    sheet.fillStyle(0x79552f);
    sheet.fillRect(x + 31, 2, 5, 2);

    // Small shadow.
    sheet.fillStyle(0x183c2a, 0.25);
    sheet.fillRect(x + 15, 68, 30, 3);
  }

  sheet.generateTexture("hero-walk-sheet", frameWidth * 4, frameHeight);
  const walkTexture = scene.textures.get("hero-walk-sheet");
  for (let frame = 1; frame < 4; frame++) {
    walkTexture.add(frame, 0, frame * frameWidth, 0, frameWidth, frameHeight);
  }
  sheet.destroy();

  // Blocky airborne pose.
  const jump = scene.make.graphics({ x: 0, y: 0 });
  jump.fillStyle(0x49321e);
  jump.fillRect(7, 30, 14, 24);
  jump.fillStyle(0x9b6534);
  jump.fillRect(9, 32, 11, 18);
  jump.fillStyle(0x17452f);
  jump.fillRect(19, 25, 23, 24);
  jump.fillStyle(0x347b4e);
  jump.fillRect(22, 27, 17, 18);
  jump.fillStyle(0x263d31);
  jump.fillRect(21, 45, 9, 12);
  jump.fillRect(31, 44, 9, 12);
  jump.fillStyle(0x38291f);
  jump.fillRect(9, 56, 14, 8);
  jump.fillRect(39, 54, 14, 8);
  jump.fillStyle(0xd99e75);
  jump.fillRect(12, 30, 8, 13);
  jump.fillRect(42, 29, 8, 13);
  jump.fillRect(23, 9, 22, 20);
  jump.fillStyle(0xb97852);
  jump.fillRect(23, 9, 22, 4);
  jump.fillStyle(0x563522);
  jump.fillRect(22, 6, 24, 7);
  jump.fillStyle(0x29251e);
  jump.fillRect(37, 17, 3, 3);
  jump.fillStyle(0x77532e);
  jump.fillRect(19, 7, 31, 4);
  jump.fillStyle(0xc49a58);
  jump.fillRect(24, 1, 21, 7);
  jump.generateTexture("hero-jump", 56, 72);
  jump.destroy();

  const ground = scene.make.graphics({ x: 0, y: 0 });
  ground.fillStyle(0x795238);
  ground.fillRect(0, 0, 64, 32);
  ground.fillStyle(0x3f913e);
  ground.fillRect(0, 0, 64, 8);
  ground.fillStyle(0x6ab34a);
  ground.fillRect(0, 0, 64, 3);
  ground.generateTexture("ground", 64, 32);
  ground.destroy();

  const platform = scene.make.graphics({ x: 0, y: 0 });
  platform.fillStyle(0x795238);
  platform.fillRoundedRect(0, 5, 128, 27, 5);
  platform.fillStyle(0x4c9a42);
  platform.fillRoundedRect(0, 0, 128, 10, 5);
  platform.lineStyle(2, 0x2e7137, 1);
  platform.lineBetween(8, 11, 120, 11);
  platform.generateTexture("platform", 128, 32);
  platform.destroy();

  // Side-view snake with a long body, raised head and clean silhouette.
  const snake = scene.make.graphics({ x: 0, y: 0 });
  snake.fillStyle(0x173b29, 0.25);
  snake.fillEllipse(48, 55, 88, 10);
  snake.lineStyle(17, 0x173d2c, 1);
  snake.beginPath();
  snake.moveTo(8, 43);
  snake.lineTo(22, 34);
  snake.lineTo(39, 39);
  snake.lineTo(54, 32);
  snake.lineTo(67, 35);
  snake.strokePath();
  snake.lineStyle(11, 0x398d4c, 1);
  snake.beginPath();
  snake.moveTo(8, 41);
  snake.lineTo(22, 34);
  snake.lineTo(39, 39);
  snake.lineTo(54, 32);
  snake.lineTo(67, 35);
  snake.strokePath();
  snake.lineStyle(4, 0xb6d66a, 1);
  snake.beginPath();
  snake.moveTo(12, 44);
  snake.lineTo(24, 39);
  snake.lineTo(39, 43);
  snake.lineTo(54, 37);
  snake.lineTo(66, 39);
  snake.strokePath();
  snake.lineStyle(14, 0x173d2c, 1);
  snake.lineBetween(63, 35, 73, 20);
  snake.lineStyle(9, 0x398d4c, 1);
  snake.lineBetween(63, 34, 73, 20);
  snake.fillStyle(0x173d2c);
  snake.fillEllipse(77, 17, 29, 20);
  snake.fillStyle(0x55a957);
  snake.fillEllipse(77, 15, 24, 15);
  snake.fillStyle(0xf4e477);
  snake.fillCircle(82, 12, 3.5);
  snake.fillStyle(0x172319);
  snake.fillCircle(83, 12, 1.7);
  snake.lineStyle(2, 0x253d24, 1);
  snake.lineBetween(82, 21, 91, 21);
  snake.lineStyle(2, 0xd94c46, 1);
  snake.lineBetween(90, 21, 97, 24);
  snake.lineBetween(97, 24, 100, 22);
  snake.lineBetween(97, 24, 100, 27);
  snake.fillStyle(0xb7d86a);
  snake.fillCircle(24, 31, 2);
  snake.fillCircle(42, 35, 2);
  snake.fillCircle(57, 29, 2);
  snake.generateTexture("snake", 104, 64);
  snake.destroy();

  const gem = scene.make.graphics({ x: 0, y: 0 });
  gem.fillStyle(0xffdf59);
  gem.fillPoints([
    new Phaser.Geom.Point(12, 0),
    new Phaser.Geom.Point(24, 12),
    new Phaser.Geom.Point(12, 24),
    new Phaser.Geom.Point(0, 12)
  ], true);
  gem.fillStyle(0xfff4b0);
  gem.fillTriangle(12, 3, 19, 12, 12, 12);
  gem.generateTexture("gem", 24, 24);
  gem.destroy();
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
  // Sky and distant hills move slowly to create a parallax effect.
  scene.add.rectangle(WORLD_WIDTH / 2, GAME_HEIGHT / 2, WORLD_WIDTH, GAME_HEIGHT, 0x9bdcc7)
    .setScrollFactor(0.15)
    .setDepth(-20);

  for (let x = -100; x < WORLD_WIDTH + 500; x += 520) {
    scene.add.ellipse(x + 170, 355, 560, 220, 0x79c69a)
      .setScrollFactor(0.22)
      .setDepth(-15);
    scene.add.ellipse(x + 390, 390, 520, 190, 0x5eaa7b)
      .setScrollFactor(0.3)
      .setDepth(-14);
  }

  // Sunlight glow and soft clouds sit behind the jungle canopy.
  scene.add.circle(790, 105, 58, 0xffe99b, 0.8)
    .setScrollFactor(0.2)
    .setDepth(-12);
  for (let x = 180; x < WORLD_WIDTH; x += 760) {
    scene.add.ellipse(x, 105, 115, 28, 0xe7f5d9, 0.55).setScrollFactor(0.2).setDepth(-11);
    scene.add.ellipse(x + 35, 96, 75, 24, 0xe7f5d9, 0.55).setScrollFactor(0.2).setDepth(-11);
  }

  // Mid-distance jungle trees.
  for (let x = 30; x < WORLD_WIDTH + 180; x += 190) {
    scene.add.rectangle(x, 335, 28, 330, 0x765034)
      .setScrollFactor(0.72)
      .setDepth(-2);
    scene.add.ellipse(x, 240, 150, 125, 0x287744).setScrollFactor(0.72).setDepth(-1);
    scene.add.ellipse(x - 48, 270, 105, 92, 0x36934d).setScrollFactor(0.72).setDepth(-1);
    scene.add.ellipse(x + 52, 270, 112, 94, 0x3e9f50).setScrollFactor(0.72).setDepth(-1);
    scene.add.ellipse(x + 5, 198, 92, 78, 0x4aaa58).setScrollFactor(0.72).setDepth(-1);

    // Hanging vines with small leaf clusters.
    if (Math.floor(x / 190) % 2 === 0) {
      scene.add.rectangle(x + 66, 300, 4, 115, 0x347a43).setScrollFactor(0.72).setDepth(0);
      scene.add.ellipse(x + 66, 357, 12, 24, 0x75bd55).setScrollFactor(0.72).setDepth(0);
      scene.add.ellipse(x + 61, 376, 10, 18, 0x5ba94b).setScrollFactor(0.72).setDepth(0);
    }
  }

  // Foreground plants add depth without hiding the explorer.
  for (let x = 90; x < WORLD_WIDTH + 180; x += 310) {
    scene.add.ellipse(x, 493, 160, 58, 0x286f3c).setDepth(4);
    scene.add.ellipse(x + 48, 484, 112, 48, 0x3c9148).setDepth(4);
    scene.add.ellipse(x + 104, 501, 78, 38, 0x4b9f4d).setDepth(4);
    scene.add.ellipse(x + 12, 514, 42, 13, 0x8c8870).setDepth(4);
  }

  // Small bright plants along the trail.
  for (let x = 220; x < WORLD_WIDTH; x += 430) {
    scene.add.line(x, 500, 0, 0, -12, -25, 0x9acb61).setLineWidth(4).setDepth(5);
    scene.add.line(x + 4, 500, 0, 0, 14, -20, 0x9acb61).setLineWidth(4).setDepth(5);
    scene.add.ellipse(x - 12, 476, 13, 7, 0x8bc34a).setDepth(5).setAngle(-35);
    scene.add.ellipse(x + 18, 480, 13, 7, 0x8bc34a).setDepth(5).setAngle(35);
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
    showMessage(scene, "GAME OVER! Press R to restart.");
  } else {
    showMessage(scene, "Snake bite! You lost a life.");
  }
}

function showMessage(scene, message) {
  if (!messageText) return;
  messageText.setText(message);
  if (messageTimer) messageTimer.remove(false);
  messageTimer = scene.time.delayedCall(1800, () => {
    if (messageText && messageText.active) messageText.setText("");
  });
}
