var fs=require('fs')
	path = require('path');
var key = new Buffer('nodecryptostream');
var file = __filename;
var file = "rainbowsky.jpg";
console.log("input file:",file);

var cryptoStreamer = require('./crypto-streamer.js');

/* Test1: read, encrypt, decrypt check same. */
var read = fs.createReadStream(file);
var encStream = cryptoStreamer.encryptStream(read,'nodecryptostream');
var decStream = cryptoStreamer.decryptStream(encStream,'nodecryptostream');
var readText = "";
read.on('data',function(dat) {
	readText += dat;
});
var decodeText = "";
decStream.on('data',function(dat) {
	decodeText += dat;
});
decStream.on('end',function() {
	console.log(decodeText == readText,"stream encode == read text");
});

/* Test2: read, encrypt, decrypt with different key check not same. */
var read2 = fs.createReadStream(file);
var encStream2 = cryptoStreamer.encryptStream(read2,{key:'key',throwErrors:false,algorithm: 'aes192'});
var decStream2 = cryptoStreamer.decryptStream(encStream2,{key:'wrongkey',throwErrors:false,algorithm: 'aes192'});
var readText2 = "";
read2.on('data',function(dat) {
	readText2 += dat;
});
var decodeText2 = "";
decStream2.on('data',function(dat) {
	decodeText2 += dat;
});
decStream2.on('end',function() {
	console.log(!(decodeText2 == readText),"stream encode / decode wrong key != read text");
});