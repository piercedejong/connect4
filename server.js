var express = require('express');
var publicDir = require('path').join(__dirname,'/public');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;


var userList = []
var waiting = {username:"", code:""}
var games = []

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
        console.log("Create User")
        socket.username = username

        var table = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
        var code = '';
        for(var i=0; i<6; i++) {
            code += table.charAt(Math.floor(Math.random()*table.length));
        }
        join_room(code)

        var nameTaken = false
        var x = 0
        for(var i= 0; i<userList.length; i++){
            if ( userList[i].username == username) {
                nameTaken = true;
                x = i;
            }
        }
        if(nameTaken){
            userList[x].code = socket.code
        }else{
            userList.push({username: socket.username, code: socket.code});
        }
        console.log(userList)
        socket.emit("connection", socket.username);
        // io.emit('new user', socket.color, socket.username)
        // io.emit('update userlist', userList)

        // remove_player_from_all_games(socket.username)
        // games.push(game)
    })

    socket.on('disconnect', function(){
        //disconnect(game.room)
    });

    socket.on("update-username",function(username){
        var taken = false;
        for(user in userList){
            if(user === username){
                taken = true
            }
        }
        if(taken == false){
            if(waiting.username === socket.username){
                waiting.username = username
            }
            socket.username = username
            socket.emit("username-updated", username)
        }else{
            socket.emit("username-update-failed", socket.username)
        }
    })

    socket.on("join-random-match",function(){
        if(waiting.username ===""){
            waiting.username = socket.username
            waiting.code = socket.code

        }else if(waiting.username !== socket.username){
            create_game(waiting.code)
            waiting.username = ""
            waiting.code = ""
        }
    })

    socket.on('join-room-player2', function(code) {
        if(code !== socket.code){
            create_game(code)
        }else{
            socket.emit("cant-join-own-room")
        }
    })

    function disconnect(room){
        //io.to(game.room).emit("game-disconnect")
        console.log("disconnect "+socket.username)
        for (var i=0; i<userList.length; i++){
            if ( userList[i].username === socket.username) {
                io.emit('left user', userList[i].color, userList[i].username)
                userList.splice(i, 1);
            }
        }
        io.emit('update userlist', userList)
    }

    function create_game(code){
        console.log("Join Room Player 2")
        join_room(code)
        //remove_player_from_all_games(socket.username)

        var g = {}
        var player1 = ""
        for (var i=0; i < userList.length; i++) {
             if (userList[i].code === code) {
                 player1 = userList[i].username
                 break
             }
         }
        g.player1 = player1
        g.code = socket.code
        g.room = socket.room
        g.player2 = socket.username
        g.room = socket.room
        g.turn = (Math.floor(Math.random()*2)==0) ? g.player1 : g.player2;
        g.color = "chip-red"
        g.value = 1
        g.won = false
        g.board = [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]]

        console.log(g)

        games.push(g)

        io.to(g.room).emit('create-game-room')
        io.to(g.room).emit("go-to-game-room", socket.code)
    }

    // Delete any game the current user is alredy in
    function remove_player_from_all_games(username){
        games.forEach(function (g) {
            if(g.player1 === username || g.player2 === username){
                disconnect(g.room)
                const index = games.indexOf(g);
                games.splice(index,1)
            }
        })
        console.log("REMOVE PLAYER "+username)
        console.log(games)
        console.log("REMOVE DONE")
    }

    socket.on('create-game-room', function(){
        app.get('/game/', function(req, res){
            res.writeHead(302, { 'Location': '/game/'+socket.code });
            res.end();
        })
    })

    // Used when in game and joining the room
    socket.on("join-room", function(code){
        //socket.join(games[games.findIndex(x => x.code == code)].room)
        join_room(code)
    })

    socket.on('load-player-names', function(){
        var g = games[games.findIndex(x => x.code == socket.code)]
        if(typeof g !== "undefined"){
            io.to(g.room).emit("update-player-1-name", g.player1)
            io.to(g.room).emit("update-player-2-name", g.player2)
            io.to(g.room).emit("update-current-player", g.turn, g.color)
        }
    })

    socket.on("chip-mouseover", function(id){
        var g = games[games.findIndex(x => x.code == socket.code)]
        if(typeof g !== "undefined" && g.turn === socket.username && g.won!= true){
            io.to(g.room).emit("update-chip-mouseover", id)
        }
    })

    socket.on("board-clicked", function(data){
        console.log("Board-Clicked")
        var c = "";
        var g = games[games.findIndex(x => x.code == socket.code)]
        console.log(socket.code)
        console.log(g)

        console.log('\n')
        if(typeof g !== "undefined" && g.turn === socket.username && g.won!= true){
            var valid = false
            var column = data.col.substring(4,data.col.length)
            var row;
            for (row = g.board.length - 1; row >= 0; row--){
                if(g.board[row][column] == 0){
                    g.board[row][column] = g.value
                    valid = true
                    break;
                }
            }
            c = row+"-"+column
            if(valid){
                if(socket.username == g.player1){
                    c = "<div id='"+c+"' class='chip order-1 chip-red'></div>"
                    io.to(g.room).emit("add-chip-to-column", data.col, c)
                    g = check_game_over(g)
                    g.turn = g.player2
                    g.value = 2
                    g.color="chip-yellow"
                }else{
                    c = "<div id='"+c+"' class='chip order-1 chip-yellow'></div>"
                    io.to(g.room).emit("add-chip-to-column", data.col, c)
                    g = check_game_over(g)
                    g.turn = g.player1
                    g.value = 1
                    g.color="chip-red"
                }
                if(!g.won){
                    io.to(g.room).emit("update-current-player", g.turn, g.color)
                }

            }else{
                socket.emit("invlid-chip")
            }
            games[games.findIndex(x => x.code == socket.code)] = g
        }
    })

    function check_game_over(g){
        if(check_for_winner(g.board, g.value)){
            g.won = true
            io.to(g.room).emit("game-won", g.turn)
        }else if(check_for_tie(g.board)){
            g.won = true
            io.to(g.room).emit("game-tie")
        }
        return g
    }

    function join_room(code){
        socket.leave(socket.room)
        socket.code = code
        socket.join("room-"+socket.code)
        socket.room = "room-"+socket.code
        socket.emit("display-code", socket.code)
    }

    function check_for_tie(board){
        var tie = 0
        for(var y=0;y<board.length;y++){ //ROW
            if(!board[y].includes(0)){
                tie += 1
            }
        }
        return (tie === board.length)
    }

    function check_for_winner(board, value){
        for(var x=0;x<board.length;x++){
            var win = check_row(board[x], value)
            if (win == true){
                return true
            }
        }

        for(var y=0;y<board.length;y++){ //ROW
            for(var x=0;x<board[y].length;x++){ //COLUMN
                if(check_diagonal(board,y,x)){
                    return true;
                }
            }
        }

        var flipBoard = flip_board(board)
        for(var x=0;x<flipBoard.length;x++){
            var win = check_row(flipBoard[x], value)
            if (win == true){
                return true
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
            if(row - 3 > -1 && column + 3 < board.length) {
                result = board[row][column] == board[row - 1][column + 1] &&
                         board[row][column] == board[row - 2][column + 2] &&
                         board[row][column] == board[row - 3][column + 3];
            }
            if(typeof board[row+3] !== 'undefined' && column + 3 < board.length) {
                result = board[row][column] == board[row + 1][column + 1] &&
                         board[row][column] == board[row + 2][column + 2] &&
                         board[row][column] == board[row + 3][column + 3];
            }
            if(typeof board[row+3] !== 'undefined' && column - 3 > -1) {
                result = board[row][column] == board[row + 1][column - 1] &&
                         board[row][column] == board[row + 2][column - 2] &&
                         board[row][column] == board[row + 3][column - 3];
            }
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

});

http.listen(port, function(){
  console.log('listening on *:'+ port);
});
