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
  player.body.setSize(24, 42);
  player.body.setOffset(4, 5);
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
  const hero = scene.make.graphics({ x: 0, y: 0 });
  hero.fillStyle(0x214f35);
  hero.fillRoundedRect(5, 18, 24, 27, 7);
  hero.fillStyle(0xf0bd8c);
  hero.fillCircle(17, 12, 11);
  hero.fillStyle(0x4b2d1d);
  hero.fillRoundedRect(5, 1, 25, 8, 4);
  hero.fillStyle(0x17251b);
  hero.fillCircle(21, 12, 2);
  hero.fillStyle(0x8b4d2c);
  hero.fillRect(7, 42, 8, 6);
  hero.fillRect(20, 42, 8, 6);
  hero.generateTexture("hero", 36, 50);
  hero.destroy();

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
