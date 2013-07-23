// FireLooper

var NUM_TRACKS = 5;
var DEFAULT_BPM = 90;
var loop = {};
var ignoreKeydown = false;

// var metronomeSound = null;

var trackHits = [false,false,false,false,false];

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

var playingTrackState = [false, false, false, false, false];

function advancePlayhead() {
    // if (!loop.duration) {console.log("no dur")}
    // console.log('ap', loop)
    var nowMillis = timestamp();
    var interval = playhead.startTimeSec ? (nowMillis - playhead.startTimeSec) * 1000.0 : 0;
    var pctComplete = (interval / loop.duration) * 100.0;
    var playheadTimeMillis = (loop.duration * pctComplete / 100.0);

    if (playhead.startTimeSec !== null) {
        // Draw new hits still being sustained.
        $(trackHits).each(function(trackNum, newHit) {
            if (newHit) {            
                newHit.durationSec = formatFloat(playheadTimeMillis - newHit.startTimeSec*1000) / 1000;
                var hitNum = track(trackNum).length;
                var $hitElem = $("#" + hitMarkerId(trackNum, hitNum));

                if ($hitElem) {
                    var w = hitWidth(newHit);
                    $hitElem.width(w+'%');
                    // console.log("newHit for track", trackNum, w);
                }
            }
        });
    // console.log(loop.duration, interval)


    // TODO: figure out why last hit isn't being recorded/reported.
    // Is duration non-zero?


        if (interval > loop.duration) {
            // Reset playhead
            var old = playhead.startTimeSec;

            for (var i=0; i<NUM_TRACKS; i++) {
                if (trackHits[i]) {
                    ignoreKeydown = true;
                }

                var stoppedHit = stopRecordingHitOnTrack(i);

                if (stoppedHit) {
                    console.log(stoppedHit.startTimeSec*1000)
                    stoppedHit.durationSec = (loop.duration - stoppedHit.startTimeSec*1000) / 1000;
                }

                trackHits[i] = false;
            }

            playhead.startTimeSec = timestamp();

        }
    }

    $("#playhead").css("left", pctComplete+"%");


    if (playhead.nextMetronomePct === null || playhead.nextMetronomePct < pctComplete) {
        playhead.nextMetronomePct += 25;
        playSound("metronome");
        $(".beat-indicator").show();
        $(".beat-indicator").fadeOut(loop.duration * 0.125)
    }
    else {
        playhead.lastMetronomePctMod = parseInt(pctComplete) % 25;        
    }

    if (pctComplete > 100.0) {
        pctComplete = 0.0;
        playhead.nextMetronomePct = 0;
    } 

    
    // Play the hits 

    var loopChangedState = false;

    for (var trackNum=0; trackNum < NUM_TRACKS; trackNum++) {
        // Get the track's state
        var state = trackIsHittingAtTime(trackNum, playheadTimeMillis);

        // Check if it changed
        var trackChangedState = (state != playingTrackState[trackNum]);

        if (trackChangedState) {
            loopChangedState = true;
        }

        // Set the state
        playingTrackState[trackNum] = state;

        if (trackChangedState) {
            if (state) {
                playSound("sound" + trackNum);
            }
        }
    }

    if (loopChangedState) {
        socket.emit("puff", {tracks:playingTrackState});
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
    loop.tracks[num] = (loop.tracks[num] || {});
    var track = loop.tracks[num];
    // console.log(num, "loop.tracks", track);
    track.hits = track.hits || [];
    return track.hits;
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

        $(hits).each(function(i, hit) {

            // See if given time falls within any hit.

            var bpmRatio = (hit.bpm / loop.bpm);
            var startTime = 1000 * hit.startTimeSec * bpmRatio;
            var endTime = 1000 * (hit.startTimeSec + hit.durationSec) * bpmRatio;


            if (ms >= startTime && ms <= endTime) {
                // console.log("HIT:", ms, 'TRACK', i);
                hitting = true;
                return;
            }
        });
    }

    return hitting;
}

function newPuffCommand(startMs, p0, p1, p2, p3, p4) {
    return {
        duration: null,
        startMs: startMs,
        p0: p0,
        p1: p1,
        p2: p2,
        p3: p3,
        p4: p4
    };
}

function exportLoop() {

    stopPlayback();
    $("#exporter").fadeIn(100);

    var puffCommands = [];
    var trackState = [false, false, false, false, false];

    var sampleInterval = 10;

    for (var curMs=0; curMs < loop.duration+sampleInterval; curMs+=sampleInterval) {

        if (curMs > loop.duration) {
            curMs = loop.duration;
        }

        // If track state for any track differs now, puff.
        var changedState = false;

        for (var trackNum=0; trackNum < NUM_TRACKS; trackNum++) {
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

            if (trackState[0] || trackState[1] || trackState[2] || trackState[3] || trackState[4]) {
                // console.log("new cmd at", curMs)
                puffCommands.push(
                    newPuffCommand(curMs, trackState[0], trackState[1], trackState[2], trackState[3], trackState[4]));
            }
            else {
                puffCommands.push(newPuffCommand(curMs, 0, 0, 0, 0, 0));
            }
        }
    }

    // Add the last hit

    var puffs = [];


    // TODO: Add a puff command at the beginning and/or end if there are no hits there.

    $(puffCommands).each(function(i, command) {
        // console.log(i, command);

        if (command.duration) {
            puffs.push("puffMulti(" +
                (command.p0 ? '1' : '0') + ', ' +
                (command.p1 ? '1' : '0') + ', ' +
                (command.p2 ? '1' : '0') + ', ' +
                (command.p3 ? '1' : '0') + ', ' +
                (command.p4 ? '1' : '0') + ', ' +
                parseInt(command.duration) + ');');            
        }
    });

    // console.log("puffs", puffs);

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
    console.log("setBpm dur:", loop.duration)
    $("#loop-duration").val(parseInt(loop.duration / 100) / 10);
}

function startPlayback() {
    if (playhead.startTimeSec === null) {
        playhead.startTimeSec = timestamp();
        playhead.nextMetronomePct = 0;
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
        loop.tracks = [];
        setBpm(loop.bpm || DEFAULT_BPM);
        trackHits = [false,false,false,false,false];

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
    
    playSound("sound" + trackNum);

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

function initTracks() {
    for (var i=0; i<NUM_TRACKS; i++) {
        var $track = $("#track-" + i);
        var hits = track(i);

        console.log("track", i, 'has', hits);

        for (var hitNumber=0; hitNumber < hits.length; hitNumber++) {
            var hit = hits[hitNumber];
            var bpmRatio = (hit.bpm / loop.bpm);
            var leftPct = (hit.startTimeSec*1000.0 / loop.duration) * 100.0 * bpmRatio;

            console.log("pct:", leftPct);

            var hitMarker = $('<div>')
                .attr('class', 'hit-marker')
                .attr('id', hitMarkerId(i, hits.length))
                .css('left', pct+'%');

            $track.append(hitMarker);            
        }
    }
}

function stopRecordingHitOnTrack(trackNum) {
    $(".loop-container").removeClass("recording");
    
    var newHit = trackHits[trackNum];
    trackHits[trackNum] = false;
    
    if (newHit) {
        newHit.bpm = loop.bpm;
        track(trackNum).push(newHit);

        // console.log("Tracks:", 
        //     "\n0: ", JSON.stringify(loop.tracks[0]), 
        //     "\n1: ", JSON.stringify(loop.tracks[1]), 
        //     "\n2: ", JSON.stringify(loop.tracks[2]), 
        //     "\n");
    }

    return newHit;
}

function bpmFieldFocused() {
    return ($(document.activeElement).attr("id") === 'loop-bpm');
}

function initSound() {
    try {
        // createjs.Sound.addEventListener("loadcomplete", soundLoadComplete);
        createjs.Sound.registerSound({src:"/audio/click.mp3", id:"metronome"});
        createjs.Sound.registerSound({src:"/audio/Game-Break.mp3|/audio/Game-Break.ogg", id:"sound0"});
        createjs.Sound.registerSound({src:"/audio/Game-Death.mp3|/audio/Game-Death.ogg", id:"sound1"});
        createjs.Sound.registerSound({src:"/audio/bass-drum.mp3", id:"sound2"});        
        createjs.Sound.registerSound({src:"/audio/tamborine.mp3", id:"sound3"});        
        createjs.Sound.registerSound({src:"/audio/horn.mp3", id:"sound4"});        
    }
    catch (e) {
        console.log("initSound error:", e);
    }
}

function playSound(soundId) {
    // return;
    try {
        createjs.Sound.play(soundId);
    }
    catch (e) {
    }
}

// function soundLoadComplete(event) {
//     playSound("sound0");
//     playSound("sound1");
// }

///////////////////////////////////////////////////

$(function() {

    // TODO: Load saved loop.
    clearLoop(false);

    initTracks();

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
        // Send stuff to the server.
        // Use the socket instead of this old fashioned save thing.

        console.log("posting loop", loop);

        // $.post("", {loop:JSON.stringify(loop)}, function(a,b) {
        $.post("", loop, function(a,b) {
            console.log("1st callback", a, b);
        },
        function(a,b) {
            console.log("2nd callback", a, b);
        });

        return false;
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

        if (ignoreKeydown) {
            return;
        }

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
        else if (e.keyCode == 52) {
            // 4
            if (!bpmFieldFocused()) {
                startRecordingHitOnTrack(3);
            }
        }
        else if (e.keyCode == 53) {
            // 5
            if (!bpmFieldFocused()) {
                startRecordingHitOnTrack(4);
            }
        }
    });

    $(document).keyup(function(e) {

        ignoreKeydown = false;

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
        else if (e.keyCode == 52) {
            // 4
            if (!bpmFieldFocused()) {
                stopRecordingHitOnTrack(3);
            }
        }
        else if (e.keyCode == 53) {
            // 5
            if (!bpmFieldFocused()) {
                stopRecordingHitOnTrack(4);
            }
        }
    });

    // metronomeSound = document.getElementById("click"); 

    initSound();

    setInterval(advancePlayhead, 10);

});
