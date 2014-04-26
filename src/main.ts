/// <reference path="../d/phaser.d.ts" />

class MainState extends Phaser.State {
	public init():void {
	}

	public create():void {
		
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