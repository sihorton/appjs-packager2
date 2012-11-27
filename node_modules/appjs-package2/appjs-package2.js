var fs = require('fs')
	path = require('path')
;
module.exports.Package = function() {
	var Me = {
		bundle:{
		path:''
		,localPath:''
		,footer:{
			size:4
		},dirPos:0
		,dir:{}
		,dirList:[]
	},readPackage:function(filename, callback) {
		Me.bundle.path = filename;
		fs.stat(Me.bundle.path,function(err,stats) {
			console.log("reading bundle, total size="+stats.size);
			console.log("reading footer:",stats.size-Me.bundle.footer.size)
			var readStream = fs.createReadStream(Me.bundle.path,{start:stats.size-Me.bundle.footer.size});
			var dat = '';
			readStream.on('data', function(buff) {
			  //assume it reads the whole footer in one go.
			  Me.bundle.dirPos = buff.readUInt32LE(0);
			  console.log("footer=",Me.bundle.dirPos);
			});
			readStream.on('end',function() {
				//we have now read everything into the buffer, load the dir index...
				console.log("reading dir",Me.bundle.dirPos,stats.size-Me.bundle.footer.size);
				var readFooter = fs.createReadStream(Me.bundle.path,{start:Me.bundle.dirPos,end:stats.size-(Me.bundle.footer.size+1)});
				var dat = '';
				readFooter.on('data',function(data) {
					dat+=data;
				});
				readFooter.on('end',function() {
					//we have now read in the buffer.
					Me.bundle.dir = JSON.parse(dat);
					if (callback) callback(Me.bundle);
				});
			});
			
		});
	},fileExists:function(file) {
		if (Me.bundle.dir[file]) {
			return true;
		}
		return false;
	},readStream:function(file) {
		//find the filename..
		if (Me.bundle.dir[file]) {
			var f = Me.bundle.dir[file];
			if (f.start == f.end) {
				//zero length file...
				var zeroLengthFile = function () {
				  this.readable = true;
				};
				require('util').inherits(zeroLengthFile,require('stream'));
				return new zeroLengthFile();
			} else {
			return fs.createReadStream(Me.bundle.path,{start:f.start,end:f.end-1});
			}
		} else {
			throw "file does not exist:"+file;
		}
	},extractTo:function(file,folder,callback) {
		var toFolder = path.dirname(folder+'/'+file);
		Me.createFullPath(toFolder,0755,function() {
			var s = Me.readStream(file);
			var w = fs.createWriteStream(folder+'/'+file);
			
			w.on('error',function(err) {
				console.log("error:",err);
				//w.end();
				//s.end();
				//if(callback) callback(err);
			});
			w.on('close',function() {
				//if (callback) callback();
			});
			s.pipe(w);
			s.on('close',function() {
				if (w.writable) w.end();
				if (callback) callback();
			});
		});
	},extractAllTo:function(folder,userCallback) {
		Me.bundle.localPath = folder;
		//extract everything to that local path...
		var myExtractList = [];
		for(var f in Me.bundle.dir) {
			myExtractList.push(f);
		}
		var dirPos = -1;
		var f = myExtractList[0];
		var callback = function(err) {
			if (err) console.log(err);
			dirPos++;
			if (dirPos < myExtractList.length) {
				console.log("extracting",myExtractList[dirPos]);
				Me.extractTo(myExtractList[dirPos],Me.bundle.localPath,callback);
			} else {
				console.log("everything extracted!",dirPos);
				userCallback();
			}
		};
		callback();
	
	},createPackage:function(filename,appFolder) {
		var bundle1 = fs.createWriteStream(filename,{});
		bundle1.end();//for now make sure the file is ready to be written.
		Me.bundle.path = filename;
		Me.bundle.localPath = appFolder;
	},addAFile:function(file,callback) {
		
	}
	,addFiles:function(files,callback) {
		var fpos = 0;
		var fsize = 0;
		var addNextFile = function() {
			//add the next file...
			if (fpos<files.length) {
				var bundle1 = fs.createWriteStream(Me.bundle.path,{flags:'a'});
				var f = files[fpos];
				var fsizeRead = 0;
				bundle1.on('close',function(err) {
					//find out how big it is now, and add to directory index..
					fs.stat(Me.bundle.path,function(err,stats) {
							//console.log(path.basename(Me.bundle.path),"file added:",f.name,stats.size);
						if((stats.size-fsize) != fsizeRead) {
						console.log("====================================");
						console.log("calc=",(stats.size-fsize),"read size=",fsizeRead,f.name);
						}
						Me.bundle.dir[f.name] = {
							size:stats.size
							,mode:stats.mode
							,nlink:stats.nlink
							,gid:stats.gid
							,uid:stats.uid
							,atime:stats.atime
							,mtime:stats.mtime
							,ctime:stats.ctime
							,start:fsize
							,end:stats.size
							,name:f.name
						}
						fsize = stats.size;
						fpos++;
						addNextFile();
					});
				});
				//console.log("add ",fpos,f);
				fs.stat(f.path,function(err,stats) {
					fsizeRead = stats.size;
					var r = fs.createReadStream(f.path,{});
					r.pipe(bundle1);
					r.on('end',function() {
						bundle1.end();
					});
				});
			} else {
				fs.stat(Me.bundle.path,function(err,stats) {
					Me.bundle.dirPos = stats.size;
					console.log(path.basename(Me.bundle.path),"all files added, writing directory",Me.bundle.dirPos);
					var bundle1 = fs.createWriteStream(Me.bundle.path,{flags:'a'});
					bundle1.on('close',function(err) {
						console.log("wrote directory listing");
							
						var Buffer = require('buffer').Buffer;
						var bundleRecord = new Buffer(Me.bundle.footer.size);
						
						var offset = 0;
						var writeInt32 = function (buffer, data) {
							buffer[offset] = data & 0xff;
							buffer[offset + 1] = (data & 0xff00) >> 0x08;
							buffer[offset + 2] = (data & 0xff0000) >> 0x10;
							buffer[offset + 3] = (data & 0xff000000) >> 0x18;
							offset += 4;        
						};
						writeInt32(bundleRecord,Me.bundle.dirPos);
						
						/*var jsWriteInt32 = function(buffer, integer) {
							_pos = 0;
							buffer[_pos++] = (integer &gt;&gt;&gt; 24);
							buffer[_pos++] = (integer &gt;&gt;&gt; 16);
							buffer[_pos++] = (integer &gt;&gt;&gt; 8);
							buffer[_pos++] = integer;
							return this;
						};*/
						//jsWriteInt32(bundleRecord,stats.size);
						
						var bundle1 = fs.createWriteStream(Me.bundle.path,{flags:'a'});
						bundle1.write(bundleRecord);
						bundle1.end();
						console.log("wrote bundleRecord");
						if (typeof callback != 'undefined') {
							callback();
						}
						
					});
					bundle1.write(JSON.stringify(Me.bundle.dir));
					bundle1.end();
					
				});
			}
		}
		addNextFile();
	},createFullPath:function (folderPath, mode, callback, position) {
		mode = mode || 0777;
		position = position || 0;
		parts = path.normalize(folderPath).split(path.sep);
		if (position >= parts.length) {
			if (callback) {
				return callback();
			} else {
				return true;
			}
		}

		var directory = parts.slice(0, position + 1).join(path.sep);
		fs.stat(directory, function(err) {
			if (err === null) {
				Me.createFullPath(folderPath, mode, callback, position + 1);
			} else {
				console.log("created dir:"+directory);
				fs.mkdir(directory, mode, function (err) {
					if (err) {
						if (callback) {
							return callback(err);
						} else {
							throw err;
						}
					} else {
						Me.createFullPath(folderPath, mode, callback, position + 1);
					}
				})
			}
		})
	}
}
	return Me;
};