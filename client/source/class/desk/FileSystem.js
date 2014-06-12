/**
 * Singleton helper class for file system operations : path->URL conversion, session management etc...
 * @lint ignoreDeprecated(alert)
 */
qx.Class.define("desk.FileSystem", 
{
	extend : qx.core.Object,

	type : "singleton",

	construct : function() {
		this.__baseURL = qx.bom.Cookie.get("homeURL") || '/';
		this.__actionsURL = this.__baseURL + 'rpc/';
		this.__filesURL = this.__baseURL + 'files/';
	},

	statics : {
		/**
		* Loads a file into memory. Depending on the file type, the result can be a string, a json object or an xml element
		*
		* @param file {String} the file to load
		* @param callback {Function} success callback, with request as first parameter
		* @param context {Object} optional context for the callback
		* @param forceText {Boolean} boolean to force response as text instead of json or xml
		* 
		* <pre class='javascript'>
		* example :<br>
		* desk.FileSystem.readFile ("myFilePath", function (err, result) {<br>
		*   if (!err) {<br>
		*      // do something with result<br>
		*   } else {<br>
		*      // read error message<br>
		*   }<br>
		*});<br>
		*</pre>
		*/
		readFile : function (file, callback, context, options) {
			options = options || {};
			var url = desk.FileSystem.getFileURL(file);
			if (options.cache !== false) {
				url += "?nocache=" + Math.random();
			}
			var req = new qx.io.request.Xhr(url);
			req.setAsync(true);
			req.addListener('load', function () {
				var response;
				if (options.forceText) {
					response = req.getResponseText()
				} else {
					response = req.getResponse()
				}
				callback.call(context, null, response);
				req.dispose();
			});
			req.addListener('fail', function (e) {
				callback.call(context, req.getStatusText());
				req.dispose();
			});
			req.send();					
		},

		/**
		* Writes a string to a file
		*
		* @param file {String} the file to write to
		* @param content {String} the string to write
		* @param callback {Function} callback when done
		* @param context {Object} optional context for the callback
		* 
		* <pre class="javascript">
		* example : <br>
		* desk.FileSystem.writeFile ("myFilePath", myContent, function () {<br>
		* // here, the file has been written to disk<br>
		* });<br>
		* </pre>
		*/
		writeFile : function (file, content, callback, context) {
			desk.Actions.getInstance().launchAction({
				action : "write_binary",
				file_name : desk.FileSystem.getFileName(file),
				base64data : qx.util.Base64.encode(content, true),
				output_directory : desk.FileSystem.getFileDirectory(file)},
				callback, context);
		},

		/**
		* extracts the directory from input file.
		*
		* @param file {String} the file
		* @return {string} the directory the file resides in
		* <pre class="javascript">
		* example : 
		* desk.FileSystem.getFileDirectory ('data/test/foo.txt');
		* returns 'data/test/'
		* </pre>
		*/
		getFileDirectory : function (file) {
			var slashIndex = file.lastIndexOf('/');
			if (slashIndex >= 0) {
				return file.substring(0, slashIndex+1);
			}
			else {
				return '/';
			}
		},

        /**
		* returns the file extension
		*
		* @param file {String} the file
		* @return {string} file extension
		* <pre class="javascript">
		* example : <br>
		* desk.FileSystem.getFileDirectory ('data/test/foo.txt');<br>
		* returns 'txt'<br>
		* </pre>
		*/
        getFileExtension : function (file) {
			var dotIndex = file.lastIndexOf('.');
			if (dotIndex >= 0) {
				return file.substring(dotIndex + 1);
			}
			else {
				return '';
			}
		},

		/**
		* extracts the name from input file (without full path)
		*
		* @param file {String} the file
		* @return {string} name of the file
		* <pre class="javascript">
		* example : 
		* desk.FileSystem.getFileName ('data/test/foo.txt');
		* returns 'foo.txt'
		* </pre>
		*/	
		getFileName  : function (file) {
			var slashIndex = file.lastIndexOf('/');
			if (slashIndex >= 0) {
				return file.substring(slashIndex+1, file.length);
			}
			else {
				return file;
			}
		},

		/**
		* Translates a file path to an URL
		*
		* @param file {String} file path
		*
		* @return {String} the file URL
		*/
		getFileURL : function (file) {
			return desk.FileSystem.getInstance().__filesURL + file;
		},

		/**
		* traverse all files contained in the input directory
		*
		* @param directory {String} directory path
		* @param iterator {Function} iterator applied to each file name
		* @param callback {Function} callback when done
		* @param context {Object} optional context for the callback
		* @ignore (async.queue)
		*/
		traverse : function (directory, iterator, callback, context) {
			var crawler = async.queue(function (directory, callback) {
				desk.FileSystem.readDir(directory, function (files) {
					files.forEach(function (file) {
						var fullFile = directory + "/" + file.name;
						if (file.isDirectory) {
							crawler.push(fullFile);
						} else {
							iterator(fullFile)
						}
					});
					callback();
				});
			}, 4);

			crawler.push(directory);
			crawler.drain = function () {
				if (typeof callback === "function") {
					callback.apply(context);
				};
			};
		},

		/**
		* Returns the URL for a specific action
		* @param action {String}
		* 
		* @return {String} actionsURL
		*/
		getActionURL : function (action) {
			return desk.FileSystem.getInstance().__actionsURL + action;
		},

		/**
		* executes the javascript code in file
		* @param file {String} the file to execute
		* @param callback {Function} callback when done
		* @param context {Object} optional context for the callback
		*/
		executeScript : function (file, callback, context) {
			desk.Actions.init(function () {
				desk.FileSystem.readFile(file, function (err, response) {
					var code = new Function(response);
					code();
					if (typeof callback == 'function') {
						callback.call(context);
					}
				});
			});
		},

		/**
		* tests whether a file (or directory) exists or not
		* @param path {String} the path to test
		* @param callback {Function} callback with boolean as parameter when done
		* @param context {Object} optional context for the callback
		*/
		exists : function (path, callback, context) {
			desk.FileSystem.get('exists', {path : path}, function (result) {
				callback.call(context, result.exists);
			});
		},

		/**
		* gets the lists of files in a directory
		* @param path {String} the directory to list
		* @param callback {Function} callback with array of files as parameter
		* @param context {Object} optional context for the callback
		*/
		readDir : function (path, callback, context) {
			desk.FileSystem.get('ls', {path : path}, callback, context);
		},

		/**
		* includes the scripts provided in the input array
		* @param scripts {Array} the scripts to load
		* @param callback {Function} callback when done
		* @param context {Object} optional context for the callback
		*/
		includeScripts : function (scripts, callback, context) {
			var fs = desk.FileSystem.getInstance();
			if (!fs.__includedScripts) {
				fs.__includedScripts = {};
			}
			var index = -1;
			var req = new qx.bom.request.Script();
			req.onload = myScriptLoader;

			function myScriptLoader() {
				if (index >= 0) {
					fs.__includedScripts[scripts[index]] = 1;
				}
				index += 1;
				if (index !== scripts.length) {
					if (fs.__includedScripts[scripts[index]] === 1) {
						// the script is already loaded. Use a timeout to stay async
						setTimeout(myScriptLoader,1);
					} else {
						req.open("GET", scripts[index]);
						req.send();
					}
				} else {
					req.dispose();
					if (typeof callback === 'function') {
						callback.apply(context);
					}
				}
			}
			myScriptLoader();
		},

		get : function (action, params, callback, context) {
			desk.FileSystem.__xhr('GET', action, params, function (request) {
				callback.call(context, JSON.parse(request.getResponseText()));
			});		
		},

		__xhr : function (method, action, requestData, callback, context) {
			var fs = desk.FileSystem.getInstance();
			var req = new qx.io.request.Xhr();
			req.setUrl(fs.__actionsURL + action);
			req.setRequestData(requestData);
			req.setMethod(method);
			req.setAsync(true);
			req.addListener('load', function (e) {
				callback.call(context, e.getTarget());
				req.dispose();
			});
			req.send();
		}
	},

	members : {
		__baseURL : null,
		__filesURL : null,
		__actionsURL : null,

		__includedScripts : null,

		/**
		* Returns the base URL string
		*
		* @return {String} baseURL
		*/
		getBaseURL : function () {
			return this.__baseURL;
		},

		/**
		* Returns the directory for the given file, session type and Id
		*
		* @param file {String} file path
		* @param sessionType {String} session type (e.g. "gcSegmentation")
		* @param sessionId {Number} session Id
		*
		* @return {String} directory path
		*/
		getSessionDirectory : function (file,sessionType,sessionId) {
			return file+"."+sessionType+"."+sessionId;
		},

		/**
		* creates an array containing sessions of given type (string)
		* sessions are directories for which the name contains in order:
		* -the file name
		* -the session type
		* -the session Id
		* all separated by a "."
		* @param file {String} file path
		* @param sessionType {String} session type (e.g. "gcSegmentation")
		* @param callback {Function} the callback when the list is constructed
		*
		* the array is the first parameter for the callback function
		*/ 
		getFileSessions : function (file, sessionType, callback) {
			if (sessionType === null) {
				alert('error : no session type asked');
				return;
			}

			var directory = desk.FileSystem.getFileDirectory(file);
			var shortFileName = desk.FileSystem.getFileName(file);
			desk.FileSystem.readDir(directory, function (files) {
				var sessions=[];
				for (var i = 0; i != files.length; i++) {
					var child = files[i];
					var childName = child.name;
					if (child.isDirectory) {
						//first, test if the directory begins like the file
						if (childName.substring(0, shortFileName.length + 1) == (shortFileName + ".")) {
							var remaining = childName.substring(shortFileName.length + 1);
							var childSession = remaining.substring(0, sessionType.length + 1);
							if (childSession == (sessionType + ".")) {
								var sessionId = parseInt(remaining.substring(childSession.length), 10);
								sessions.push(sessionId);
							}
						}
					}
				}
				// we need to tweak the .sort() method so that it generates correct output for ints
				function sortNumber(a,b)
				{
					return b - a;
				}
				sessions.sort(sortNumber);
				callback(sessions);
			});
		},

		/**
		* Creates a new session
		* sessions are directories for which the name contains in order:
		* -the file name
		* -the session type
		* -the session Id
		* all separated by a "."
		* @param file {String} file path
		* @param sessionType {String} session type (e.g. "gcSegmentation")
		* @param callback {Function} the callback when the session is created
		*
		* executes the callback with the new session Id as parameter when finished
		*/
		createNewSession : function (file, sessionType, callback) {
			this.getFileSessions(file, sessionType, function (sessions) {
				var maxId = -1;
				for (var i = 0; i < sessions.length; i++) {
					var sessionId = sessions[i];
					if (sessionId > maxId)
						maxId = sessionId;
				}
				var newSessionId = maxId + 1;
				var lastSlash = file.lastIndexOf("/");
				var subdir = file.substring(lastSlash+1) + "." + sessionType + "." + newSessionId;

				desk.Actions.getInstance().launchAction({
					"action" : "add_subdirectory",
					"subdirectory_name" : subdir,
					"output_directory" : file.substring(0,lastSlash)},
					function () {
						callback(newSessionId);
				});
			});
		}
	}
});
