$(function () {
    var socket = io();
    var storage = window.localStorage

    $('form').submit(function(e){
        e.preventDefault(); // prevents page reloading
        socket.emit('chat message', $('#m').val());
        $('#m').val('');
        return false;
    });

    $("#index").ready(function(){
        var user = checkCookie()
        storage.username = user
        socket.emit("create-user", user)
        $("#waiting").html("")
    })

    socket.on("display-code", function(code){
        $("#game-code").html(code)
    })

    socket.on("cant-join-own-room",function(){
        alert("Error: Cannot join your own room")
        $("#gcode").val("")

    })

    $("#game-code-input").on("submit", function(event){
        var code = $("#gcode").val()
        socket.emit('join-room-player2', code)
    })

    $("#username-input").on("submit",function(){
        var username = $("#current-user").val()
        if (username !== ""){
            socket.emit("update-username", username)
        }
    })

    socket.on("username-updated", function(username){
        setCookie("username", username, 365);
        alert("Username Updated")
    })

    socket.on("username-update-failed", function(username){
        alert("Username could not be updated")
        $("#current-user").val(username)
    })

    $("#random-match").click(function(){
        socket.emit("join-random-match")
        $("#waiting").html("*Waiting for antother Player*")
    })

    socket.on("go-to-game-room", function(code,username){
        storage.code = code
        //storage.username = username
        window.location.href = "/game/"+code
    })

    socket.on('connection', function(username){
        $("#current-user").val(username)
    });

    socket.on('username taken', function(username){
        var msg = " Sorry, "+username+" has already been taken"
        $('#messages').append($('<li>').html(msg));
        $("#chat").scrollTop($("#chat")[0].scrollHeight);
    })

    socket.on('username changed', function(newName, oldName, color){
        var msg = '<span style="color:#'+color+'">'+oldName+'</span>'+" has changed their name to "+
        '<span style="color:#'+color+'">'+newName+'</span>';
        $('#messages').append($('<li>').html(msg));
        $("#chat").scrollTop($("#chat")[0].scrollHeight);
    })


    https://www.w3schools.com/js/js_cookies.asp

    function setCookie(cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
        var expires = "expires="+d.toUTCString();
        document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    }

    function getCookie(cname) {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for(var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }

    function checkCookie() {
        var user = getCookie("username");
        //user = ""
        if (user != "") {
            //alert("Welcome again " + user);
            $("#greeting").html("Welcome Back!")
        } else {
            var possibleUsernames = ["Aatrox","Ahri","Akali","Alistar","Amumu","Anivia","Annie","Aphelios","Ashe","AurelionSol","Azir","Bard","Blitzcrank","Brand","Braum","Caitlyn","Camille","Cassiopeia","Cho'Gath","Corki","Darius","Diana","Dr.Mundo","Draven","Ekko","Elise","Evelynn","Ezreal","Fiddlesticks","Fiora","Fizz","Galio","Gangplank","Garen","Gnar","Gragas","Graves","Hecarim","Heimerdinger","Illaoi","Irelia","Ivern","Janna","JarvanIV","Jax","Jayce","Jhin","Jinx","Kai'Sa","Kalista","Karma","Karthus","Kassadin","Katarina","Kayle","Kayn","Kennen","Kha'Zix","Kindred","Kled","Kog'Maw","LeBlanc","LeeSin","Leona","Lissandra","Lucian","Lulu","Lux","Malphite","Malzahar","Maokai","MasterYi","MissFortune","Mordekaiser","Morgana","Nami","Nasus","Nautilus","Neeko","Nidalee","Nocturne","Nunu","Olaf","Orianna","Ornn","Pantheon","Poppy","Pyke","Qiyana","Quinn","Rakan","Rammus","Rek'Sai","Renekton","Rengar","Riven","Rumble","Ryze","Sejuani","Senna","Sett","Shaco","Shen","Shyvana","Singed","Sion","Sivir","Skarner","Sona","Soraka","Swain","Sylas","Syndra","TahmKench","Taliyah","Talon","Taric","Teemo","Thresh","Tristana","Trundle","Tryndamere","TwistedFate","Twitch","Udyr","Urgot","Varus","Vayne","Veigar","Vel'Koz","Vi","Viktor","Vladimir","Volibear","Warwick","Wukong","Xayah","Xerath","XinZhao","Yasuo","Yorick","Yuumi","Zac","Zed","Ziggs","Zilean","Zoe","Zyra"]
            user = possibleUsernames[Math.floor(Math.random()*possibleUsernames.length)]
                if (user != "" && user != null) {
                    setCookie("username", user, 365);
                }
        }
        return user
    }

});
