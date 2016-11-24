// variables
var recordTime = 30;
var channels = 2;
var bufferSize = 2048;

var leftchannel = [];
var rightchannel = [];

var recorder = null;
var recording = false;
var recordingLength = 0;

var microphone = null;

var audioContext = window.AudioContext || window.webkitAudioContext;
var context;

var currentState = document.getElementById('currentState');
var Btn = document.getElementById('Btn');
var warning = null;

var frameCount;
var sampleRate;
var audioBuffer;
var audioBufferSource;

//IE11 doesn't support promise so no navigator.mediaDevices.getUserMedia
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

if (navigator.getUserMedia){
    navigator.getUserMedia({audio:true}, success, function(e) {
        alert('getUserMedia error: '+e);
    });
} 
else{
    warning = document.createElement("p");
    warning.className = "warning"; 
    warning.innerHTML = "This browser does not support getUserMedia";
    document.body.appendChild(warning);      
}

// add Btn click event
Btn.addEventListener("click", function(){
    var startAnimationFrame = null;
    
    //stop playing audio
    if(audioBufferSource)audioBufferSource.stop();
    
    //display related
    this.disabled = true;
    this.innerHTML = "30.00";
    this.className = "recordin";
    currentState.innerHTML = 'Recording...';
    
    // reset the buffers for the new recording
    leftchannel.length = rightchannel.length = 0;
    recordingLength = 0;
    
    //start recording
    recording = true;
    console.time("recording_time");

    //prevent inactive tab, different thread
    window.requestAnimationFrame(step);   

    function step(timestamp) {
        if (!startAnimationFrame) startAnimationFrame = timestamp;
        var progress = timestamp - startAnimationFrame;
        
        if (progress < recordTime*1000 ) {
            var displayTime = (recordTime - progress/1000).toFixed(2);
            if(displayTime < 0){
                displayTime  = (0).toFixed(2);
            }
            Btn.innerHTML = (displayTime<10) ? "0" + displayTime : displayTime;   

            window.requestAnimationFrame(step);
        }
        //stop recording
        else{
            console.timeEnd("recording_time");
            recording = false;

            //display related
            Btn.className = "";  
            Btn.innerHTML = "REC";
            Btn.disabled = false; 
            currentState.innerHTML = 'Playing...';

            // we flat the left and right channels down
            var leftBuffer = combineBuffers ( leftchannel, recordingLength );
            var rightBuffer = combineBuffers ( rightchannel, recordingLength );
            
            //audioBuffer
            audioBuffer= context.createBuffer(channels,recordingLength, sampleRate);
            audioBuffer.getChannelData(0).set(leftBuffer);
            if( channels === 2 ){
                audioBuffer.getChannelData(1).set(rightBuffer);     
            }  
            
            //audioBufferSource 
            audioBufferSource = context.createBufferSource();
            audioBufferSource.buffer = audioBuffer;
            
            //play audio
            audioBufferSource.connect(context.destination);           
            audioBufferSource.loop = true;
            audioBufferSource.start();
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
    //creates audio nodes
    if(audioContext){
        context = new audioContext();
    }
    else {
        warning = document.createElement("p");
        warning.className = "warning"; 
        warning.innerHTML = "This browser does not support AudioContext";
        document.body.appendChild(warning);      
        return;
    }

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
            //clone the samples
            var left = e.inputBuffer.getChannelData (0);
            leftchannel.push (new Float32Array (left));
            if( channels === 2 ){
                var right = e.inputBuffer.getChannelData (1);
                rightchannel.push (new Float32Array (right));
            }
            recordingLength += bufferSize;
        }
    }

    //connect the recorder
    microphone.connect ( recorder );
    recorder.connect( context.destination );
}
