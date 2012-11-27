var fs=require('fs');
var file = __filename;
//var binfile = "rainbowsky.jpg";//a binary file to test with.

var b64Streamer = require('./base64-streamer.js');
console.log("input file:",file);

var read = fs.createReadStream(file);
var encode = b64Streamer.Encoder();
var decode = b64Streamer.Decoder();
var readStreamText = "";
read.on('data',function(dat) {
	readStreamText += dat;
});
var encodeText = "";
encode.on('data',function(dat) {
	encodeText += dat;
});
encode.on('end',function(dat) {
	fs.readFile(file,function(err,data) {
		/* Test1: stream encode == static encode */
		console.log(encodeText == data.toString('base64'),"stream encode == static encode");
	});
	
});
read.pipe(encode);

var decodeStreamText = "";
decode.on('data',function(dat) {
	decodeStreamText += dat;
});
decode.on('end',function() {
	/* Test2: decoded text == read text */
	console.log(decodeStreamText == readStreamText,"decodedText = readText");
});
encode.pipe(decode);

if (binfile) {
	var bread = fs.createReadStream(binfile);
	var bencode = b64Streamer.Encoder();
	var bdecode = b64Streamer.Decoder();
	var write2 = fs.createWriteStream(binfile+'.base64');
	var write3 = fs.createWriteStream(binfile+'.unbase64');
	bread.pipe(bencode);
	bencode.pipe(write2);
	bencode.pipe(bdecode).pipe(write3);
}