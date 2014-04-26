/// <reference path="../d/phaser.d.ts" />

var keyboard:Phaser.Keyboard;

var MAP_WIDTH:number = 50; // in tiles
var MAP_HEIGHT:number = 50; // in tiles

var SCREEN_WIDTH:number = MAP_WIDTH * 25; // in px
var SCREEN_HEIGHT:number = MAP_HEIGHT * 25; // in px

class MainState extends Phaser.State {
	p:Player;
	b:Phaser.TilemapLayer;

	public preload():void {
		this.load.spritesheet("player","assets/player.png",25,25,1,0,0);
		this.load.spritesheet("block","assets/block.png",25,25,1,0,0);
		this.load.tilemap("map", "assets/map.json", null, Phaser.Tilemap.TILED_JSON);
	}

	public init():void {
	}

	public create():void {
		keyboard = this.game.input.keyboard;

		this.game.world.setBounds(0, 0, MAP_WIDTH * 25, MAP_HEIGHT * 25);

		this.p = new Player(this.game);
		this.game.add.existing(this.p);

		var tileset:Phaser.Tilemap = this.game.add.tilemap("map",25,25,30,30); // w,h, mapw, maph
		tileset.addTilesetImage("main","block",25, 25);

		tileset.setCollisionBetween(1,151,true,"collision");
		this.b = tileset.createLayer("collision");

		this.camera.follow(this.p);
	}

	public update():void {
		this.game.physics.arcade.collide(this.p, this.b);

		// set bounds to the proper screen

		var mapX:number = Math.floor(this.p.x / SCREEN_WIDTH)  * SCREEN_WIDTH;
		var mapY:number = Math.floor(this.p.y / SCREEN_HEIGHT) * SCREEN_HEIGHT;

		this.game.world.setBounds(mapX, mapY, SCREEN_WIDTH, SCREEN_HEIGHT);
	}
}

class Entity extends Phaser.Sprite {
	body:Phaser.Physics.Arcade.Body;

	constructor(game:Phaser.Game, spritesheet:string) {
		super(game, 0, 0, spritesheet, 0);

		game.physics.enable(this, Phaser.Physics.ARCADE);
	}
}

class Player extends Entity {
	constructor(game:Phaser.Game) {
		super(game, "player");

		this.body.gravity = new Phaser.Point(0, 1600);
	}

	update():void {
		if (keyboard.isDown(Phaser.Keyboard.LEFT)) {
			this.body.velocity.x = -300;
		} else if (keyboard.isDown(Phaser.Keyboard.RIGHT)) {
			this.body.velocity.x = 300;
		} else {
			this.body.velocity.x = 0;
		}

		if (keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
			if (this.body.blocked.down) {
				this.body.velocity.y = -500;
			}
		}
	}
}

class Block extends Entity {
	constructor(game:Phaser.Game) {
		super(game, "block");

		this.body.immovable = true;
	}
}

class Game {
	game:Phaser.Game;
	state: Phaser.State;

	// TODO... browsers w/o WEBGL...
	constructor() {
		this.state = new MainState();
		this.game = new Phaser.Game(800, 600, Phaser.WEBGL, "main", this.state);
	}

}

new Game();