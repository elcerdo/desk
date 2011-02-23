
o3djs.base.o3d = o3d;
o3djs.require('o3djs.webgl');
o3djs.require('o3djs.math');
o3djs.require('o3djs.quaternions');
o3djs.require('o3djs.rendergraph');
o3djs.require('o3djs.pack');
o3djs.require('o3djs.arcball');
o3djs.require('o3djs.event');
o3djs.require('o3djs.cameracontroller');
o3djs.require('o3djs.primitives');

// Events
// Run the init() function once the page has finished loading.
// Run the uninit() function when the page has is unloaded.
window.onload = init;
window.onunload = uninit;

// global variables
var g_o3d;
var g_math;
var g_pack;
var g_client;

var g_o3dWidth = -1;
var g_o3dHeight = -1;

var g_viewInfo;
var g_cameracontroller;

function updateClient() {
  // If we are in RENDERMODE_ON_DEMAND mode then set the render mode again
  // which will cause the client re-render the display.
  if (g_client.renderMode == g_o3d.Client.RENDERMODE_ON_DEMAND) {
    g_client.render();
  }
}

function renderCallback(renderEvent) {
  resize();
    g_client.renderMode = g_o3d.Client.RENDERMODE_ON_DEMAND;
}


function AddMeshes(xmlFile, transform)
{
	var xmlhttp=new XMLHttpRequest();
//	xmlhttp.setRequestHeader( Cache-Control,no-cache);
	xmlhttp.open("GET",xmlFile,false);
	xmlhttp.send();
	var readString=xmlhttp.responseXML;

	var meshes=readString.getElementsByTagName("mesh");

	var slashIndex=xmlFile.lastIndexOf("/");

	var path="";
	if (slashIndex>0)
		path=xmlFile.substring(0,slashIndex);

	for (var i=0;i<meshes.length;i++)
	{
		var mesh=meshes[i];
		var file=mesh.getAttribute("Mesh");
		var Label=mesh.getAttribute("Label");
		var color=[1.0,1.0,1.0,1.0];
		if (mesh.hasAttribute("color"))
		{
			var colorstring=mesh.getAttribute("color");
			var colors=colorstring.split(" ");
			for (var j=0;j<4;j++)
				color[j]=parseFloat(colors[j]);
		}
		if (Label!="0")
			transform.addShape(createFromFile(path+"/"+file,g_pack,color));
	}
}
/**
 * Creates the client area.
 */
function init() {
  o3djs.webgl.makeClients(initStep2);
}

function setClientSize() {
  var newWidth  = g_client.width;
  var newHeight = g_client.height;

  if (newWidth != g_o3dWidth || newHeight != g_o3dHeight) {
    g_o3dWidth = newWidth;
    g_o3dHeight = newHeight;

    // Set the perspective projection matrix
    g_viewInfo.drawContext.projection = g_math.matrix4.perspective(
      g_math.degToRad(45), g_o3dWidth / g_o3dHeight, 0.1, 10000);

    // Sets a new area size for arcball.
    g_cameracontroller.setAreaSize(g_o3dWidth, g_o3dHeight);

    //o3djs.dump.dump("areaWidth: " + g_o3dWidth + "\n");
    //o3djs.dump.dump("areaHeight: " + g_o3dHeight + "\n");
  }
}

function resize() {
  setClientSize();
}

var g_dragging = false;

function startDragging(e) {
	g_dragging = true;

	if ((e.shiftKey)||(e.button==1))
		g_cameracontroller.setDragMode(o3djs.cameracontroller.DragMode.MOVE_CENTER_IN_VIEW_PLANE,e.x,e.y);
	else
		g_cameracontroller.setDragMode(o3djs.cameracontroller.DragMode.SPIN_ABOUT_CENTER,e.x,e.y);
}

function drag(e) {
	if (g_dragging) {
		g_cameracontroller.mouseMoved(e.x,e.y);
		g_viewInfo.drawContext.view=g_cameracontroller.calculateViewMatrix();
		updateClient();
	}
}

function stopDragging(e) {
	g_dragging = false;
	g_cameracontroller.setDragMode(o3djs.cameracontroller.DragMode.NONE);
}

function scrollMe(e) {
  if (e.deltaY) {
//    g_camera.eye =
 //       g_math.mulScalarVector((-e.deltaY < 0 ? 15 : 7) / 12, g_camera.eye);
 //   g_viewInfo.drawContext.view = g_math.matrix4.lookAt(g_camera.eye,
  //                                                      g_camera.target,
  //                                                      [0, 1, 0]);
	g_cameracontroller.backpedal*=(e.deltaY < 0 ? 14 : 10)/12;
	g_viewInfo.drawContext.view=g_cameracontroller.calculateViewMatrix();
	updateClient();
  }
}
/**
 * Initializes O3D, creates the object and sets up the transform and
 * render graphs.
 * @param {Array} clientElements Array of o3d object elements.
 */
function initStep2(clientElements) {
	// Initializes global variables and libraries.
	var o3dElement = clientElements[0];
	g_client = o3dElement.client;
	g_o3d = o3dElement.o3d;
	g_math = o3djs.math;

	g_quaternions = o3djs.quaternions;
	g_lastRot = g_math.matrix4.identity();
	g_thisRot = g_math.matrix4.identity();

	// Create a pack to manage the objects created.
	g_pack = g_client.createPack();

	// Create the render graph for a view.
	g_viewInfo = o3djs.rendergraph.createBasicView(
	  g_pack,
	  g_client.root,
	  g_client.renderGraphRoot,
	  [1, 1, 1, 1]); //background color

	g_viewInfo.performanceState.getStateParam('CullMode').value = 
		g_o3d.State.CULL_NONE; 

	var Transform = g_pack.createObject('Transform');
	// Create the Shape for the mesh

	AddMeshes("http://www.creatis.insa-lyon.fr/~valette/meshView/coeurThorax/coeurthorax.xml", Transform);
//	AddMeshes("output.xml", Transform);
//	AddMeshes("coeur.xml", Transform);
//	Transform.addShape(createFromFile("heart.vtk",g_pack,[1,1,1,0.6]));
//	Transform.addShape(createFromFile("pericarde.vtk",g_pack,[1,1,1,0.6]));

//	Transform.addShape(createFromFile("skull.vtk",g_pack,[1,1,1,0.6]));
//	Transform.addShape(createFromFile("tore.vtk",g_pack,[1,1,1,0.6]));
//	var Shape=createFromFile("hand_full.vtk",g_pack,[1,1,1,0.6]);
//	Transform.addShape(createFromFile("sphere_80k.vtk",g_pack,[1,0,0,0.6]));
//	Transform.addShape(createFromFile("mesh.vtk",g_pack,[1,0,0,0.6]));
//	Transform.addShape(createFromFile("1.vtk",g_pack,[1,0,0,0.6]));
//	var Shape=createFromFile("ventriculeDroit.vtk",g_pack,[1,1,1,0.6]);

//	var Shape=createFromFile("oreillette_droite.xml",g_pack,[1,1,1,0.6]);
//	var Shape=createFromFile("rockerarm.xml",g_pack,[1,1,1,0.6]);
//	var Shape=createFromFile("bunny.xml",g_pack,[1,1,1,0.6]);
//	var Shape=createFromFile("hand.xml",g_pack,[1,1,1,1]);
//	var Shape=createFromFile("skull.xml",g_pack,[1,1,1,1]);
//	var Shape=createFromFile("heart.xml",g_pack,[1,1,1,1]);

	// Create a new transform and parent the Shape under it.


	Transform.parent = g_client.root;

	g_cameracontroller=o3djs.cameracontroller.createCameraController(
	[150,150,150],//centerPos,
	500,//backpedal,
	100,//heightAngle,
	100,//rotationAngle,
   0.8//fieldOfViewAngle,
   )//opt_onChange)

//	g_cameracontroller.viewAll(o3djs.util.getBoundingBoxOfTree(g_client.root),1);

//	o3djs.camera.fitContextToScene = function(treeRoot,
//                                          clientWidth,
//                                          clientHeight,
//                                          drawContext)

//	g_viewInfo.drawContext.view=g_cameracontroller.calculateViewMatrix();
	g_aball = o3djs.arcball.create(100, 100);
	setClientSize();
	g_viewInfo.drawContext.view=g_cameracontroller.calculateViewMatrix();

	o3djs.event.addEventListener(o3dElement, 'mousedown', startDragging);
	o3djs.event.addEventListener(o3dElement, 'mousemove', drag);
	o3djs.event.addEventListener(o3dElement, 'mouseup', stopDragging);
	o3djs.event.addEventListener(o3dElement, 'wheel', scrollMe);

	g_client.render();
	// Set our render callback for animation.
	// This sets a function to be executed every time a frame is rendered.
	g_client.setRenderCallback(renderCallback);
	window.onresize = updateClient;
}

/**
 * Removes any callbacks so they don't get called after the page has unloaded.
 */
function uninit() {
  if (g_client) {
    g_client.cleanup();
  }
}

