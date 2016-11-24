// variables
var recordTime = 30;
var timeCountdown = 0;
var channels = 2;
var bufferSize = 2048;

var leftchannel = [];
var rightchannel = [];

var recorder = null;
var recording = false;
var recordingLength = 0;

var microphone = null;
    // creates the audio context
var audioContext = window.AudioContext || window.webkitAudioContext;
var context = new audioContext();

var currentState = document.getElementById('currentState');
var Btn = document.getElementById('Btn');

var frameCount;
var sampleRate;
var audioBuffer;
var audioBufferSource;

// Older browsers might not implement mediaDevices at all, so we set an empty object first
if ( navigator.mediaDevices === undefined ) {
  navigator.mediaDevices = {};
}

// Some browsers partially implement mediaDevices. We can't just assign an object
// with getUserMedia as it would overwrite existing properties.
// Here, we will just add the getUserMedia property if it's missing.
if ( navigator.mediaDevices.getUserMedia === undefined ) {
    navigator.mediaDevices.getUserMedia = function(constraints) {

        // First get ahold of the legacy getUserMedia, if present
        var getUserMedia = (navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia);

        // Some browsers just don't implement it - return a rejected promise with an error
        // to keep a consistent interface
        if ( !getUserMedia ) {
            return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
        }

        // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
        return new Promise(function(resolve, reject) {
            getUserMedia.call(navigator, constraints, resolve, reject);
        });
    }
}

navigator.mediaDevices.getUserMedia({ audio: true })
.then(success)
.catch(function(err) {
    console.log(err.name + ": " + err.message);
});

// add Btn click event
Btn.addEventListener("click", function(){
    
    //disable
    this.disabled = true;
    timeCountdown = recordTime*1000;
    if(audioBufferSource)audioBufferSource.stop();    
    Btn.innerHTML = "30.00";
    
    // reset the buffers for the new recording
    leftchannel.length = rightchannel.length = 0;
    recordingLength = 0;
    currentState.innerHTML = 'Recording...';
    console.time("recording");
     
    recording = true;

    Btn.className = "recordin";
    
    var timerId = setInterval(countdown, 10, this);

    function countdown(self) {
        if ( timeCountdown === 0  || !recording ) {
            console.timeEnd("recording");  
            recording = false;
            clearTimeout(timerId);

            Btn.className = "";  
            Btn.innerHTML = "REC";
            self.disabled = false;      

            currentState.innerHTML = 'Playing...';
            //console.log("recordingLength="+recordingLength);
            
            // we flat the left and right channels down
            var leftBuffer = combineBuffers ( leftchannel, recordingLength );
            var rightBuffer = combineBuffers ( rightchannel, recordingLength );

            audioBuffer= context.createBuffer(channels,recordingLength, sampleRate);
            audioBufferSource = context.createBufferSource();
            audioBufferSource.connect(context.destination);           
            audioBuffer.getChannelData(0).set(leftBuffer);
            if( channels === 2 ){
                audioBuffer.getChannelData(1).set(rightBuffer);     
            }       
            audioBufferSource.buffer = audioBuffer;
            audioBufferSource.loop = true;
            audioBufferSource.start();
        } else {
            Btn.innerHTML = (timeCountdown/1000<10) ? "0" + (timeCountdown/1000).toFixed(2) : (timeCountdown/1000).toFixed(2);
            timeCountdown -= 10;
        }
    }
    
});

function combineBuffers( channelBuffer, recordingLength ){
    var result = new Float32Array(recordingLength);
    var offset = 0;
    var lng = channelBuffer.length;
    for (var i = 0; i < lng; i++){
        var buffer = channelBuffer[i];
        result.set(buffer, offset);
        offset += buffer.length;
    }
    return result;
}

function success(e){
    // creates an audio node from the microphone incoming stream
    microphone = context.createMediaStreamSource(e);    
    recorder = context.createScriptProcessor(bufferSize, channels, channels);
    sampleRate = context.sampleRate;
    frameCount = sampleRate * recordTime;
        
    recorder.onaudioprocess = function(e){
        if ( !recording ) return;
                
        if( recordingLength + bufferSize > frameCount ){
            recordingLength = frameCount;
            recording = false;
            return;
        }
        else{
            // we clone the samples
            var left = e.inputBuffer.getChannelData (0);
            leftchannel.push (new Float32Array (left));
            if( channels === 2 ){
                var right = e.inputBuffer.getChannelData (1);
                rightchannel.push (new Float32Array (right));
            }
            recordingLength += bufferSize;
        }
    }

    // we connect the recorder
    microphone.connect ( recorder );
    recorder.connect( context.destination );
}