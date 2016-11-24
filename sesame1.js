// variables
var recordTime = 30;
var channels = 2;
var bufferSize = 2048;

//buffers
var leftchannel = [];
var rightchannel = [];

var recording = false;
var recordingLength = 0;

var currentState = document.getElementById('currentState');
var Btn = document.getElementById('Btn');
var frontBar = document.getElementById('frontBar');
var progressBar = document.getElementById('progressBar');
var warning = null;
var barWidth = 150;
//frame startin point
var startButtonFrame = null;
var startProgressFrame = null;

var audioContext = window.AudioContext || window.webkitAudioContext;
var context;
var frameCount;
var sampleRate;
var recorder;
var microphone;
var audioBuffer;
var audioBufferSource;

//IE11 doesn't support promise so no navigator.mediaDevices.getUserMedia
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

if (navigator.getUserMedia){
    navigator.getUserMedia({audio:true}, successCB, failureCB);
} 
else{
    createWarning("This browser does not support getUserMedia");     
}

// add Btn click event
Btn.addEventListener("click", function(){
    //reset frame startin point
    startButtonFrame = null;
    startProgressFrame = null;
    
    //stop playing audio
    if(audioBufferSource)audioBufferSource.stop();
    
    //display related
    this.disabled = true;
    this.innerHTML = "30.00";
    this.className = "recordin";
    currentState.innerHTML = 'Recording...';
    
    // reset buffers
    leftchannel.length = 0;
    rightchannel.length = 0;
    recordingLength = 0;
    
    //start recording
    recording = true;
    console.time("recording_time");

    //prevent inactive tab, different thread
    window.requestAnimationFrame(buttonAnimation);       
});

//success callback for getUserMedia
function successCB(e) {
    //creates audio nodes
    if(audioContext){
        context = new audioContext();
    }
    else {
        //no audioContext set warning
        createWarning("This browser does not support AudioContext");    
        return;
    }

    sampleRate = context.sampleRate;
    frameCount = sampleRate * recordTime;
    microphone = context.createMediaStreamSource(e);    
    recorder = context.createScriptProcessor(bufferSize, channels, channels); 
    
    recorder.onaudioprocess = function(e){
        if ( !recording ) return;
                
        if( recordingLength + bufferSize > frameCount ){
            recordingLength = frameCount;
            recording = false;
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

    //connection
    microphone.connect ( recorder );
    recorder.connect( context.destination );
}

//failure callback for getUserMedia
function failureCB(e) {
    console.log('getUserMedia error: '+e);
    createWarning("getUserMedia failure"); 
}

//button animation
function buttonAnimation(timestamp) {
    if (!startButtonFrame) startButtonFrame = timestamp;
    var progress = timestamp - startButtonFrame;

    if (progress < recordTime*1000 ) {
        var displayTime = (recordTime - progress/1000).toFixed(2);
        if(displayTime < 0){
            displayTime  = (0).toFixed(2);
        }
        Btn.innerHTML = (displayTime<10) ? "0" + displayTime : displayTime;   

        window.requestAnimationFrame(buttonAnimation);
    }
    else{
        //stop recording
        stopRecording();
        
        //display related
        Btn.className = "";  
        Btn.innerHTML = "REC";
        Btn.disabled = false; 
        currentState.innerHTML = 'Playing...';
        //activate progress bar
        window.requestAnimationFrame(progressAnimation); 
    }
}

//progress animation
function progressAnimation(timestamp){
    if(recording){
        progressBar.style.backgroundColor = "transparent";
        frontBar.style.backgroundColor = "transparent";
        return;
    }
    if (!startProgressFrame) startProgressFrame = timestamp;
    var progress = timestamp - startProgressFrame;
    progressBar.style.backgroundColor = "#dfe5de";
    progressBar.style.width = barWidth + "px";
    frontBar.style.backgroundColor = "#2cc9c9";
    if (progress < recordTime*1000 ) {
        frontBar.style.width = (progress/1000/recordTime*barWidth).toFixed(0) + "px";  

        window.requestAnimationFrame(progressAnimation);
    }
    else{
        startProgressFrame = null;
        window.requestAnimationFrame(progressAnimation);
    }
}

//stop recording and play audio
function stopRecording() {
        console.timeEnd("recording_time");
        recording = false;    
        //flat the left and right channels
        var leftBuffer = combineBuffers ( leftchannel, recordingLength );
        var rightBuffer = combineBuffers ( rightchannel, recordingLength );

        //audioBuffer
        audioBuffer= context.createBuffer(channels,recordingLength, sampleRate);
        audioBuffer.getChannelData(0).set(leftBuffer);
        if( channels === 2 ){
            audioBuffer.getChannelData(1).set(rightBuffer);     
        }  
    
        console.log("audioBuffer duration= "+audioBuffer.duration);
    
        //audioBufferSource 
        audioBufferSource = context.createBufferSource();
        audioBufferSource.buffer = audioBuffer;

        //play audio
        audioBufferSource.connect(context.destination);           
        audioBufferSource.loop = true;
        audioBufferSource.start();    
}

//flat buffer
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

//create warning
function createWarning(reason) {
    warning = document.createElement("p");
    warning.className = "warning"; 
    warning.innerHTML = reason;
    document.body.appendChild(warning);       
}
