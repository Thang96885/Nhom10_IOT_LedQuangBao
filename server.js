var fs = require('fs');
var url = require('url');
var http = require('http');
var WebSocket = require('ws');
var mysql = require('mysql2');
// function gửi yêu cầu(response) từ phía server hoặc nhận yêu cầu (request) của client gửi lên
function requestHandler(request, response) {

    fs.readFile('./index.html', function(error, content) {
        response.writeHead(200, {
            'Content-Type': 'text/html'
        });
        response.end(content);
    });
    
}
// create http server
var server = http.createServer(requestHandler);
var ws = new WebSocket.Server({
    server
});
// tạo connection đến mysql
var con = mysql.createConnection({
    host: "sql12.freemysqlhosting.net",
    user: "sql12741304",
    password: "dWbnhxsWn1",
    database: "sql12741304"
  });

con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
  });

var clients = [];
var CurrentClients = [];

function broadcast(socket, data) {
    console.log(clients.length);
    for (var i = 0; i < clients.length; i++) {
        if (clients[i] != socket) {
            clients[i].send(data);
        }
    }
}

function respond(socket, data) {
    socket.send(data);
}

ws.on('connection', function(socket, req) {
    clients.push(socket);
    const url = req.url;
    if(url === '/esp8266')
    {
        socket.on('message', function(message) {
            console.log('received: %s', message);

            for(var i = 0; i < CurrentClients.length; i++)
            {
                respond(CurrentClients[i],message.toString());
                CurrentClients.splice(i, 1);
            }
            var DataObj = JSON.parse(message);
            if(DataObj.temperature != null)
            {
                con.query("INSERT INTO record (Temperature,Humidity) VALUES (?,?)",[DataObj.temperature,DataObj.humidity], 
                    (err,result) => {if(err) throw err; console.log("da them sensor data vao table record")});
            }
        });

    }
    else
    {
    socket.on('message', function(message) {
        console.log('received: %s', message);
        broadcast(socket, message);
        if(message == 'xin data sensor')
        {
            broadcast(socket,"get data sensor");
            CurrentClients.push(socket);
        }
        if(message == 'doi kich ban')
            {
                broadcast(socket,"change scenario");
                CurrentClients.push(socket);
            }
        if(message.includes('text:'))
            {
                    var text = message.toString();
                    text = text.substring(text.indexOf(':')+1);
                    broadcast(socket,'change text:' + text);
                    CurrentClients.push(socket);
            }
    });
    socket.on('close', function() {
        var index = clients.indexOf(socket);
        clients.splice(index, 1);
        console.log('disconnected');
    });
}
});
server.listen(3000);
console.log('Server listening on port 3000');