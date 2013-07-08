// FireLooper

var loop = {};
var metronomeSound = null;

var trackHits = [false,false,false];

var playhead = {
    position: 0.0,
    startTimeSec: null
};

var tapIn = {
    count: 0,
    firstTapAt: null,
    lastTapAt: null
}

function timestamp() {
    return (new Date().getTime() / 1000.0);
}


function advancePlayhead() {

    var pctComplete = 0.0;

    if (playhead.startTimeSec !== null) {
        var nowMillis = timestamp();
        var playheadTimeMillis = (nowMillis - playhead.startTimeSec);

        $(trackHits).each(function(trackNum, newHit) {
            if (newHit) {            
                newHit.durationSec = formatFloat(playheadTimeMillis - newHit.startTimeSec);
                var hitNum = track(trackNum).length;
                var $hitElem = $("#" + hitMarkerId(trackNum, hitNum));

                if ($hitElem) {
                    var w = hitWidth(newHit);
                    $hitElem.width(w+'%');
                    // console.log("newHit for track", trackNum, w);
                }
            }
        });

        var now = timestamp();
        var interval = (now - playhead.startTimeSec) * 1000.0;
        pctComplete = (interval / loop.duration) * 100.0;

        if (interval > loop.duration) {
            // Reset playhead
            var old = playhead.startTimeSec;
            playhead.startTimeSec = timestamp();

            for (var i=0; i<3; i++) {
                stopRecordingHitOnTrack(i);
                trackHits[i] = false;
            }
        }
    }

    $("#playhead").css("left", pctComplete+"%");

    if (pctComplete > 1.0 && parseInt(pctComplete) % 25 === 0) {

        metronomeSound.pause();
        metronomeSound.play();

        $(".beat-indicator").show();
        $(".beat-indicator").fadeOut(loop.duration * 0.125)
    }

    if (pctComplete > 100.0) {
        pctComplete = 0.0;
    } 
}

function hitWidth(hit) {
    // console.log("hitWidth: ", (hit.durationSec*1000.0), '/', loop.duration, $(".track-list").width());

    var trackWidthPx = $(".track-list").width();
    var wPx = parseInt(hit.durationSec*1000.0 / loop.duration * trackWidthPx);
    return wPx / trackWidthPx * 100.0;
}

function formatFloat(f) {
    return parseInt(f*100)/100;
}

function track(num) {
    loop.tracks[num] = (loop.tracks[num] || []);
    return loop.tracks[num];
}

function hitMarkerId(trackNum, hitNum) {
    return ('hit-' + trackNum + '-' + hitNum);
}

function trackIsHittingAtTime(trackNum, ms) {
    var hitting = false;
    var hits = track(trackNum);

    // [
    //   {"startTimeSec":0,"durationSec":0.86},
    //   {"startTimeSec":2.17,"durationSec":1.01}
    // ] 

    if (hits && hits.length > 0) {

        // !!! NO NEED TO SORT
        // var sorted = hits.sort(function(a,b) { 
        //     return (a.startTimeSec > b.startTimeSec);
        // });

        $(hits).each(function(i, hit) {

            // See if given time falls within any hit.

            var startTime = 1000 * hit.startTimeSec;
            var endTime = 1000 * (hit.startTimeSec + hit.durationSec);


            if (ms >= startTime && ms <= endTime) {
                // console.log("HIT:", ms, 'TRACK', i);
                hitting = true;
                return;
            }
            else {
                // console.log("MISS:", ms, '>=', startTime, '&&', ms, '<=', endTime);                
            }
        });
    }

    return hitting;
}

function newPuffCommand(startMs, p0, p1, p2) {
    return {
        duration: null,
        startMs: startMs,
        p0: p0,
        p1: p1,
        p2: p2
    };
}

function exportLoop() {

    stopPlayback();
    $("#exporter").fadeIn(100);

    var puffCommands = [];
    var trackState = [false, false, false];

    for (var curMs=0; curMs < loop.duration; curMs+=50) {

        // If track state for any track differs now, puff.
        var changedState = false;

        for (var trackNum=0; trackNum < 3; trackNum++) {
            // Get the track's state
            var state = trackIsHittingAtTime(trackNum, curMs);

            // Check if it changed
            changedState = (state != trackState[trackNum]);

            // Set the state
            trackState[trackNum] = state;

            if (changedState) {
                // console.log('change', trackNum, "state at", curMs, 'is', state, 'was', trackState[trackNum]);
                break;
            }

        }

        if (changedState) {
            if (puffCommands.length > 0) {
                // Calculate duration for previous command.
                var previousCommand = puffCommands[puffCommands.length-1];
                previousCommand.duration = previousCommand.duration || (curMs - previousCommand.startMs);
            }

            if (trackState[0] || trackState[1] || trackState[2]) {
                console.log("new cmd at", curMs)
                puffCommands.push(
                    newPuffCommand(curMs, trackState[0], trackState[1], trackState[2]));                
            }
        }
    }

    var puffs = [];

    $(puffCommands).each(function(i, command) {
        // console.log(i, command);

        puffs.push("puffMulti(" +
            (command.p0 ? '1' : '0') + ', ' +
            (command.p1 ? '1' : '0') + ', ' +
            (command.p2 ? '1' : '0') + ', ' +
            command.duration + ');');
    });

    console.log("puffs", puffs);

    $("#exporter .content").html(puffs.join('<br/>'))
}

function setBpm(newBpm) {
    loop.bpm = Math.max(1, Math.min(newBpm, 1000));
    $("#loop-bpm").val(loop.bpm);

    // Set loop duration for 4 measures with 4 beats each.

    var MEASURES = 4;
    var BEATS_PER_MEASURE = 4;
    var measuresPerMinute = loop.bpm / BEATS_PER_MEASURE;
    var secondsPerMeasure = 1 / measuresPerMinute / 60;
    loop.duration = MEASURES * secondsPerMeasure * 1000 * 1000;
    $("#loop-duration").val(parseInt(loop.duration / 100) / 10);
}

function startPlayback() {
    if (playhead.startTimeSec === null) {
        playhead.startTimeSec = timestamp();
        $("#play-btn").hide();
        $("#stop-btn").show();    
    }
}

function stopPlayback() {
    playhead.startTimeSec = null;
    $("#stop-btn").hide();
    $("#play-btn").show();
}

function togglePlay() {    
    var playing = !$("#play-btn").is(":visible");

    if (playing) {
        stopPlayback();
    }
    else {
        startPlayback();
    }
}

function clearLoop(confirmation) {

    stopPlayback();

    confirmation = (typeof(confirmation) === 'undefined' ? true : false);

    if (!confirmation || confirm("Really clear loop?")) {
        loop = {
            duration: null,  // <%= loopDuration %>
            tracks: []
        };

        setBpm(loop.bpm || 60);

        trackHits = [false,false,false];

        $(".hit-marker").remove();        
    }
}

function maybeClearTapInCount() {
    // var diffSinceLastTap = (timestamp() - tapIn.lastTapAt);

    // if (diffSinceLastTap > 3.0) {
        // reset
        tapIn.count = 0;
        $(".loop-bpm-container").removeClass("active");
    // }
}

function startRecordingHitOnTrack(trackNum) {

    if (trackHits[trackNum]) {
        return;
    }
    
    $(".loop-container").addClass("recording");

    var $track = $("#track-" + trackNum);

    // Store the number of seconds from the beginning of the loop.

    var hitStartTime = 0.0;
    var now = timestamp();

    startPlayback();

    hitStartTime = formatFloat(now - playhead.startTimeSec);
    
    newHit = {
        startTimeSec: hitStartTime,
        durationSec: 0.00
    };

    trackHits[trackNum] = newHit;

    // Add a hit marker to the track
    var interval = (now - playhead.startTimeSec) * 1000.0;
    var pctComplete = (interval / loop.duration) * 100.0;

    var hitMarker = $('<div>')
        .attr('class', 'hit-marker')
        .attr('id', hitMarkerId(trackNum, track(trackNum).length))
        .css('left', pctComplete+'%');

    $track.append(hitMarker);
}

function stopRecordingHitOnTrack(trackNum) {
    $(".loop-container").removeClass("recording");
    
    var newHit = trackHits[trackNum];
    trackHits[trackNum] = false;
    
    if (newHit) {
        track(trackNum).push(newHit);

        // console.log("Tracks:", 
        //     "\n0: ", JSON.stringify(loop.tracks[0]), 
        //     "\n1: ", JSON.stringify(loop.tracks[1]), 
        //     "\n2: ", JSON.stringify(loop.tracks[2]), 
        //     "\n");
    }
}

function bpmFieldFocused() {
    return ($(document.activeElement).attr("id") === 'loop-bpm');
}

///////////////////////////////////////////////////

$(function() {

    // TODO: Load saved loop.
    clearLoop(false);

    $("#loop-bpm")
        .click(function() {
            $(this).select();
        })
        .change(function() {
            setBpm(parseInt($(this).val()));
        });


    // $("#loop-duration")
        // .val(loop.duration / 1000)
        // .click(function() {
        //     $(this).select();
        // })
        // .change(function() {
        //     var newDurationSec = parseInt($(this).val() * 10) / 10;
        //     loop.duration = newDurationSec * 1000;
        //     $(this).val(newDurationSec);
        // });

    $(".track-list li").mousedown(function() {        
        var trackNum = parseInt($(this).attr("id").split("-")[1]);
        startRecordingHitOnTrack(trackNum);
    });

    $(".track-list li").mouseup(function() {
        var trackNum = parseInt($(this).attr("id").split("-")[1]);
        stopRecordingHitOnTrack(trackNum);
    });

    $("#save-btn").click(function() {
    });

    $("#clear-btn").click(function() {
        clearLoop();
    });

    $("#export-btn").click(function() {
        exportLoop();
        return false;
    });

    $("#play-btn").click(function() {
        startPlayback();
    });    

    $("#stop-btn").click(function() {
        stopPlayback();
    });

    $("#tap-pad").mousedown(function() {
        // Tap 4 times
        // On tap, hit at 0, 25%, 50%, 75%

        $(this).addClass("active");
        $(".loop-bpm-container").addClass("active");

        if (!tapIn.firstTapAt) {
            tapIn.firstTapAt = now;
            tapIn.count = 0;

        }

        var now = timestamp();
        // tapIn.firstTapAt = tapIn.firstTapAt || now;
        var previousTapAt = tapIn.lastTapAt;

        clearTimeout(tapIn.timeout);
        tapIn.timeout = setTimeout(maybeClearTapInCount, 3000);

        if (tapIn.count === 0) {
            tapIn.firstTapAt = now;
        }

        tapIn.lastTapAt = now;
        tapIn.count++;

        var diffSinceFirstTap = (tapIn.lastTapAt - tapIn.firstTapAt);

        if (diffSinceFirstTap > 0) {
            // If it takes diff sec to do 2 beats, 
            // how many beats would happen in 1 minute
            setBpm(parseInt(60.0 * tapIn.count / diffSinceFirstTap));
        }
    });

    $("#tap-pad").mouseup(function() {
        // Tap 4 times
        // On tap, hit at 0, 25%, 50%, 75%

        $(this).removeClass("active");
    });

    $(document).keydown(function(e) {
        // console.log("key", e.keyCode);

        if (e.keyCode == 38) {
            // up
            setBpm(loop.bpm+1);
            e.preventDefault();
        }
        else if (e.keyCode == 40) {
            // down
            setBpm(loop.bpm-1);
            e.preventDefault();
        }
        else if (e.keyCode == 32) {
            // spacebar
            togglePlay();
            return false;
        }
        else if (e.keyCode == 27) {
            // ESC
            if ($("#exporter").is(":visible")) {
                $("#exporter").fadeOut(100);
            }
            else {
                clearLoop();
            }
        }
        else if (e.keyCode == 49) {
            // 1
            if (!bpmFieldFocused()) {
                startRecordingHitOnTrack(0);            
            }
        }
        else if (e.keyCode == 50) {
            // 2
            if (!bpmFieldFocused()) {
                startRecordingHitOnTrack(1);
            }
        }
        else if (e.keyCode == 51) {
            // 3
            if (!bpmFieldFocused()) {
                startRecordingHitOnTrack(2);
            }
        }
    });

    $(document).keyup(function(e) {
        if (e.keyCode == 49) {
            // 1
            if (!bpmFieldFocused()) {
                stopRecordingHitOnTrack(0);
            }
        }
        else if (e.keyCode == 50) {
            // 2
            if (!bpmFieldFocused()) {
                stopRecordingHitOnTrack(1);
            }
        }
        else if (e.keyCode == 51) {
            // 3
            if (!bpmFieldFocused()) {
                stopRecordingHitOnTrack(2);
            }
        }
    });

    metronomeSound = document.getElementById("click"); 

    setInterval(advancePlayhead, 10);
});
