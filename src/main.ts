/// <reference path="../d/phaser.d.ts" />

var keyboard:Phaser.Keyboard;

var MAP_WIDTH:number = 40; // in tiles
var MAP_HEIGHT:number = 40; // in tiles

var SCREEN_WIDTH:number = MAP_WIDTH * 25; // in px
var SCREEN_HEIGHT:number = MAP_HEIGHT * 25; // in px

class MainState extends Phaser.State {
	p:Player;
	walls:Phaser.TilemapLayer;
	f:Phaser.TilemapLayer;
	hud:HUD;

	trees:Phaser.TilemapLayer;
	background:Phaser.TilemapLayer;
	target:Target;

	currentFocus:Entity;
	d:Darkness;

	mapX:number = -1;
	mapY:number = -1;

	groups: {[key: string]: Phaser.Group} = {};

	static getMainState(game:Phaser.Game):MainState {
		return <MainState> game.state.getCurrentState();
	}

	public preload():void {
		this.load.image("dialog", "assets/dialog.png");
		this.load.spritesheet("player","assets/player.png",25,25,1,0,0);
		this.load.spritesheet("block","assets/block.png",25,25,1,0,0);
		this.load.spritesheet("probe","assets/probe.png",25,25,1,0,0);
		this.load.spritesheet("hud-probe","assets/hud-probe-indicator.png",25,25,5,0,0);
		this.load.spritesheet("bw","assets/bw.png",25,25,2,0,0);
		this.load.spritesheet("light","assets/light.png",25,25,1,0,0);
		this.load.image("energybar", "assets/energybar.png");
		this.load.image("target", "assets/target.png");
		this.load.image("hud-msg-a","assets/msgA.png");
		this.load.image("hud-msg-s","assets/msgS.png");
		this.load.image("hud-msg-d","assets/msgD.png");
		this.load.image("hud-msg-c","assets/msgc.png");
		this.load.image("hud-msg-zzz","assets/msgZZZ.png");
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
		this.f = tileset.createLayer("filler");
		this.walls = tileset.createLayer("collision");
		this.trees = tileset.createLayer("tree");

		tileset.createFromObjects("light", 5, "light", 0, true, true, this.game.world, Light);

		this.p = new Player(this.game);
		this.p.x = 50;
		this.p.y = 250;

		this.game.add.existing(this.p);


		this.currentFocus = this.p;

		this.d = new Darkness(this.game);
		Darkness.addPlayer(this.p);
		Darkness.walls = this.walls;

		this.hud = new HUD(this.game);
		this.target = new Target(this.game);
		this.game.add.existing(this.target);
	}

	public update():void {
		this.game.physics.arcade.collide(this.p, this.walls);
		this.game.physics.arcade.collide(this.p, Darkness.collideGroup);
		this.camera.follow(this.currentFocus, Phaser.Camera.FOLLOW_PLATFORMER);

		if (this.groups["Probe"]) {
			var probes:Phaser.Group = this.groups["Probe"]

			this.game.physics.arcade.collide(this.walls, probes);
			this.game.physics.arcade.collide(probes, probes);
			this.game.physics.arcade.collide(this.p, probes);
		}

		// set bounds to the proper screen

		var newMapX:number = Math.floor(this.p.x / SCREEN_WIDTH)  * SCREEN_WIDTH;
		var newMapY:number = Math.floor(this.p.y / SCREEN_HEIGHT) * SCREEN_HEIGHT;

		if (newMapX != this.mapX || newMapY != this.mapY) {
			this.mapX = newMapX;
			this.mapY = newMapY;

			this.game.world.setBounds(newMapX, newMapY, SCREEN_WIDTH, SCREEN_HEIGHT);
			Darkness.adjustCamera(newMapX, newMapY);
		}
		this.d.update();

		this.hud.update();

		this.checkSwitchFocus();
	}

	checkSwitchFocus() {
		var keyToProbleIdx:number[] = [Phaser.Keyboard.A, Phaser.Keyboard.S, Phaser.Keyboard.D];

		for (var i = 0; i < keyToProbleIdx.length; i++) {
			if (this.game.input.keyboard.isDown(keyToProbleIdx[i])) {
				var probe:Probe = this.hud.probeList.getProble(i);

				if (probe && !probe.inInventory) {
					this.currentFocus = probe;

					return;
				}
			}
		}

		if (this.game.input.keyboard.isDown(Phaser.Keyboard.C)) {
			this.currentFocus = this.p;
		}
	}
}

class Light extends Phaser.Sprite {
	constructor(a, b, c, d, e) {
		super(a, b, c, d, e);

		Darkness.addLight(this);
	}
}

class Cell extends Phaser.Sprite {
	container:Phaser.Group;
	isOn:boolean = true;
	body:Phaser.Physics.Arcade.Body;

	constructor(game:Phaser.Game, container:Phaser.Group) {
		super(game, 0, 0, "bw", 0);

		game.physics.enable(this, Phaser.Physics.ARCADE);
		this.container = container;
		this.container.add(this);
		this.body.immovable = true;
	}

	// collision off, light on. 
	off() {
		if (this.isOn) {
			this.container.remove(this);
			this.frame = 1;
			this.isOn = false;
		}
	}

	// collision on, light off. (ARGH!)
	on() {
		if (!this.isOn) {
			this.container.add(this);
			this.frame = 0;
			this.isOn = true;
		}
	}
}

class Darkness {
	game:Phaser.Game;
	static cells:Cell[][];
	static mapX:number = 0;
	static mapY:number = 0;
	static staticLightbearer:Phaser.Sprite[] = [];
	static lightbearers:Probe[] = [];
	static player:Player;
	static walls:Phaser.TilemapLayer;

	static collideGroup:Phaser.Group;

	constructor(game:Phaser.Game) {
		this.game = game;

		Darkness.collideGroup = new Phaser.Group(this.game);

		Darkness.cells = [];
		for (var i = 0; i < MAP_WIDTH; i++) {
			Darkness.cells[i] = [];
			for (var j = 0; j < MAP_HEIGHT; j++) {
				var cell:Cell = new Cell(game, Darkness.collideGroup);
				Darkness.cells[i][j] = cell;
				Darkness.cells[i][j].x = i * 25;
				Darkness.cells[i][j].y = j * 25;
			}
		}

		this.game.add.existing(Darkness.collideGroup);
	}

	static addProbe(bearer:Probe) {
		Darkness.lightbearers.push(bearer);
	}

	static addLight(light:Phaser.Sprite) {
		Darkness.staticLightbearer.push(light);
	}

	static addPlayer(player:Player) {
		Darkness.player = player;
	}

	static adjustCamera(mapX:number, mapY:number) {
		if (mapX != Darkness.mapX || mapY != Darkness.mapY) {

			for (var i = 0; i < MAP_WIDTH; i++) {
				for (var j = 0; j < MAP_HEIGHT; j++) {
					var c:Cell = Darkness.cells[i][j];

					//to relative position
					c.x -= Darkness.mapX;
					c.y -= Darkness.mapY;

					//to new position
					c.x += mapX;
					c.y += mapY;
				}
			}

			Darkness.mapX = mapX;
			Darkness.mapY = mapY;
		}
	}

	xyToCell(x:number, y:number) {
		x -= Darkness.mapX;
		y -= Darkness.mapY;

		var i = Math.floor(x / 25);
		var j = Math.floor(y / 25);

		if (i >= 0 && j >= 0 && i < Darkness.cells.length && j < Darkness.cells[i].length) 
			return Darkness.cells[i][j];
		return null;
	}

	raycastAround(target:Phaser.Sprite, radius:number = 100) {
		for (var i = target.x - radius; i < target.x + radius; i += 25){
			for (var j = target.y - radius; j < target.y + radius; j += 25) {
				var cell = this.xyToCell(i, j);
				if (cell) {
					cell.off();
				}
			}
		}
	}

	update() {
		var player:Player = Darkness.player;

		for (var i = 0; i < Darkness.cells.length; i++) {
			for (var j = 0; j < Darkness.cells[i].length; j++) {
				Darkness.cells[i][j].on();
			}
		}

		// this.raycastAround(Darkness.player);

		for (var i = 0; i < Darkness.lightbearers.length; i++) {
			var p:Probe = Darkness.lightbearers[i];
			if (!p.inInventory) {
				if (this.game.world.bounds.contains(p.x, p.y)) {
					this.raycastAround(Darkness.lightbearers[i]);
				}
			}
		}

		for (var i = 0; i < Darkness.staticLightbearer.length; i++) {
			var l:Phaser.Sprite = Darkness.staticLightbearer[i];

			if (this.game.world.bounds.contains(l.x, l.y)) {
				this.raycastAround(l, 150);
			}
		}
	}
}

class Target extends Phaser.Sprite {
	currentTarget:Phaser.Sprite;
	ticks:number = 0;
	game:Phaser.Game;

	constructor(game:Phaser.Game) {
		super(game, 0, 0, "target", 0);

		this.game = game;
		this.anchor.x = 0.5;
		this.anchor.y = 0.5;

		this.scale.x = 1.5;
		this.scale.y = 1.5;
	}

	update() {
		this.ticks += 0.03;

		this.rotation = this.ticks;

		this.currentTarget = MainState.getMainState(this.game).currentFocus;

		this.x = this.currentTarget.x + 12;
		this.y = this.currentTarget.y + 12;
	}
}

class FollowText extends Phaser.Text {
	follow:Phaser.Sprite;
	fullText:string = "";
	ticks:number = 0;

	constructor(game:Phaser.Game, follow:Phaser.Sprite, content:string) {
		super(game, 0, 0, "", {fill: "#ffffff", font: "15px Arial"});

		this.follow = follow;
		this.fullText = content + "        "; // pad it out to make it display longer. haxhaxhax

		this.game.add.existing(this);

		this.setShadow(3, 3, 'rgba(0,0,0,1)',0);
	}

	update() {
		this.x = this.follow.x;
		this.y = this.follow.y - 15;
		this.ticks++;

		if (this.ticks % 6 == 0) {
			if (this.text.length >= this.fullText.length) {
				this.destroy();
			} else {
				this.text += this.fullText[this.text.length - 1]; //no idea why -1 is reuired.
			}
		}
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

class DialogBox extends Phaser.Sprite {
	static DIALOG_WIDTH:number = 400;
	static DIALOG_HEIGHT:number = 200;

	text:Phaser.Text;
	dialog:string[];

	currentText:string = ""; // entire text (not all may be visible)
	shownTextLength:number = 0;
	ticks:number = 0;

	constructor(game:Phaser.Game, dialog:string[]) {
		super(game, 300, 200, "dialog", 0);

		this.fixedToCamera = true;
		this.dialog = dialog;

		var wordWrapWidth = DialogBox.DIALOG_WIDTH - 10 * 2;
	    var style = { wordWrapWidth:wordWrapWidth, font: "15px Arial", wordWrap: true, fill: "#000000" };
		this.text = new Phaser.Text(game, 10, 10, "", style);

		this.addChild(this.text);

		var pressXText = new Phaser.Text(game, DialogBox.DIALOG_WIDTH - 100, DialogBox.DIALOG_HEIGHT - 20, "Press X", {fill: "#000000", font: "15px Arial", align: "right", wordWrapWidth: 100});
		this.addChild(pressXText);

		var advanceButton = game.input.keyboard.addKey(Phaser.Keyboard.X);
		advanceButton.onDown.add(this.advanceText, this);

		this.advanceText();
	}

	advanceText() {
		if (this.dialog.length == 0) {
			this.destroy(true);
		} else if (this.shownTextLength >= this.currentText.length) {
			this.currentText = this.dialog.shift();
			this.shownTextLength = 0;
			this.text.text = "";
		}
	}

	update() {
		++this.ticks;

		if (this.shownTextLength < this.currentText.length && (this.ticks % 5 == 0 || this.game.input.keyboard.justPressed(Phaser.Keyboard.X))) {
			this.shownTextLength++;
			this.text.text = this.currentText.substring(0, this.shownTextLength);
		}
	}
}

class DialogObserver {
	static NO_PROBES:number = 2;

	static dialogs: {[key: number]: string[]; } = DialogObserver.dialog();

	static dialog(): {[key:number]: string[]; } {
		var dialogDict: {[key:number]: string[]; } = {};

		dialogDict[1] = ["Dialog maybe works."];
		dialogDict[DialogObserver.NO_PROBES] = ["No probles left.", ":("];

		return dialogDict;
	}

	static signal(game:Phaser.Game, dialogID:number) {
		var dialogs:string[] = DialogObserver.dialogs[dialogID];

		if (!dialogs) {
			console.error("no dialog with " + dialogID + " found.");
			return;
		}

		var d:DialogBox = new DialogBox(game, dialogs.slice(0));
		game.add.existing(d);
	}
}

class Probe extends Entity {
	private dx:number = 0;
	private dy:number = 0;
	energy:number = 100;
	inInventory:boolean = true;

	static existingProbes:Probe[] = [];
	static MAX_PROBES:number = 3;
	static probesActive:number = 0;

	static nearbyProbesTo(s:Phaser.Sprite):Probe[] {
		var pickedUp:boolean = false;
		var result:Probe[] = [];

		// see if we can find a probe to pick up first.

		for (var i = 0; i < Probe.existingProbes.length; i++) {
			var p:Probe = Probe.existingProbes[i];

			if (p.inInventory) continue;

			var dist:number = Phaser.Math.distance(s.x, s.y, p.x, p.y);

			if (dist < 50) {
				result.push(p);
			}
		}

		return result;
	}

	static addProbeToInventory(game:Phaser.Game, x:number, y:number, dx:number, dy:number=0):Probe {
		var p:Probe = new Probe(game, x, y, dx, dy, Probe.probesActive++);

		Probe.existingProbes.push(p);
		Darkness.addProbe(p);
		return p;
	}

	static findProbeToShoot(game:Phaser.Game) {
		for (var i = 0; i < Probe.existingProbes.length; i++) {
			if (Probe.existingProbes[i].inInventory) {
				var result:Probe = Probe.existingProbes[i];
				result.visible = true;
				return result;
			}
		}

		DialogObserver.signal(game, DialogObserver.NO_PROBES);

		return null;
	}

	pickup() {
		this.inInventory = true;
	}

	constructor(game:Phaser.Game, x:number, y:number, dx:number, dy:number, probeId:number) {
		super(game, "probe");

		this.body.allowGravity = true;

		this.body.gravity.x = 0;
		this.body.gravity.y = 200;

		this.body.bounce.y = .3;
		this.body.bounce.x = .3;

		this.body.collideWorldBounds = true;

		this.setd(dx, dy);

		this.x = x;
		this.y = y;

		MainState.getMainState(game).hud.signal(HUD.NEW_PROBLE, this);
	}

	setd(dx:number, dy:number) {
		this.dx = dx;
		this.dy = dy;

		this.body.velocity.x = dx * 200;
		this.body.velocity.y = -100 + dy * 500;
	}

	update() {
		this.visible = !this.inInventory;

		if (this.inInventory) {
			return;
		}

		if (this.body.blocked.down) {
			this.body.velocity.x *= .8;

			if (Math.abs(this.body.velocity.x) < 5) {
				this.body.velocity.x = 0;
			}
		}

		if (MainState.getMainState(this.game).currentFocus != this) return;

		if (keyboard.isDown(Phaser.Keyboard.LEFT) && this.energy > 0) {
			this.body.velocity.x = -300;
			this.energy -= 3;
		} else if (keyboard.isDown(Phaser.Keyboard.RIGHT) && this.energy > 0) {
			this.body.velocity.x = 300;
			this.energy -= 3;
		} else {
			this.body.velocity.x = 0;
		}
	}
}

class Bar extends Phaser.Sprite {
	static BAR_WIDTH:number = 100;

	barValue:number;
	barMaxValue:number;

	constructor(game:Phaser.Game, value:number, maxValue:number) {
		super(game, 0, 0, "energybar");

		this.barMaxValue = maxValue;
		this.setValue(value);
	}

	setValue(width:number) {
		if (width != this.barValue) {
			if (width <= 0) {
				this.visible = false;
				return;
			}

			this.visible = true;
			this.barValue = width;
			var cropWidth = (Bar.BAR_WIDTH * (this.barValue / this.barMaxValue));
			var crop:Phaser.Rectangle = new Phaser.Rectangle(0, 0, cropWidth, 10);
			this.crop(crop);
		}
	}
}

class YouIndicator extends Phaser.Sprite {
	msg:Phaser.Sprite;

	constructor(game:Phaser.Game) {
		super(game, 25, 25, "hud-probe", 4);

		this.msg = new Phaser.Sprite(game, 25, -25, "hud-msg-c");
		this.addChild(this.msg);
		game.add.existing(this);

		this.fixedToCamera = true;
	}
}

class ProbeIndicator extends Phaser.Sprite {
	static HAPPY:number = 0;
	static OK:number = 1;
	static SAD:number = 2;
	static HIDDEN:number = 3;

	static WIDTH = 110;

	happinessLevel:number = 0;
	probe:Probe = null;
	msg:Phaser.Sprite;
	energybar: Bar;
	which:number;

	constructor(game:Phaser.Game, which:number, probe:Probe) {
		super(game, 125 + which * ProbeIndicator.WIDTH, 25, "hud-probe", 3);

		this.probe = probe;
		this.which = which;
		this.happinessLevel = ProbeIndicator.HIDDEN;

		var whichMsg:string = ["a", "s", "d"][this.which];

		this.msg = game.add.sprite(25, -25, "hud-msg-" + whichMsg);
		this.addChild(this.msg);

		this.energybar = new Bar(this.game, 100, 100);
		this.addChild(this.energybar);
		this.energybar.x = 0;
		this.energybar.y = 30;
	}

	update() {
		this.msg.visible = !this.probe.inInventory;
		this.energybar.visible = !this.probe.inInventory;
		this.energybar.setValue(this.probe.energy);

		if (this.probe.inInventory) {
			this.frame = 3;
		} else {
			this.frame = 0;
		}

		if (this.probe.energy <= 0) {
			this.msg.loadTexture("hud-msg-zzz", 0);
		}
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
	}

	addAliveProble(newProbe:Probe) {
		var newIndicator = new ProbeIndicator(this.game, this.orderedProbeList.length, newProbe);

		this.contents.add(newIndicator);
		this.orderedProbeList.push(newIndicator);
		newIndicator.visible = true;
	}

	getProble(idx:number) {
		return this.orderedProbeList[idx].probe;
	}

	update() {
		for (var i = 0; i < this.orderedProbeList.length; i++) {
			this.orderedProbeList[i].update()	;
		}
	}
}

class HUD {
	game:Phaser.Game;
	probeList:ProbeList;
	youIndicator:YouIndicator;
	zHint:Phaser.Text;

	static NEW_PROBLE:number = 0;

	constructor(game:Phaser.Game) {
		this.game = game;
		this.probeList = new ProbeList(game);
		this.youIndicator = new YouIndicator(game);

		this.zHint = new Phaser.Text(game, 25, 60, "Z: Die.", {fill: "#ffffff", font: "15px Arial"});
		this.zHint.fixedToCamera = true;
		this.game.add.existing(this.zHint);
	}

	signal(val:number, extra:any) {
		if (val == HUD.NEW_PROBLE) {
			this.probeList.addAliveProble(<Probe> extra);
		}
	}

	update() {
		this.probeList.update();

		if (Probe.nearbyProbesTo(MainState.getMainState(this.game).p).length > 0) {
			this.zHint.text = "Z: Pick up probe.";
		} else {
			this.zHint.text = "Z: Shoot probe.";
		}
	}

	addProbeIndicators() {
	}
} 

class Player extends Entity {
	facing:number;
	numStartingProbles:number = 2;

	constructor(game:Phaser.Game) {
		super(game, "player");

		this.body.gravity = new Phaser.Point(0, 1600);

		var fireButton = game.input.keyboard.addKey(Phaser.Keyboard.Z);
		fireButton.onDown.add(this.fireProbe, this);
	}

	fireProbe():void {
		var dx = this.facing;
		var nearProbes:Probe[] = Probe.nearbyProbesTo(this);

		for (var i = 0; i < nearProbes.length; i++) {
			nearProbes[i].pickup();
		}

		if (nearProbes.length > 0) return; // either pick up or shoot, not both.

		var p:Probe = Probe.findProbeToShoot(this.game);
		if (!p) return;

		p.inInventory = false;

		p.x = this.x;
		p.y = this.y;
		p.setd(this.facing, 0);

		var cuteSayings:string[] = ["wheeee!", "into the darkness!", "it's nice to find friends down here!", "this is fun!", ":3     ", ":D     ", "yay!", "thanks for finding me!", "together, we can do it!"];
 		new FollowText(this.game, p, cuteSayings[Math.floor(Math.random() * cuteSayings.length)]);
	}

	update():void {
		for (var i = 0 ; i < this.numStartingProbles; i++) {
			Probe.addProbeToInventory(this.game, this.x, this.y, 0, 0);
		}

		this.numStartingProbles = 0;

		if (MainState.getMainState(this.game).currentFocus != this) return;

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