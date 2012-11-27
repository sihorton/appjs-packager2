var crypto = require('crypto');
var util = require('util');
var Stream = require('stream').Stream

function CryptoStream(opts, cipher) {
  this._key = opts.key;
  this._cipher = cipher;
  this.inputEncoding = opts.inputEncoding;
  this.outputEncoding = opts.outputEncoding;
  this.readable = this.writable = true;
  this.throwErrors = true;
  if (typeof opts.throwErrors != 'undefined') {
	this.throwErrors = opts.throwErrors;
  } 
}

util.inherits(CryptoStream, Stream);
exports.CryptoStream = CryptoStream;

CryptoStream.prototype.write = function(data) {
  this.emit("data", this._cipher.update(data, this.inputEncoding, this.outputEncoding));
  return true
}

CryptoStream.prototype.end = function(data) {
	if (data) this.write(data);
	try {
		this.emit("data", this._cipher.final(this.outputEncoding))
	} catch(e) {
		if (this.throwErrors) this.emit("error",e);
	}
	this.emit("end");
}

function coearseOpts (opts) {
  return 'string' == typeof opts ? {key: opts, algorithm: 'aes192'} : opts
}
var EncryptStream = function(opts) {
  opts = coearseOpts(opts)
  EncryptStream.super_.call(this, opts, crypto.createCipher(opts.algorithm, opts.key));
}

util.inherits(EncryptStream, CryptoStream);
exports.EncryptStream = EncryptStream;
module.exports.Encrypter = function(opts) {
	return new EncryptStream(opts);
}
module.exports.encryptStream = function(stream,opts) {
	if (!opts.outputEncoding) opts.outputEncoding = 'base64';
	var encrypt = new EncryptStream(opts);
	var b64Streamer = require('./base64-streamer.js');
	var encode = b64Streamer.Encoder();
	
	stream.pipe(encode);
	encode.pipe(encrypt);
	return encrypt;
}


var DecryptStream = function(opts) {
  opts = coearseOpts(opts)
  DecryptStream.super_.call(this, opts, crypto.createDecipher(opts.algorithm, opts.key));
}

util.inherits(DecryptStream, CryptoStream);
exports.DecryptStream = DecryptStream;
module.exports.Decrypter = function(opts) {
	return new DecryptStream(opts);
}

module.exports.decryptStream = function(stream,opts) {
	//if (!opts.outputEncoding) opts.outputEncoding = 'base64';
	var decrypt = new DecryptStream(opts);
	var b64Streamer = require('./base64-streamer.js');
	var decode = b64Streamer.Decoder();
	
	stream.pipe(decrypt);
	decrypt.pipe(decode);
	return decode;
}