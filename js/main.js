/// <reference path="../d/phaser.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var cursors;

var Player = (function (_super) {
    __extends(Player, _super);
    function Player(game) {
        _super.call(this, game, 0, 0, "player", 0);

        game.physics.enable(this, Phaser.Physics.ARCADE);
    }
    Player.prototype.update = function () {
        if (cursors.left.isDown) {
            this.body.velocity.x = -300;
        } else if (cursors.right.isDown) {
            this.body.velocity.x = 300;
        } else {
            this.body.velocity.x = 0;
        }
    };
    return Player;
})(Phaser.Sprite);

var MainState = (function (_super) {
    __extends(MainState, _super);
    function MainState() {
        _super.apply(this, arguments);
    }
    MainState.prototype.preload = function () {
        this.load.spritesheet("player", "assets/player.png", 25, 25, 1, 0, 0);
    };

    MainState.prototype.init = function () {
    };

    MainState.prototype.create = function () {
        cursors = this.game.input.keyboard.createCursorKeys();

        var p = new Player(this.game);

        this.game.add.existing(p);
        //this.game.add.sprite(0, 0, "player");
    };

    MainState.prototype.update = function () {
    };
    return MainState;
})(Phaser.State);

var Game = (function () {
    function Game() {
        this.state = new MainState();
        this.game = new Phaser.Game(800, 600, Phaser.WEBGL, "main", this.state);
    }
    return Game;
})();

new Game();
