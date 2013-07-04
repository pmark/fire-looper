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
    http = require("http"),
    path = require("path"),
    mongoose = require ("mongoose"),
    app = express(),
    publicPath = path.join(__dirname, 'public');

mongoose.set('debug', true);

// Here we find an appropriate database to connect to, defaulting to
// localhost if we don't find one.  
var uristring = 
  process.env.MONGOLAB_URI || 
  process.env.MONGOHQ_URL || 
  'mongodb://localhost/FireLooper';

// The http server will listen to an appropriate port, or default to
// port 5000.
var theport = process.env.PORT || 5000;

// Makes connection asynchronously.  Mongoose will queue up database
// operations and release them when the connection is complete.
mongoose.connect(uristring, function (err, res) {
  if (err) { 
    console.log ('ERROR connecting to: ' + uristring + '. ' + err);
  } else {
    console.log ('Succeeded connected to: ' + uristring);
  }
});

var loopSchema = new mongoose.Schema(
{
    id: Number,
    creator: String,
    duration: Number,
    tracks: 
    [
        {
            hits:
            [
                {
                    startTime: Number,
                    duration: Number
                }
            ]
        }
    ]
});


// Compiles the schema into a model, opening (or creating, if
// nonexistent) the 'Loops' collection in the MongoDB database

loopSchema.index({id: 1});

var Loops = mongoose.model('Loops', loopSchema);


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
    Loops.find({$id:req.params.loopId}).exec(function(err, result) { 
        if (err) {
            console.log("Error fetching loop:", req.params.loopId, err);
            res.send(err);
        }
        else {
            if (result) {
                console.log("Found loop: ", result.length);

                var responseData = {
                    loop:result[0]
                };

                res.render('loop', responseData);
            }
        }
    });
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

http.createServer(app).listen(app.get("port"), function() {
    console.log("fire-looper is now listening on port " + app.get("port"));
});
