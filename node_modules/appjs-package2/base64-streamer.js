var stream = require('stream');

/**
* Create a streamer that inherits from the base stream class.
* - base64 operates on 3 bytes at a time so chunk output along 3 byte boundaries
* - at the end send any remaining bytes.
*/
var base64EncodeStreamer = function () {
  this.readable = true;
  this.writable = true;
  this.boundaryBytes = undefined;
};
//inherit from stream base class.
require('util').inherits(base64EncodeStreamer, stream);

base64EncodeStreamer.prototype.write = function (chunk,encoding) {
	//convert string inputs into buffer since buffer provides base64 encoding.
	if(!Buffer.isBuffer(chunk)) {
		chunk = new Buffer(chunk);
	}
	if(Buffer.isBuffer(this.boundaryBytes)) {
		//get boundaryBytes left over from last data write.
		chunk = Buffer.concat([this.boundaryBytes, chunk], this.boundaryBytes.length + chunk.length);
		this.boundaryBytes = undefined;
	}
	//test for 3 byte boundary and store any left over bytes
	//in boundaryBytes for sending next data write
	var remaining = chunk.length % 3;
	if(remaining>0) {
		this.boundaryBytes = chunk.slice(chunk.length - remaining);
		chunk = chunk.slice(0, chunk.length - remaining);
	}
	//stream this data to listener.
	this.emit('data',chunk.toString('base64'),'base64');
};

base64EncodeStreamer.prototype.end = function (chunk,encoding) {
  //stream remaining boundaryBytes
  if(Buffer.isBuffer(this.boundaryBytes)) {
		this.emit('data', this.boundaryBytes.toString('base64'),'base64');
		this.boundaryBytes = undefined;
  }
  this.emit('end');
};
module.exports.Encoder = function() {
	return new base64EncodeStreamer();
}
/**
* Decoder just uses buffer class to decode on the fly.
*/
var base64DecodeStreamer = function () {
  this.readable = true;
  this.writable = true;
  this.boundaryBytes = undefined;
};
require('util').inherits(base64DecodeStreamer, stream);
base64DecodeStreamer.prototype.write = function (chunk,encoding) {
	//use buffer to decode.
	this.emit('data',new Buffer(chunk.toString(),'base64'));
};
base64DecodeStreamer.prototype.end = function (chunk,encoding) {
	args = Array.prototype.slice.call(arguments, 0);
	this.emit.apply(this, ['end'].concat(args));
};
module.exports.Decoder = function() {
	return new base64DecodeStreamer();
}