var fs = require('fs');

var _static = require('node-static');
var file = new _static.Server('./static', {
    cache: false
});

var app = require('http').createServer(serverCallback);

function serverCallback(request, response) {
    request.addListener('end', function () {
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        file.serve(request, response);
    }).resume();
}

var io = require('socket.io').listen(app, {
//    log: true,
    origins: '*:*'
});

io.set('transports', [
    //'websocket',
    'xhr-polling',
    'jsonp-polling'
]);

var channels = {};
var users = [];
io.sockets.on('connection', function (socket) {
    var initiatorChannel = '';
    if (!io.isConnected) {
        io.isConnected = true;
    }

    socket.on('new-channel', function (data) {
        if (!channels[data.channel]) {
            initiatorChannel = data.channel;
        }

        channels[data.channel] = data.channel;
        onNewNamespace(data.channel, data.sender);
    });

    socket.on('presence', function (channel) {
        var isChannelPresent = !! channels[channel];
        socket.emit('presence', isChannelPresent);
    });

    socket.on('disconnect', function (channel) {
        if (initiatorChannel) {
            delete channels[initiatorChannel];
        }
    });
});

function onNewNamespace(channel, sender) {
    io.of('/' + channel).on('connection', function (socket) {
        var username;
        if (io.isConnected) {
            io.isConnected = false;
            socket.emit('connect', true);
            socket.emit('user-video-stream', JSON.stringify(users));
        }

        socket.on('message', function (data) {
            if (data.sender == sender) {
                if(!username) username = data.data.sender;
                
                socket.broadcast.emit('message', data.data);
            }
        });

        // socket.on('user-video-stream', function (data) {
        //     if(!isInArray(users,data.data)){
        //         users.push(data.data);
        //     }

        //         socket.broadcast.emit('user-video-stream', JSON.stringify(users));
                
        //     //socket.emit('user-video-stream', data.data);
        // });
        
        socket.on('disconnect', function() {
            if(username) {
                socket.broadcast.emit('user-left', username);
                username = null;
            }
        });
    });
}

function isInArray(users,newUser) {
    found = false;
  users.forEach(function(element) {
      if(element.videoId == newUser.videoId) found = true;
  }, this);
  return found;
}


app.listen(process.env.PORT || 5000)
