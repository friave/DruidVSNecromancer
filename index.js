const ws = new WebSocket('ws://localhost:5555');
const canvas = document.getElementById("game");
const ctx = canvas.getContext('2d');  

let playerId = sessionStorage.getItem('playerId');
let playerType = sessionStorage.getItem('playerType');
let gameId = sessionStorage.getItem('gameId');
let HP = sessionStorage.getItem('HP');

/*
//INPUT IMAGES

const bg = new Image();
bg.src = "./bg.png";
bg.onload = function() {
    ctx.drawImage(bg, 0,0);
};

const druid = new Image();
druid.src = "./druid.png";
druid.onload = function() {
    ctx.drawImage(druid,50,150);
};

const necro = new Image();
necro.src = "./necromancer.png";
necro.onload = function() {
    ctx.drawImage(necro, 570,150);
};
ctx.fillStyle = '#000000';
ctx.font = "48px Arial";
ctx.fillText("Waiting for other player", 150, 100);
*/

ctx.fillStyle = '#4DBFFD'; //sky
ctx.fillRect(0, 0, canvas.width, 400);

ctx.fillStyle = '#198238'; //ground
ctx.fillRect(0, 400, canvas.width, 200);
let buttons= [];

class Button {
    constructor(text, fillColor, textColor, x, y, width, height){
        this.text = text;
        this.fillColor = fillColor;
        this.textColor = textColor;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    setPosition(x,y){
        this.x = x;
        this.y = y;
    }

    setSize(width, height){
        this.width = width;
        this.height = height;
    }

    draw(c){
        c.fillStyle = this.fillColor;
        c.fillRect(this.x, this.y, this.width, this.height);

        c.fillStyle = this.textColor;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = '25px arial';
        c.fillText(this.text, this.x + this.width / 2, this.y + this.height / 2, this.width);
    }

    inBounds(mouseX, mouseY){
        return !(mouseX < this.x || mouseX > this.x + this.width || mouseY < this.y || mouseY > this.y + this.height);
      }
}


function connectToGame() {
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
        if (playerId && playerType && gameId){
            ws.send(translate_to_binary('reconnect',{playerId}));
        }
        else{
            enterGameInfo();
        };
    }

    ws.onmessage = (event) => {
        const msg = translate_to_text(new Uint8Array(event.data));

        if (msg.type === 'game_info'){
            sessionStorage.setItem('gameId', msg.gameId);
            sessionStorage.setItem('playerId', msg.playerId);
            sessionStorage.setItem('playerType', msg.playerType);
            sessionStorage.setItem('HP', msg.HP);
        }

        if (msg.type === 'start_game'){
            init();
        }

        if (msg.type === 'class_error'){
            alert(msg.msg);
            chooseClass(msg.gameId);
        }

        if (msg.type === 'reconnect'){
            sessionStorage.setItem('gameId', msg.gameId);
            sessionStorage.setItem('playerId', msg.playerId);
            sessionStorage.setItem('playerType', msg.playerType);
            if (playerType === 'd'){
                sessionStorage.setItem('HP', msg.d_hp);
            }
            else{
                sessionStorage.setItem('HP', msg.n_hp);
            }
            init();
            changePlayerInfo('d', d_hp);
            changePlayerInfo('n', n_hp);
        }

        if (msg.type === 'player_update'){
            changePlayerInfo(msg.attackedPlayer, msg.HP);
        }

        if (msg.type === 'game_over'){
            gameOver(msg.beaten);
        }

        if (msg.type === 'turn_error'){
            alert(msg.msg);
        }
        console.log(msg);
    }
}

function enterGameInfo(){
    gameId = prompt('Do you have name of the game you want to join? Leave empty if you want to play random game');
    chooseClass(gameId);
}

function chooseClass(gameId){
    playerType = prompt('Would you like to play as druid(d) or necromancer(n)?');

    if (playerType !== 'd' &&  playerType !== 'n' ){
        chooseClass(gameId)
    }
    ws.send(translate_to_binary('join', {gameId, playerType}));
}

function changePlayerInfo(player, HP){
    if (player === 'd'){
        ctx.fillStyle = ('#4DBFFD');
        ctx.fillRect(50, 50, 25, 20); 
        ctx.fillStyle = '#000000';
        ctx.font = "18px Arial";
        ctx.fillText(HP, 60, 65);
    }
    else{
        ctx.fillStyle = ('#4DBFFD');
        ctx.fillRect(680, 50, 25, 20);
        ctx.fillStyle = '#000000';
        ctx.font = "18px Arial";
        ctx.fillText(HP, 690, 65);
    }
}

function gameOver(beaten){
    changePlayerInfo(beaten, 0);

    ctx.fillStyle = '#198238';
    ctx.fillRect(0, 400, canvas.width, 200);

    buttons.forEach(button => button.onClick = () => void(0));

    ctx.fillStyle = '#000000';
    ctx.font = "25px Arial";
    if (beaten === 'd'){
        ctx.fillText("Necromancer is a winner!", 395, 270);
    }else{
        ctx.fillText("Druid is a winner!", 400, 270);
    }
}

function init(){
    ctx.fillStyle = '#43EB4A';
    ctx.fillRect(80,180, 150, 220);

    ctx.fillStyle = '#3D3D3D';
    ctx.fillRect(570,180, 150, 220);

    let b1;
    let b2 = new Button('(place holder)', "#7A0000", "#FFFFFF", 230, 465, 150,80);
    let b3 = new Button('(place holder)', "#7A0000", "#FFFFFF", 419, 465, 150,80);
    let b4 = new Button('(place holder)', "#7A0000", "#FFFFFF", 608, 465, 150,80);

    if (playerType === 'd'){
        b1 = new Button('Vine whip', "#7A0000", "#FFFFFF", 41, 465, 150,80);
    }else{
        b1 = new Button('Leech Life', "#7A0000", "#FFFFFF", 41, 465, 150,80);
    }

    b1.onClick = () => ws.send(translate_to_binary("action", {action: 1}));
    b2.onClick = () => ws.send(translate_to_binary("action", {action: 2}));
    b3.onClick = () => ws.send(translate_to_binary("action", {action: 3}));
    b4.onClick = () => ws.send(translate_to_binary("action", {action: 4}));

    buttons.push(b1);
    buttons.push(b2);
    buttons.push(b3);
    buttons.push(b4);

    ctx.fillStyle = '#000000';
    ctx.font = "20px Arial";
    ctx.fillText("Druid", 20, 50);
    ctx.fillText("Necromancer", 650, 50);
    ctx.font = "18px Arial";
    ctx.fillText("HP:"+20, 20, 70);
    ctx.fillText("HP:"+20, 650, 70);
    buttons.forEach(button => button.draw(ctx));

}

canvas.addEventListener('click', (event) => {
    let x = event.pageX - (canvas.clientLeft + canvas.offsetLeft);
    let y = event.pageY - (canvas.clientTop + canvas.offsetTop);
    
    buttons.forEach(b => {
      if (b.inBounds(x, y) && !!b.onClick) b.onClick();
    });
  });

function translate_to_binary(type, msg) {
    if (type === 'join'){
        let temp_gameId = msg.gameId;
        let temp_playerType = msg.playerType.charCodeAt(0);
        let buffer;
        let view;
        if (temp_gameId === null){
            buffer = new ArrayBuffer(3);
            view = new Uint8Array(buffer);
            view[0] = 1;
            view[1] = temp_playerType;
            view[2] = 0;
        }else{
            buffer = new ArrayBuffer(3 + temp_gameId.length);
            view = new Uint8Array(buffer);
            view[0] = 1;
            view[1] = temp_playerType;
            view[2] = temp_gameId.length;
            for (let i=0; i < temp_gameId.length; i++){
                view[i + 3]=temp_gameId.charCodeAt(i);
            }
        }
        return buffer;
    }
    if (type === 'reconnect'){
        const temp_playerId = msg.playerId;
        const playerIdLen =  temp_playerId.length;
        const buffer = new ArrayBuffer(1 + playerIdLen);
        const view = new Uint8Array(buffer);
        view[0] = 2;
        for (let i =0; i< playerIdLen; i++){
            view[i + 1] = temp_playerId.charCodeAt(i);
        }
        return buffer;
    }
    if (type === 'action'){
        let playerIdLen = playerId.length;
        const buffer = new ArrayBuffer(2 + playerIdLen);
        const view = new Uint8Array(buffer);
        view[0] = 3;
        switch(msg.action) {
            case 1:
                view[1] = 1;
                break;
            case 2:
                view[1] = 2;
                break;
            case 3:
                view[1] = 3;
                break;
            case 4:
                view[1] = 4;
                break;
          }     
        for (let i =0; i< playerIdLen; i++){
            view[i + 2] = playerId.charCodeAt(i);
        }
   
        return buffer;
    }

}

function translate_to_text(bin_msg) {
    const type = bin_msg[0]

    if (type === 1){
        const gameIdLen = bin_msg[1];
        const gameId = String.fromCharCode(...bin_msg.slice(2, 2 + gameIdLen));
        const msg = String.fromCharCode(...bin_msg.slice(2+gameIdLen));
        return { type: 'class_error', msg, gameId };
    }
    if (type === 2){
        const gameIdLen = bin_msg[1];
        gameId = String.fromCharCode(...bin_msg.slice(2, 2 + gameIdLen));
        const playerIdLen = bin_msg[2 + gameIdLen];
        var offset = 3 + gameIdLen;
        playerId = String.fromCharCode(...bin_msg.slice(offset, offset + playerIdLen));
        playerType = String.fromCharCode(bin_msg[offset + playerIdLen]);
        HP = bin_msg[1 + offset + playerIdLen]
        return { type: 'game_info', gameId, playerId, playerType, HP};
    }
    if (type === 3){
        const attackedPlayer =  String.fromCharCode(bin_msg[1]);
        const HP = bin_msg[2];
        return { type: 'player_update', 'attackedPlayer': attackedPlayer, 'HP': HP};
    }
    
    if (type === 4){
        return { type: 'game_over', 'beaten': String.fromCharCode(bin_msg[1])};
    }

    if (type === 5){
        const msg = String.fromCharCode(...bin_msg.slice(1));
        return {type: 'start_game', msg};
    }

    if (type === 6){
        const gameIdLen = bin_msg[1];
        gameId = String.fromCharCode(...bin_msg.slice(2, 2 + gameIdLen));
        const playerIdLen = bin_msg[2 + gameIdLen];
        var offset = 3 + gameIdLen;
        playerId = String.fromCharCode(...bin_msg.slice(offset, offset + playerIdLen));
        playerType = String.fromCharCode(bin_msg[offset + playerIdLen]);
        d_hp = bin_msg[1 + offset + playerIdLen];
        n_hp = bin_msg[2 + offset + playerIdLen];
        return { type: 'reconnect', gameId, playerId, playerType, d_hp, n_hp};
    }

    if (type === 7){
        const msg = String.fromCharCode(...bin_msg.slice(1));
        return {type: 'turn_error', msg};
    }
}



connectToGame();


