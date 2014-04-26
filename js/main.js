/// <reference path="../bower_components/phaser/phaser.d.ts" /
var Game = (function () {
    function Game() {
        this.game = new Phaser.Game(this, 'mygame', 800, 480, init, create, update);
    }
    Game.prototype.init = function () {
    };

    Game.prototype.create = function () {
    };

    Game.prototype.update = function () {
    };
    return Game;
})();
