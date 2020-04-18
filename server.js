var express = require('express');
var publicDir = require('path').join(__dirname,'/public');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;


var userList = []

var game = {}

app.get('/', function(req, res){res.sendFile(__dirname + '/views/index.html')});
app.get('/game/:room([A-Za-z0-9]{6})', function(req, res){res.sendFile(__dirname + '/views/game.html')});
app.use(express.static(publicDir));
app.use('/public/images', express.static(__dirname + '/public/images'));
app.use('/public/js', express.static(__dirname + '/public/js'));


io.on('connection', function(socket){

    socket.on("set-username", function(name){
        socket.username = name
    })

    socket.on("create-user", function(username){
        socket.color = Math.floor(Math.random()*16777215).toString(16);
        socket.username = username
        userList.push({username: socket.username, color: socket.color});
        socket.emit("connection", socket.username, socket.color);
        io.emit('new user', socket.color, socket.username)
        io.emit('update userlist', userList)

        var table = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
        var hash = '';
        for(var i=0; i<6; i++) {
            hash += table.charAt(Math.floor(Math.random()*table.length));
        }
        join_room(hash)
        console.log("Player 2 "+socket.username)
        game.player1 = socket.username
        game.code = hash
        game.value = 1
        game.won = false
        game.board = [[0,0,0,0,0,0,0],
					  [0,0,0,0,0,0,0],
					  [0,0,0,0,0,0,0],
					  [0,0,0,0,0,0,0],
					  [0,0,0,0,0,0,0],
					  [0,0,0,0,0,0,0]]
    })

    socket.on('join-room-player2', function(data) {
        join_room(data.code)
        console.log("Player 2 "+socket.username)
        game.player2 = socket.username
        game.room = socket.room
        game.turn = game.player1
        game.color = "red"
        io.to(game.room).emit('create-game')
        io.to(game.room).emit("go-to-game", socket.code)
    })

    socket.on('create-game', function(){
        app.get('/game/', function(req, res){
            res.writeHead(302, { 'Location': '/game/'+socket.code });
            res.end();
        })
    })

    socket.on("join-room", function(){
        socket.join(game.room)
    })

    socket.on('load-player-names', function(){
        io.to(game.room).emit("update-player-1-name", game.player1)
        io.to(game.room).emit("update-player-2-name", game.player2)
        io.to(game.room).emit("update-current-player", game.turn)
    })

    socket.on("chip-mouseover", function(id){
        if(game.turn == socket.username){
            io.to(game.room).emit("update-chip-mouseover", id)
        }
    })

    socket.on("board-clicked", function(data){
        var c = ""
        if(game.turn == socket.username && game.won!= true){
            var valid = false
            var column = data.col.substring(4,data.col.length) - 1
            var row;
            for (row = game.board.length - 1; row >= 0; row--) {
                if(game.board[row][column] == 0){
                    game.board[row][column] = game.value
                    valid = true
                    break;
                }
            }
            row += 1;
            column += 1;
            c = row+"-"+column
            console.log(c)
            if(valid){
                if(socket.username == game.player1){
                    c = "<div id='"+c+"' class='chip order-1 chip-red'></div>"
                    io.to(game.room).emit("add-chip-to-column", data.col, c)
                    if(check_for_winner(game.board, game.value)){
                        game.won = true
                        io.to(game.room).emit("game-won", game.turn)
                    }
                    game.turn = game.player2
                    game.value = 2
                }else{
                    c = "<div id='"+c+"' class='chip order-1 chip-yellow'></div>"
                    io.to(game.room).emit("add-chip-to-column", data.col, c)
                    if(check_for_winner(game.board, game.value)){
                        game.won = true
                        io.to(game.room).emit("game-won")
                    }
                    game.turn = game.player1
                    game.value = 1
                }
                io.to(game.room).emit("update-current-player", game.turn)
            }else{
                socket.emit("invlid-chip")
            }

        }
    })

    socket.on('disconnect', function(){
        for (var i=0; i<userList.length; i++){
            if ( userList[i].username === socket.username) {
                io.emit('left user', userList[i].color, userList[i].username)
                userList.splice(i, 1);
            }
        }
        io.emit('update userlist', userList)
    });

    function print_board(board){
        for (var row=0; row<board.length; row++) {
            var x = ""
            for(var column=0; column<board[row].length; column++){
                x += board[row][column]+" "
            }
            console.log(x)
            x = ""
        }
    }

    function join_room(code){
        socket.leave(socket.room)
        socket.code = code
        socket.join("room-"+socket.code)
        socket.room = "room-"+socket.code
        socket.emit("display-code", socket.code)
    }

    function check_for_winner(board, value){
        for(var x=0;x<board.length;x++){
            var win = check_row(board[x], value)
            if (win == true){
                return true
            }
        }

        var flipBoard = flip_board(board)
        for(var x=0;x<flipBoard.length;x++){
            var win = check_row(flipBoard[x], value)
            if (win == true){
                return true
            }
        }

        for(var x=0;x<board.length;x++){
            for(var y =0;y<board[x].length;y++){
                if(check_diagonal(board,x,y)){
                    return true;
                }
            }
        }
        return false
    }

    function flip_board(board){
        return board[0].map(function(col, i) {
            return board.map(function(row) {
                return row[i];
            });
        });
    }

    function check_diagonal(board, row, column) {
    var result = false;

    if(board[row][column] != 0) {
        // there are four possible directions of a win
        // if the top right contains a possible win
        if(row - 3 > -1 && column + 3 < 6) {
            result = board[row][column] == board[row - 1][column + 1] &&
                     board[row][column] == board[row - 2][column + 2] &&
                     board[row][column] == board[row - 3][column + 3];
        }
        // if the bottom right contains possible win
        if(row + 3 < 7  && column + 3 < 6) {
            result = board[row][column] == board[row + 1][column + 1] &&
                     board[row][column] == board[row + 2][column + 2] &&
                     board[row][column] == board[row + 3][column + 3];
        }
        // if the bottom left contains possible win
        if(row + 3 < 7 && column - 3 > -1) {
            result = board[row][column] == board[row + 1][column - 1] &&
                     board[row][column] == board[row + 2][column - 2] &&
                     board[row][column] == board[row + 3][column - 3];
        }
        // if the top left contains a possible win
        if(row - 3 > -1 && column - 3 > -1) {
            result = board[row][column] == board[row - 1][column - 1] &&
                     board[row][column] == board[row - 2][column - 2] &&
                     board[row][column] == board[row - 3][column - 3];
        }
    }

    return result;
}


    function check_row(row, value){
        var count = 0;
        for (var i=0; i<row.length; i++) {
            if (row[i] == value) {
                count++;
            } else {
                count = 0;
            }
            if (count == 4) {
                return true
            }
        }
        return false
    }

});

http.listen(port, function(){
  console.log('listening on *:'+ port);
});
