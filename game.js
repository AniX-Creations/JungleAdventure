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

function create() {
  createTextures(this);
  createAnimations(this);
  createJungleBackground(this);

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

  player = this.physics.add.sprite(100, 440, "hero");
  player.setCollideWorldBounds(true);
  player.setDepth(10);
  player.setBounce(0);
  player.body.setSize(22, 39);
  player.body.setOffset(9, 10);
  this.physics.add.collider(player, platforms);

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
    w: Phaser.Input.Keyboard.KeyCodes.W
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

  if (player.x > WORLD_WIDTH - 70) {
    player.setVelocityX(0);
    showMessage(this, "You reached the end of the first trail!");
  }
}

function createTextures(scene) {
  // Four-frame explorer sprite sheet with alternating arm and leg positions.
  const frameWidth = 40;
  const frameHeight = 56;
  const sheet = scene.make.graphics({ x: 0, y: 0 });

  for (let frame = 0; frame < 4; frame++) {
    const x = frame * frameWidth;
    const swing = [-3, 2, 3, -2][frame];

    sheet.fillStyle(0x9b5c2e);
    sheet.fillRoundedRect(x + 7, 23, 10, 19, 4); // Backpack
    sheet.fillStyle(0x246344);
    sheet.fillRoundedRect(x + 13, 21, 19, 23, 6); // Shirt
    sheet.fillStyle(0xf0bd8c);
    sheet.fillCircle(x + 23, 15, 10); // Face
    sheet.fillStyle(0x4b2d1d);
    sheet.fillEllipse(x + 23, 8, 22, 7); // Hair
    sheet.fillStyle(0xc28a42);
    sheet.fillRoundedRect(x + 10, 5, 26, 5, 3); // Explorer hat
    sheet.fillStyle(0x17251b);
    sheet.fillCircle(x + 27, 15, 1.5); // Eye

    sheet.lineStyle(5, 0xf0bd8c, 1);
    sheet.lineBetween(x + 15, 26, x + 10 + swing, 36);
    sheet.lineBetween(x + 29, 26, x + 34 - swing, 36);

    sheet.lineStyle(6, 0x493222, 1);
    sheet.lineBetween(x + 18, 42, x + 16 + swing, 51);
    sheet.lineBetween(x + 27, 42, x + 28 - swing, 51);
    sheet.fillStyle(0x30251f);
    sheet.fillRoundedRect(x + 10 + swing, 49, 10, 5, 2);
    sheet.fillRoundedRect(x + 23 - swing, 49, 10, 5, 2);
  }

  sheet.generateTexture("hero-walk-sheet", frameWidth * 4, frameHeight);
  const walkTexture = scene.textures.get("hero-walk-sheet");
  for (let frame = 1; frame < 4; frame++) {
    walkTexture.add(frame, 0, frame * frameWidth, 0, frameWidth, frameHeight);
  }
  sheet.destroy();

  const jump = scene.make.graphics({ x: 0, y: 0 });
  jump.fillStyle(0x9b5c2e);
  jump.fillRoundedRect(7, 23, 10, 19, 4);
  jump.fillStyle(0x246344);
  jump.fillRoundedRect(13, 21, 19, 23, 6);
  jump.fillStyle(0xf0bd8c);
  jump.fillCircle(23, 15, 10);
  jump.fillStyle(0x4b2d1d);
  jump.fillEllipse(23, 8, 22, 7);
  jump.fillStyle(0xc28a42);
  jump.fillRoundedRect(10, 5, 26, 5, 3);
  jump.fillStyle(0x17251b);
  jump.fillCircle(27, 15, 1.5);
  jump.lineStyle(6, 0x493222, 1);
  jump.lineBetween(18, 42, 11, 49);
  jump.lineBetween(27, 42, 35, 47);
  jump.generateTexture("hero-jump", 40, 56);
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
  scene.add.rectangle(WORLD_WIDTH / 2, 270, WORLD_WIDTH, 540, 0x8ed5c0);

  for (let x = 0; x < WORLD_WIDTH + 300; x += 360) {
    scene.add.ellipse(x + 120, 360, 430, 210, 0x6bb68a).setDepth(0);
    scene.add.ellipse(x + 260, 390, 390, 180, 0x4d9b68).setDepth(0);
  }

  for (let x = 70; x < WORLD_WIDTH; x += 190) {
    scene.add.rectangle(x, 345, 24, 300, 0x765034).setDepth(1);
    scene.add.circle(x, 245, 72, 0x287744).setDepth(1);
    scene.add.circle(x - 43, 275, 53, 0x36934d).setDepth(1);
    scene.add.circle(x + 45, 278, 55, 0x3e9f50).setDepth(1);
    scene.add.circle(x + 7, 205, 42, 0x4aaa58).setDepth(1);
  }

  for (let x = 130; x < WORLD_WIDTH; x += 310) {
    scene.add.ellipse(x, 493, 150, 55, 0x286f3c).setDepth(4);
    scene.add.ellipse(x + 45, 485, 100, 48, 0x3c9148).setDepth(4);
  }

  scene.add.circle(820, 95, 42, 0xffe58a).setDepth(0);
}

function showMessage(scene, message) {
  if (!messageText) return;
  messageText.setText(message);
  if (messageTimer) messageTimer.remove(false);
  messageTimer = scene.time.delayedCall(1800, () => {
    if (messageText && messageText.active) messageText.setText("");
  });
}
