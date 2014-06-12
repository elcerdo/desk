var fs           = require('fs'),
	os           = require('os'),
	libPath      = require('path'),
	express      = require('express'),
	http         = require('http'),
	https        = require('https'),
	formidable   = require('formidable'),
	mkdirp       = require('mkdirp'),
	argv         = require('yargs').argv,
	actions      = require(__dirname + '/cl-rpc/cl-rpc'),
	compress     = require('compression'),
	auth         = require('basic-auth'),
	bodyParser   = require('body-parser'),
	directory    = require('serve-index'),
	errorhandler = require('errorhandler'),
	mv           = require('mv');

var separator = "*******************************************************************************";
console.log(separator);
console.log(separator);

// user parameters
var clientPath = fs.realpathSync(__dirname + '/../client/')+'/',
	port = 8080,
	homeURL = '/';

// configure express server
var app = express();
app.use(compress());

var	user = process.env.USER;

// use custom port and homeURL if in a multi-user configuration
if (argv.multi) {
    homeURL = '/' + user + '/',
   	port = process.getuid();

	// transmit homeURL cookie
	app.use (function (req, res, next) {
		res.cookie('homeURL', homeURL);
		next();
	});
}

var	deskPath = '/home/' + user + '/desk/',
	uploadDir = deskPath + 'upload/',
	extensionsDir = deskPath + 'extensions/';

// make desk and upload directories if not existent
mkdirp.sync(deskPath);
mkdirp.sync(uploadDir);

// certificate default file names
var passwordFile = deskPath + "password.json",
	privateKeyFile = "privatekey.pem",
	certificateFile = "certificate.pem";

console.log('Welcome to Desk');
console.log('Running as user : ' + user);
console.log(separator);

// look for correctly formated password.json file.
if (!fs.existsSync(passwordFile)) {
	fs.writeFileSync(passwordFile, JSON.stringify({username : user,
		password : 'password'}));
}

// use basicAuth depending on password.json
var id = require(passwordFile);
if (id.username && id.password) {
	app.use(function(req, res, next) {
		var user = auth(req);
		if (user && user.name == id.username && user.pass == id.password) {
			next();
		} else {
			res.statusCode = 401;
			res.setHeader('WWW-Authenticate', 'Basic realm="' +
				"please enter your login/password" + '"');
			res.end('Unauthorized');
		}
	});
	console.log("Using basic authentication");
} else {
	console.log("No password file " + passwordFile + " provided or incorrect file");
	console.log("see " + passwordFile + ".example file for an example");
}

// handle body parsing
app.use(bodyParser());

var router = express.Router();
app.use(homeURL, router);

var rpc = express.Router();
router.use('/rpc', rpc);

if (fs.existsSync(clientPath + 'default')) {
	console.log('serving custom default folder');
	router.use('/', express.static(clientPath + 'default'));
} else {
	console.log('serving default folder application/release/');
	router.use('/', express.static(clientPath + 'application/release/'));
}

router.use('/files', express.static(deskPath))
.use('/files', directory(deskPath))
.use('/', express.static(clientPath))
.use('/', directory(clientPath))

rpc.post('/upload', function(req, res) {
	var form = new formidable.IncomingForm();
	form.uploadDir = uploadDir;
	form.parse(req, function(err, fields, files) {
		var file = files.file;
		var outputDir = fields.uploadDir.toString().replace(/%2F/g,'/') || 'upload';
		outputDir = deskPath + outputDir;
		console.log("file : " + file.path.toString());
		var fullName = libPath.join(outputDir, file.name.toString());
		console.log("uploaded to " +  fullName);
		mv(file.path.toString(), fullName, function(err) {
			if (err) throw err;
			res.send('file ' + file.name + ' uploaded successfully');
		});
	});
})
.post('/action', function(req, res){
	res.connection.setTimeout(0);
	actions.performAction(req.body, function (response) {
		res.json(response);
	});
})
.post('/reset', function(req, res){
	actions.update(function (message) {
		res.send(message);
	});
})
.post('/password', function(req, res){
	if (!req.body.password) {
		res.json({error : 'no password entered!'});
		return;
	}
	if (req.body.password.length > 4) {
		identity.password = req.body.password;
		fs.writeFileSync(passwordFile, JSON.stringify(identity));
		res.json({status : "password changed"});
	} else {
		res.json({error : 'password too short!'});
	}
})
.get('/exists', function (req, res) {
	var path = req.query.path;
	fs.exists(deskPath + path, function (exists) {
		console.log('exists : ' + path	+ ' : ' + exists);
		res.json({exists : exists});
	});
})
.get('/ls', function (req, res) {
	var path = libPath.normalize(req.query.path) + '/';
	actions.validatePath(path, function (error) {
		if (error) {
			res.json({error : error});
			return;
		}
		actions.getDirectoryContent(path, function (message) {
			res.send(message);
		});
	});
})
.get('/download', function (req, res) {
	var file = req.query.file;
	actions.validatePath(file, function (error) {
		if (error) {
			res.send(error);
			return;
		}
		res.download(deskPath + file);
	});
});

// handle errors
app.use(errorhandler({
	dumpExceptions: true, 
	showStack: true
}));

console.log(separator);

var server;
var baseURL;

// run the server in normal or secure mode depending on provided certificate
if (fs.existsSync(privateKeyFile) && fs.existsSync(certificateFile)) {
	var options = {
		key: fs.readFileSync(privateKeyFile),
		cert: fs.readFileSync(certificateFile)
	};
	server = https.createServer(options, app);
	console.log("Using secure https mode");
	baseURL = "https://";
} else {
	server = http.createServer(app);
	console.log("No certificate provided, using non secure mode");
	console.log("You can generate a certificate with these 3 commands:");
	console.log("(1) openssl genrsa -out privatekey.pem 1024");
	console.log("(2) openssl req -new -key privatekey.pem -out certrequest.csr");
	console.log("(3) openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem");
	baseURL = "http://";
}
console.log(separator);

// make extensions directory if not present
mkdirp.sync(extensionsDir);

actions.addDirectory(__dirname + '/includes/');
actions.addDirectory(extensionsDir);
actions.setRoot(deskPath);

actions.update(function () {
	server.listen(port);
	console.log(separator);
	console.log(new Date().toLocaleString());
	console.log ("server running on port " + port);
	console.log(baseURL + "localhost:" + port + homeURL);
	if (id) {
		console.log('login as : user : "' + id.username + '", password : "' + id.password + '"');
	}
});

// small hack to relaunch the server when needed
console.log('hint : modify the file "touchMeToRestart" to restart the server');
fs.watchFile(__dirname + '/touchMeToRestart', function () {
	// just crash the server, the forever module will restart it
	crash();
});
