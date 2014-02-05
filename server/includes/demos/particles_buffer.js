var numParticles = 100000;
var particlesSize = 10;
var vertexShader = [
    'uniform float amplitude;',
    'attribute float size;',
	'attribute vec3 customColor;',
	'varying vec3 vColor;',
	'void main() {',
		'vColor = customColor;',
		'vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',
        'gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );',
        'gl_Position = projectionMatrix * mvPosition;',
	'}'].join('\n');

var fragmentShader = [
	'uniform vec3 color;',
	'uniform sampler2D texture;',
	'varying vec3 vColor;',
	'void main() {',
    '	gl_FragColor = vec4( color * vColor, 1.0 );',
	'	gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );',
	'}'].join('\n');

var viewer = new desk.MeshViewer();
var scene = viewer.getScene();


var attributes = {
	size: {	type: 'f', value: null },
	customColor: { type: 'c', value: null }
};

var textureURL = desk.FileSystem.getFileURL('demos/spark1.png');

var uniforms = {
	amplitude: { type: "f", value: 1.0 },
	color:     { type: "c", value: new THREE.Color( 0xffffff ) },
	texture:   { type: "t", slot: 0, value: THREE.ImageUtils.loadTexture(textureURL)}
};

var shaderMaterial = new THREE.ShaderMaterial( {
    uniforms : uniforms,
	attributes :     attributes,
	vertexShader :   vertexShader,
	fragmentShader : fragmentShader,
	depthTest: false,
    transparent:	true
});

var radius = 200;
var geometry = new THREE.BufferGeometry();
geometry.dynamic = true;
geometry.attributes = {
    position: {
        itemSize: 3,
        array: new Float32Array( numParticles * 3 ),
        numItems: numParticles * 3
    },
    size: {
        itemSize: 1,
        array: new Float32Array( numParticles ),
        numItems: numParticles
    },
    customColor: {
        itemSize: 3,
        array: new Float32Array( numParticles * 3 ),
        numItems: numParticles * 3
    }
};

var positions = geometry.attributes.position.array;

for ( var i = 0; i < numParticles; i++ ) {
    var i3 = i * 3;
	positions[i3] = radius * (Math.random() * 2 - 1);
    positions[i3 + 1] = radius * (Math.random() * 2 - 1);
    positions[i3 + 2] = radius * (Math.random() * 2 - 1);
}

var vertices = geometry.vertices;
var values_size = geometry.attributes.size.array;
var values_color = geometry.attributes.customColor.array;

var myColor = new THREE.Color();

for( var v = 0; v < numParticles; v++ ) {
	values_size[ v ] = particlesSize;
    var v3 = 3 * v;
	if ( positions[ v3 ] < 0 ) {
        myColor.setHSL(0.5 + 0.1 * ( v3 / values_color.length ), 0.7, 0.5);
	} else {
        myColor.setHSL(0.1 * ( v3 / values_color.length ), 0.9, 0.5);
	}
	values_color[v3] = myColor.r;
    values_color[v3  + 1] = myColor.g;
    values_color[v3  + 2] = myColor.b;
}
var system = new THREE.ParticleSystem( geometry, shaderMaterial );

viewer.addMesh(system);
viewer.viewAll();
viewer.render();

viewer.addListener("render", animation);

function animation() {
    var numberOfParticules = geometry.attributes.size.numItems;
    var values = geometry.attributes.size.array;
    var time = new Date().getTime() * 0.005;
	system.rotation.z = 0.01 * time;
	for(var i = 0; i < numberOfParticules; i++) {
        values[ i ] = particlesSize * (1 + Math.sin( 0.001 * i + time ));
	}
    geometry.attributes.size.needsUpdate = true;
    viewer.render();
}
