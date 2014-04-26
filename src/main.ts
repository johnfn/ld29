/// <reference path="../d/phaser.d.ts" />

var keyboard:Phaser.Keyboard;

var MAP_WIDTH:number = 50; // in tiles
var MAP_HEIGHT:number = 50; // in tiles

var SCREEN_WIDTH:number = MAP_WIDTH * 25; // in px
var SCREEN_HEIGHT:number = MAP_HEIGHT * 25; // in px

class MainState extends Phaser.State {
	p:Player;
	walls:Phaser.TilemapLayer;
	f:Phaser.TilemapLayer;
	hud:HUD;

	trees:Phaser.TilemapLayer;
	background:Phaser.TilemapLayer;

	groups: {[key: string]: Phaser.Group} = {};

	public preload():void {
		this.load.spritesheet("player","assets/player.png",25,25,1,0,0);
		this.load.spritesheet("block","assets/block.png",25,25,1,0,0);
		this.load.spritesheet("probe","assets/probe.png",25,25,1,0,0);
		this.load.spritesheet("hud-probe","assets/hud-probe-indicator.png",25,25,4,0,0);
		this.load.tilemap("map", "assets/map.json", null, Phaser.Tilemap.TILED_JSON);

	}

	public init():void {
	}

	public create():void {
		keyboard = this.game.input.keyboard;

		this.game.world.setBounds(0, 0, MAP_WIDTH * 25, MAP_HEIGHT * 25);

		var tileset:Phaser.Tilemap = this.game.add.tilemap("map",25,25,30,30); // w,h, mapw, maph
		tileset.addTilesetImage("main","block",25, 25);

		tileset.setCollisionBetween(1,151,true,"collision");
		this.background = tileset.createLayer("background-1");
		this.walls = tileset.createLayer("collision");
		this.f = tileset.createLayer("filler");
		this.trees = tileset.createLayer("tree");

		this.p = new Player(this.game);
		this.p.x = 50;
		this.p.y = 50;

		this.game.add.existing(this.p);

		this.camera.follow(this.p);

		this.hud = new HUD(this.game);
	}

	public update():void {
		this.game.physics.arcade.collide(this.p, this.walls);

		if (this.groups["Probe"]) {
			this.game.physics.arcade.collide(this.walls, this.groups["Probe"]);
		}

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

		var superclassName:string = <string> (<any> this).constructor.name;
		var currentState:MainState = (<MainState> game.state.getCurrentState());
		if (!currentState.groups[superclassName]) {
			var newGroup:Phaser.Group = game.add.group();
			currentState.groups[superclassName] = newGroup;
			this.game.add.existing(newGroup);
		}

		currentState.groups[superclassName].add(this);
	}
}

class DialogObserver {
	static NO_PROBES:number = 2;

	static dialogs: {[key: number]: string[]; } = DialogObserver.dialog();

	static dialog(): {[key:number]: string[]; } {
		var dialogDict: {[key:number]: string[]; } = {};

		dialogDict[1] = ["Dialog maybe works."];
		dialogDict[DialogObserver.NO_PROBES] = ["No probles left."];

		return dialogDict;
	}

	static signal(dialogID:number) {
		if (!DialogObserver.dialogs[dialogID]) {
			console.error("no dialog with " + dialogID + " found.");
		}

		console.log(DialogObserver.dialogs[dialogID]);
	}
}

class Probe extends Entity {
	dx:number = 0;
	dy:number = 0;

	static MAX_PROBES:number = 3;
	static probesActive:number = 0;

	static makeNewProbe(game:Phaser.Game, x:number, y:number, dx:number, dy:number=0):Probe {
		if (Probe.probesActive >= Probe.MAX_PROBES) {
			DialogObserver.signal(DialogObserver.NO_PROBES);

			return null;
		}

		return new Probe(game, x, y, dx, dy, Probe.probesActive++);
	}

	constructor(game:Phaser.Game, x:number, y:number, dx:number, dy:number, probeId:number) {
		super(game, "probe");

		this.body.allowGravity = true;

		this.body.gravity.x = 0;
		this.body.gravity.y = 200;

		this.body.bounce.y = .3;
		this.body.bounce.x = .3;

		this.body.velocity.x = dx * 200;
		this.body.velocity.y = -100 + dy * 500;

		console.log("new Proble! " + probeId);

		this.x = x;
		this.y = y;
	}

	update() {
		if (this.body.blocked.down) {
			this.body.velocity.x *= .9;

			if (Math.abs(this.body.velocity.x) < 5) {
				this.body.velocity.x = 0;
			}
		}
	}
}

class ProbeIndicator extends Phaser.Sprite {
	static HAPPY:number = 0;
	static OK:number = 1;
	static SAD:number = 2;
	static HIDDEN:number = 3;

	happinessLevel:number = 0;

	constructor(game:Phaser.Game, which:number, happiness:number = 0) {
		super(game, 25 + which * 30, 25, "hud-probe", happiness);

		this.happinessLevel = happiness;
	}
}

class ProbeList {
	contents:Phaser.Group;
	game:Phaser.Game;
	probesOwned:number = 1;
	orderedProbeList:ProbeIndicator[] = [];

	constructor(game:Phaser.Game) {
		this.game = game;

		this.contents = game.add.group();
		this.contents.fixedToCamera = true;
		game.add.existing(this.contents);

		for (var i = 0; i < 3; i++) {
			var newIndicator = new ProbeIndicator(this.game, i, ProbeIndicator.HIDDEN);

			this.contents.add(newIndicator);
			this.orderedProbeList.push(newIndicator);
			newIndicator.visible = false;
		}

		for (var i = 0; i < this.probesOwned; i++) {
			this.orderedProbeList[i].visible = true;
		}
	}
}

class HUD {
	game:Phaser.Game;
	probeList:ProbeList;

	constructor(game:Phaser.Game) {
		this.game = game;
		this.probeList = new ProbeList(game);
	}

	addProbeIndicators() {
	}
} 

class Player extends Entity {
	facing:number;

	constructor(game:Phaser.Game) {
		super(game, "player");

		this.body.gravity = new Phaser.Point(0, 1600);

		var fireButton = game.input.keyboard.addKey(Phaser.Keyboard.Z);
		fireButton.onDown.add(this.fireProbe, this);
	}

	fireProbe():void {
		var dx = this.facing;

		Probe.makeNewProbe(this.game, this.x, this.y, dx, 0);
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

		if (this.body.facing == Phaser.LEFT) {
			this.facing = -1;
		} else if (this.body.facing == Phaser.RIGHT) {
			this.facing = 1;
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