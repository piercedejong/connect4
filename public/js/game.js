$(function () {
    var socket = io();
    var storage = window.localStorage

    socket.on('connect', function () {
        socket.emit('set-username', storage.username);
    });

    socket.on('game-disconnect', function(){
        window.location.href = "/"
        alert("Game has disconnected")
    })

    $("#game").ready(function(){
        socket.emit("join-room", storage.code)
    })

    $("#player-2").ready(function(){
        socket.emit("load-player-names")
    })
    $("#player-1").ready(function(){
        socket.emit("load-player-names")
    })

    socket.on("update-player-1-name", function(name){
        $("#player-1").html(name)
    })

    socket.on("update-player-2-name", function(name){
        $("#player-2").html(name)
    })

    socket.on("update-current-player", function(name, color){
        $("#current-player").html(name)
        $("#place-chip").removeClass("chip-red chip-yellow").addClass(color)
    })

    socket.on("game-won", function(name){
        //alert(name+" has won the match!")
        $("#current-turn").html("")
        $("#current-player").html(name+" has won the match!")
        $("#place-chip").hide()
    })

    socket.on("game-tie", function(){
        $("#current-turn").html("")
        $("#current-player").html("Tie Game!")
        $("#place-chip").hide()
    })

    socket.on("invalid-chip", function(name){
        alert("Error: Can not place chip there")
    })

    $(".col-game").mouseover(function(e) {
        var div = $(e.target)
        var id = ""
        if(div.attr("id").includes("place")){
            id = "#"+div.attr("id")
        }else{
            var id = "#place-"+div.attr("id")
        }
        socket.emit("chip-mouseover",id)
    });

    socket.on("update-chip-mouseover", function(id){
        $("#place-chip").appendTo($(id))
    })

    $(".col-game").click(function(e) {
        id = $(e.target).attr("id")
        if(!id.includes("col")){
            id = $("#"+id).parent().attr("id")
        }
        if(id.includes("place")){
            id = id.substring(6,id.length)
        }
        socket.emit("board-clicked", {col: id})
    });

    socket.on("add-chip-to-column", function(id, chip){
        console.log(id)
        $("#"+id).append(chip)
    })
})


function setTheme(theme) {
    window.localStorage.setItem('theme', theme);
    document.documentElement.className = theme;
}

function toggleTheme(theme) {
   setTheme(theme)
}
if(window.localStorage.getItem('theme') !== "theme-normal" || window.localStorage.getItem('theme') !== "theme-dark" || window.localStorage.getItem('theme') !== "theme-funky"){
    setTheme('theme-normal')
}else{
    setTheme(window.localStorage.getItem('theme'))
}
