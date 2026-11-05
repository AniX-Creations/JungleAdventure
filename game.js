const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;
const WORLD_WIDTH = 2800;

const config = {
  type: Phaser.AUTO,
  pixelArt: true,
  roundPixels: true,
  parent: "game-container",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#5bb8a0",
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
  // Deliberate 16-bit pixel-art palette and hard-edged shapes.
  const fw = 64, fh = 80;
  const g = scene.make.graphics({ x: 0, y: 0 });
  const swing = [0, 3, 0, -3];
  for (let i = 0; i < 4; i++) {
    const x = i * fw, s = swing[i];
    // Shadow, backpack and bedroll.
    g.fillStyle(0x172b24); g.fillRect(x + 15, 72, 35, 4);
    g.fillStyle(0x49301f); g.fillRect(x + 8, 34, 17, 27);
    g.fillStyle(0x9b6336); g.fillRect(x + 11, 37, 11, 19);
    g.fillStyle(0xd7a85c); g.fillRect(x + 12, 43, 9, 6);
    g.fillStyle(0xe4c985); g.fillRect(x + 8, 29, 17, 6);
    // Boots and legs, animated by a few pixels per frame.
    g.fillStyle(0x263d32); g.fillRect(x + 23 + s, 51, 10, 16);
    g.fillRect(x + 36 - s, 51, 9, 16);
    g.fillStyle(0x593b26); g.fillRect(x + 18 + s, 65, 17, 8);
    g.fillRect(x + 34 - s, 65, 16, 8);
    g.fillStyle(0xd5a65e); g.fillRect(x + 22 + s, 66, 9, 2);
    g.fillRect(x + 38 - s, 66, 8, 2);
    // Green tunic, belt and arm pixels.
    g.fillStyle(0x17452f); g.fillRect(x + 19, 29, 29, 27);
    g.fillStyle(0x3f9651); g.fillRect(x + 23, 31, 21, 19);
    g.fillStyle(0x8dc45b); g.fillRect(x + 25, 33, 5, 3);
    g.fillStyle(0x6b4728); g.fillRect(x + 22, 51, 25, 5);
    g.fillStyle(0xf0cf7a); g.fillRect(x + 33, 52, 5, 4);
    g.fillStyle(0x17452f); g.fillRect(x + 13, 32, 10, 17); g.fillRect(x + 44, 32, 10, 17);
    g.fillStyle(0xd99b70);
    g.fillRect(x + 14, 47, 8, 10 + Math.max(0, s));
    g.fillRect(x + 45, 47, 8, 10 + Math.max(0, -s));
    // Face, hair and wide-brim explorer hat.
    g.fillStyle(0x8e5538); g.fillRect(x + 25, 14, 21, 17);
    g.fillStyle(0xe0a477); g.fillRect(x + 27, 16, 17, 14);
    g.fillStyle(0x5a3526); g.fillRect(x + 24, 12, 23, 8);
    g.fillRect(x + 22, 17, 5, 10);
    g.fillStyle(0x211d19); g.fillRect(x + 39, 21, 3, 3);
    g.fillStyle(0xffffff); g.fillRect(x + 40, 21, 1, 1);
    g.fillStyle(0x9a553d); g.fillRect(x + 38, 27, 5, 2);
    g.fillStyle(0x5d4028); g.fillRect(x + 17, 12, 42, 5);
    g.fillStyle(0x9a713c); g.fillRect(x + 25, 5, 27, 9);
    g.fillStyle(0xe1bd70); g.fillRect(x + 27, 8, 23, 2);
    g.fillStyle(0x644326); g.fillRect(x + 36, 5, 7, 3);
  }
  g.generateTexture("hero-walk-sheet", fw * 4, fh);
  const tex = scene.textures.get("hero-walk-sheet");
  for (let i = 1; i < 4; i++) tex.add(i, 0, i * fw, 0, fw, fh);
  g.destroy();

  const jump = scene.make.graphics({ x: 0, y: 0 });
  jump.fillStyle(0x49301f); jump.fillRect(8, 34, 17, 27);
  jump.fillStyle(0x9b6336); jump.fillRect(11, 37, 11, 19);
  jump.fillStyle(0x17452f); jump.fillRect(19, 29, 29, 27);
  jump.fillStyle(0x3f9651); jump.fillRect(23, 32, 21, 18);
  jump.fillStyle(0x263d32); jump.fillRect(21, 52, 12, 13); jump.fillRect(36, 50, 10, 13);
  jump.fillStyle(0x593b26); jump.fillRect(10, 63, 18, 9); jump.fillRect(40, 61, 16, 9);
  jump.fillStyle(0xd99b70); jump.fillRect(7, 29, 9, 14); jump.fillRect(49, 27, 9, 14);
  jump.fillStyle(0xe0a477); jump.fillRect(27, 16, 17, 14);
  jump.fillStyle(0x5a3526); jump.fillRect(24, 12, 23, 8);
  jump.fillStyle(0x211d19); jump.fillRect(39, 21, 3, 3);
  jump.fillStyle(0x5d4028); jump.fillRect(17, 12, 42, 5);
  jump.fillStyle(0x9a713c); jump.fillRect(25, 5, 27, 9);
  jump.generateTexture("hero-jump", 64, 80); jump.destroy();

  const ground = scene.make.graphics({ x: 0, y: 0 });
  ground.fillStyle(0x69432d); ground.fillRect(0, 0, 64, 32);
  ground.fillStyle(0x27683a); ground.fillRect(0, 0, 64, 9);
  ground.fillStyle(0x79b94c); ground.fillRect(0, 0, 64, 4);
  ground.fillStyle(0x3d7d3c);
  for (let x = 2; x < 64; x += 12) ground.fillRect(x, 5, 5, 5);
  ground.fillStyle(0x9a7045);
  for (let x = 5; x < 64; x += 17) ground.fillRect(x, 15 + (x % 3) * 3, 7, 3);
  ground.fillStyle(0x3e2d25);
  for (let x = 9; x < 64; x += 21) ground.fillRect(x, 25, 3, 4);
  ground.generateTexture("ground", 64, 32); ground.destroy();

  const platform = scene.make.graphics({ x: 0, y: 0 });
  platform.fillStyle(0x38271f); platform.fillRect(0, 7, 128, 25);
  platform.fillStyle(0x80502c); platform.fillRect(0, 2, 128, 14);
  platform.fillStyle(0xb47a3e); platform.fillRect(4, 3, 120, 5);
  platform.fillStyle(0x3b7a3a); platform.fillRect(0, 0, 128, 7);
  platform.fillStyle(0x83bb4e);
  for (let x = 5; x < 128; x += 19) platform.fillRect(x, 0, 9, 3);
  platform.fillStyle(0xd19a52);
  for (let x = 12; x < 120; x += 28) platform.fillRect(x, 12, 14, 3);
  platform.fillStyle(0x39251c); platform.fillRect(12, 21, 4, 4); platform.fillRect(112, 21, 4, 4);
  platform.generateTexture("platform", 128, 32); platform.destroy();

  const beetle = scene.make.graphics({ x: 0, y: 0 });
  beetle.fillStyle(0x17251c); beetle.fillRect(7, 18, 40, 12);
  beetle.fillStyle(0x246b35); beetle.fillRect(9, 12, 34, 16);
  beetle.fillStyle(0x55a943); beetle.fillRect(13, 8, 25, 12);
  beetle.fillStyle(0x8bc84b); beetle.fillRect(17, 9, 13, 4);
  beetle.fillStyle(0x17251c); beetle.fillRect(39, 14, 12, 10);
  beetle.fillStyle(0xffe36b); beetle.fillRect(45, 15, 3, 3);
  beetle.fillStyle(0x392b20);
  beetle.fillRect(9, 27, 4, 7); beetle.fillRect(21, 27, 4, 7);
  beetle.fillRect(34, 27, 4, 7); beetle.fillRect(44, 24, 4, 8);
  beetle.generateTexture("beetle", 56, 36); beetle.destroy();

  const snake = scene.make.graphics({ x: 0, y: 0 });
  snake.fillStyle(0x183522); snake.fillRect(5, 37, 66, 12);
  snake.fillRect(17, 28, 13, 18); snake.fillRect(38, 30, 13, 17);
  snake.fillStyle(0x398b43); snake.fillRect(7, 34, 61, 10);
  snake.fillRect(20, 26, 9, 16); snake.fillRect(41, 28, 9, 15);
  snake.fillStyle(0x9bc95a); snake.fillRect(11, 35, 12, 3); snake.fillRect(34, 35, 11, 3);
  snake.fillStyle(0x183522); snake.fillRect(62, 17, 13, 23); snake.fillRect(68, 12, 28, 17);
  snake.fillStyle(0x4ca34d); snake.fillRect(66, 18, 11, 18); snake.fillRect(72, 14, 21, 12);
  snake.fillStyle(0xffe56b); snake.fillRect(84, 16, 4, 4);
  snake.fillStyle(0x172319); snake.fillRect(86, 17, 2, 2);
  snake.fillStyle(0xe74f46); snake.fillRect(92, 24, 8, 2);
  snake.fillRect(98, 23, 2, 4);
  snake.generateTexture("snake", 104, 52); snake.destroy();

  const gem = scene.make.graphics({ x: 0, y: 0 });
  gem.fillStyle(0x9b4de0); gem.fillRect(7, 0, 10, 4);
  gem.fillRect(3, 4, 18, 4); gem.fillRect(0, 8, 24, 9);
  gem.fillRect(4, 17, 16, 4); gem.fillRect(8, 21, 8, 3);
  gem.fillStyle(0xe6b7ff); gem.fillRect(5, 5, 5, 8);
  gem.fillStyle(0x7133b4); gem.fillRect(15, 10, 5, 8);
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
  // A deep, layered 16-bit jungle with pixel-step silhouettes and bright canopy gaps.
  scene.add.rectangle(WORLD_WIDTH / 2, 270, WORLD_WIDTH, 540, 0x5bb8a0).setScrollFactor(0.06).setDepth(-40);
  scene.add.rectangle(WORLD_WIDTH / 2, 270, WORLD_WIDTH, 210, 0x7bd0b0, 0.55).setScrollFactor(0.08).setDepth(-39);
  scene.add.rectangle(760, 94, 72, 54, 0xffdf82).setScrollFactor(0.1).setDepth(-35);
  scene.add.rectangle(760, 94, 94, 22, 0xffedaa).setScrollFactor(0.1).setDepth(-34);

  // Distant jungle ridges.
  for (let x = -100; x < WORLD_WIDTH + 400; x += 420) {
    scene.add.triangle(x + 180, 365, -220, 110, 0, -90, 230, 110, 0x3f9875).setScrollFactor(0.14).setDepth(-30);
    scene.add.triangle(x + 340, 385, -190, 90, 0, -65, 200, 90, 0x287c62).setScrollFactor(0.18).setDepth(-29);
    scene.add.rectangle(x + 175, 315, 22, 220, 0x397e58).setScrollFactor(0.22).setDepth(-25);
    for (let leaf = 0; leaf < 5; leaf++) {
      scene.add.rectangle(x + 130 + leaf * 23, 205 + (leaf % 2) * 15, 42, 18, leaf % 2 ? 0x347f54 : 0x4da06a)
        .setAngle((leaf % 2 ? 1 : -1) * 18).setScrollFactor(0.22).setDepth(-24);
    }
  }

  // Midground trunks and blocky layered canopy clusters.
  for (let x = 0; x < WORLD_WIDTH + 300; x += 250) {
    const shift = (Math.floor(x / 250) % 3) * 17;
    scene.add.rectangle(x + 60, 345, 38, 390, 0x60402b).setScrollFactor(0.5).setDepth(-15);
    scene.add.rectangle(x + 52, 340, 8, 350, 0x98653b).setScrollFactor(0.5).setDepth(-14);
    scene.add.rectangle(x + 60, 183 + shift, 104, 38, 0x175b3c).setScrollFactor(0.5).setDepth(-13);
    scene.add.rectangle(x + 22, 211 + shift, 72, 38, 0x247747).setScrollFactor(0.5).setDepth(-12);
    scene.add.rectangle(x + 98, 216 + shift, 78, 42, 0x2f8b4b).setScrollFactor(0.5).setDepth(-12);
    scene.add.rectangle(x + 58, 145 + shift, 66, 42, 0x3b9c52).setScrollFactor(0.5).setDepth(-11);
    scene.add.rectangle(x + 32, 185 + shift, 24, 12, 0x70bd57).setScrollFactor(0.5).setDepth(-10);
    scene.add.rectangle(x + 100, 194 + shift, 30, 12, 0x70bd57).setScrollFactor(0.5).setDepth(-10);
    if (Math.floor(x / 250) % 2 === 0) {
      scene.add.rectangle(x + 150, 290, 5, 150, 0x286d43).setScrollFactor(0.5).setDepth(-9);
      for (let v = 0; v < 5; v++) {
        scene.add.rectangle(x + 143 + (v % 2) * 13, 330 + v * 19, 15, 7, v % 2 ? 0x76b94e : 0x4c9d49)
          .setScrollFactor(0.5).setDepth(-8).setAngle(v % 2 ? 28 : -28);
      }
    }
  }

  // Foreground ferns and stepped bushes frame the play area.
  for (let x = 30; x < WORLD_WIDTH + 200; x += 300) {
    scene.add.rectangle(x, 492, 110, 28, 0x155d37).setDepth(3);
    scene.add.rectangle(x + 24, 480, 76, 25, 0x237a40).setDepth(3);
    scene.add.rectangle(x + 61, 491, 90, 23, 0x32934a).setDepth(3);
    for (let f = 0; f < 5; f++) {
      const fx = x + 112 + f * 7;
      scene.add.line(fx, 504, 0, 0, (f - 2) * 13, -27 - (f % 2) * 8, 0x8ac85a).setLineWidth(4).setDepth(4);
      scene.add.rectangle(fx + (f - 2) * 5, 480 - (f % 2) * 8, 13, 5, 0x9bd45d).setDepth(4).setAngle((f - 2) * 18);
    }
  }

  // Floating fireflies.
  for (let i = 0; i < 24; i++) {
    const px = (i * 173) % WORLD_WIDTH;
    const py = 105 + (i * 47) % 285;
    const mote = scene.add.rectangle(px, py, 4, 4, 0xffed83).setDepth(-1);
    scene.tweens.add({ targets: mote, y: py - 13, alpha: 0.2, duration: 1400 + (i % 5) * 250, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
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
