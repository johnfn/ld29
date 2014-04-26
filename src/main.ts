/// <reference path="../d/phaser.d.ts" />

var cursors:Phaser.CursorKeys;

class Player extends Phaser.Sprite {
	body:Phaser.Physics.Arcade.Body;

	constructor(game:Phaser.Game) {
		super(game, 0, 0, "player", 0);

		game.physics.enable(this, Phaser.Physics.ARCADE);
	}

	update():void {
		if (cursors.left.isDown) {
			this.body.velocity.x = -300;
		} else if (cursors.right.isDown) {
			this.body.velocity.x = 300;
		} else {
			this.body.velocity.x = 0;
		}
	}
}

class MainState extends Phaser.State {
	public preload():void {
		this.load.spritesheet("player","assets/player.png",25,25,1,0,0);
	}

	public init():void {
	}

	public create():void {
		cursors = this.game.input.keyboard.createCursorKeys();

		var p:Player = new Player(this.game);

		this.game.add.existing(p);

		//this.game.add.sprite(0, 0, "player");
	}

	public update():void {
		
	}
}

class Game {
	game:Phaser.Game;
	state: Phaser.State;

	constructor() {
		this.state = new MainState();
		this.game = new Phaser.Game(800, 600, Phaser.WEBGL, "main", this.state);
	}

}

new Game();