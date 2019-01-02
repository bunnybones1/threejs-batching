var THREE = require('three');
// require('./utils/threeSafety');
window.THREE = THREE;
var ManagedView = require('threejs-managed-view');
var Batching = require('./');
var urlparam = require('urlparam');
var view = new ManagedView.View({
	skipFrames: 10
});

var debugOverdraw = false;
//lights
var light = new THREE.PointLight(0xffffff, 0.7);
light.position.x += 100;
light.position.y += 100;
view.scene.add(light);
var hemisphereLight = new THREE.HemisphereLight(0x4f7f8f, 0x4f2f00);
view.scene.add(hemisphereLight);
var matParams = {
	color: 0xffffff,
	emissive: 0x000000,
	// color: 0xff4422,
	shininess: 100,
	blending: debugOverdraw ? THREE.AdditiveBlending : THREE.NormalBlending
};
var mat = new THREE.MeshPhongMaterial(matParams);

view.renderer.setClearColor(debugOverdraw ? 0x000000 : 0xdfefef, 1);

var centerOfView = new THREE.Vector3();
var totalBalls = urlparam('totalBalls', 20);

function rand(scale = 10) { return (Math.random() - 0.5) * scale; }
function randAngle(scale = 1) { return Math.random() * Math.PI * 2; }
var euler = new THREE.Euler();
var quat = new THREE.Quaternion();
function randQuat(scale = 0.1) { 
	euler.set(rand(scale), rand(scale), rand(scale));
	quat.setFromEuler(euler);
	return quat;
}

var balls = [];
for(var i = 0; i < totalBalls; i++) {
	var ball = new THREE.Mesh(new THREE.SphereGeometry(), mat);
	balls.push(ball);
	ball.position.set(rand(), rand(), rand());
	ball.rotation.set(randAngle(), randAngle(), randAngle());
	centerOfView.add(ball.position);
	view.scene.add(ball);
}
centerOfView.multiplyScalar(1 / totalBalls);

view.camera.position.x += 13;
view.camera.position.y += 2;
view.camera.position.z += 15;
view.camera.fov = 70;
view.camera.updateProjectionMatrix();
// var first = true;
var tasks = [];

function onEnterFrame() {
	if(tasks.length > 0) {
		for(var i = 0; i < tasks.length; i++) {
			tasks[i]();
		}
		tasks.length = 0;
	}

	centerOfView.set(0, 0, 0);
	for(var i = 0; i < totalBalls; i++) {
		var ball = balls[i];
		ball.position.multiplyScalar(0.99);
		ball.translateZ(0.1);
		ball.applyQuaternion(randQuat(0.1));
		// ball.position.set(rand(), rand(), rand());
		centerOfView.add(ball.position);
	}
	centerOfView.multiplyScalar(1 / totalBalls);
	
	//put light and camera focus in the center of gravity
	light.position.y += 10;
	var delta = view.camera.position.clone().sub(centerOfView);
	var angle = Math.atan2(delta.z, delta.x);
	angle += 0.002;
	var distance = Math.sqrt(delta.x*delta.x + delta.z*delta.z);
	var delta2 = delta.clone();
	delta2.x = Math.cos(angle) * distance;
	delta2.z = Math.sin(angle) * distance;
    view.camera.lookAt(centerOfView);
}
view.renderManager.onEnterFrame.add(onEnterFrame);

var RafTweener = require("raf-tweener");
var Pointers = require('input-unified-pointers');
var MouseWheel = require('input-mousewheel');
var CameraController = require("threejs-camera-controller-pan-zoom-unified-pointer");

var pointers = new Pointers(view.canvas);
var mouseWheel = new MouseWheel(view.canvas);
var rafTweener = new RafTweener();
rafTweener.start();
var camController = new CameraController({
	camera: view.camera,
	tweener: rafTweener,
	pointers: pointers,
	mouseWheel: mouseWheel,
	panSpeed: 0.02,
	fovMin: 50,
	fovMax: 70,
	zoomMax: 0.25,
	singleFingerPanEnabled: true
});
camController.setState(true);
camController.setSize(window.innerWidth, window.innerHeight);

var otherCamera = new THREE.PerspectiveCamera();
otherCamera.updateProjectionMatrix();

function setOtherCameraSize(w, h) {
	otherCamera.setViewOffset(
		w, 
		h, 
		w * 0.25, 
		h * 0.25, 
		w * 0.5, 
		h * 0.5
	);
}

setOtherCameraSize(window.innerWidth, window.innerHeight);
view.onResizeSignal.add(setOtherCameraSize);

view.renderManager.onEnterFrame.add(function(){
	camController.precomposeViewport(otherCamera);
});
view.renderManager.skipFrames = urlparam('skipFrames', 0);