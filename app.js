//
// fire-looper
//

// by P. Mark Anderson

//
// Copyright 2013 Stumpware
//
// MIT Licensed
//

// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation files
// (the "Software"), to deal in the Software without restriction,
// including without limitation the rights to use, copy, modify, merge,
// publish, distribute, sublicense, and/or sell copies of the Software,
// and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:  

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software. 

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
// BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE. 

"use strict";

var express = require("express"),
    app = express(),
    http = require("http"),
    path = require("path"),
    publicPath = path.join(__dirname, 'public'),
    Loops = require("./loops-mongoose.js"),
    theport = process.env.PORT || 5000;;

// Use this to drop all indexes:
// Loops.collection.dropAllIndexes(function (err, results) {
//     // Handle errors
//     console.log("drop: ", err, results);
// });


// Clear out old data
if (false) {
    Loops.remove({}, function(err) {
      if (err) {
        console.log ('error deleting old data.');
      }
      else {
        console.log("\n\nREMOVED ALL LOOPS\n\n");
      }
    });
}

app.configure(function() {
    app.set("port", process.env.PORT || 5000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(publicPath));
});

app.get("/loops/:loopId", function(req, res) {

    if (req.params.loopId === 'new') {
        // New loop
        res.render('loop', {loop: null});
    }
    else {
        Loops.findById(req.params.loopId).exec(function(err, result) { 
            if (err) {
                console.log("Error fetching loop:", req.params.loopId, err);
                res.send(err);
            }
            else {
                if (result) {
                    var loop = result;
                    loop.tracks = loop.tracks || [];

                    console.log("Found loop: ", loop);
                    res.render('loop', {loop: loop});
                }
            }
        });
    }
});

app.post("/loops/:loopId", function(req, res) {
    console.log("POST to loop ", req.params.loopId);

    var loopData = req.body;

    if (req.params.loopId === 'new') {
        Loops.create(loopData,
            function (err, savedLoop) {
                if (err) {
                    console.log("Error saving loop:", err);
                }
                else {
                    console.log("Saved loop:", savedLoop);
                    res.send({redirect: ("/loops/" + savedLoop.id)});
                }
            }
        );
    }
    else {
        Loops.findOneAndUpdate(
            {$id:req.params.loopId},
            loopData, 
            function (err, savedLoop) {
                if (err) {
                    console.log("Error saving loop:", err);
                }
                else {
                    console.log("Saved loop:", savedLoop);
                    res.send({redirect: ("/loops/" + savedLoop.id)});
                }
            }
        );        
    }
});

app.get("/", function(req, res) {
    Loops.find({}).exec(function(err, result) { 
        if (err) {
            console.log("Error fetching loops:", err);
            res.send(err);
        }
        else {
            if (result) {
                console.log("Found loops: ", result.length);

                var responseData = {
                    count:result.length,
                    loops:result
                };

                res.render('index', responseData);
            }
        }
    });
});

var server = http.createServer(app);

server.listen(app.get("port"), function() {
    console.log("fire-looper is now listening on port " + app.get("port"));
});

var io = require('socket.io').listen(server);

io.sockets.on('connection', function (socket) {

  // socket.emit('news', { hello: 'world' });

  // socket.on('my other event', function (data) {
  //   console.log(data);
  // });

});
