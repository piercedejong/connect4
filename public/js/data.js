$(function(){

    var myStorage = window.localStorage;

    var username = "pee"
    var code = ""

    myStorage.setItem("username", "Mundo")

    var socket = io();



    socket.on("update-username", function(name){
        username = name
    })

    socket.on("update-code", function(x){
        code = x
    })

    socket.on("get-username", function(){
        return username;
    })


})
