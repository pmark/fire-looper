// mongoconsole.js

var mongoose = require("mongoose");

mongoose.set('debug', true);

// Here we find an appropriate database to connect to, defaulting to
// localhost if we don't find one.  
var uristring = 
  process.env.MONGOLAB_URI || 
  process.env.MONGOHQ_URL || 
  'mongodb://localhost/FireLooper';

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
    bpm: Number,
    tracks: 
    [
        {
            hits:
            [
                {
                    startTimeSec: Number,
                    durationSec: Number,
                    bpm: Number
                }
            ]
        }
    ]
});

// Compiles the schema into a model, opening (or creating, if
// nonexistent) the 'Loops' collection in the MongoDB database

loopSchema.index({id: 1});

module.exports = mongoose.model('Loops', loopSchema);
