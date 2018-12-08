var camera;
var scene;
var renderer;

function makeModel (data) {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.x = 0;
    camera.position.y = 20;
    camera.position.z = -50;
    camera.lookAt(scene.position);

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(new THREE.Color(0x000000), 1.0);
    renderer.setSize(window.innerWidth / 2, window.innerHeight);


    var points = [];
    for (var i = 0; i < Object.keys(data).length - 1; ++i) {
        points.push(new THREE.Vector3(0, 0, (data[i]['JD'] - data[0]['JD'])));
    }
    // var points = [];
    // for (var i = 0; i < 20; i++) {
    //     var randomX = -20 + Math.round(Math.random() * 50);
    //     var randomY = -15 + Math.round(Math.random() * 40);
    //     var randomZ = -20 + Math.round(Math.random() * 40);
    //
    //     points.push(new THREE.Vector3(randomX, randomY, randomZ));
    // }
    // var path = new THREE.CatmullRomCurve3(points);
    // var positionData = [];
    // for (var i = 0; i < Object.keys(data).length - 1; i++) {
    //     positionData.push(data[i]['Q/I']);
    //     positionData.push(data[i]['U/I']);
    // }
    // var positionArray = new Float32Array(positionData);
    // const positionAttribute = new THREE.BufferAttribute(
    //     positionArray,
    //     2,
    //     false
    // );
    var positionObj = {};
    for (var i = 0; Object.keys(data).length - 1; i++) {
        positionObj[i] = {JD: data[i]['JD'], QI: data[i]['Q/I'], UI: data[i]['U/I']};
    }

    var tubeGeometry = new THREE.TubeGeometry(new THREE.SplineCurve3(points), data.length, 1, 32, false);
    // var colorMap = THREE.ImageUtils.loadTexture('img/1.png');
    var tubeMaterialShader = new THREE.ShaderMaterial({
        vertexShader: document.getElementById('vertexShaderSimple').textContent,
        fragmentShader: document.getElementById("fragmentShader").textContent,
            uniforms: {

            }
        // uniforms: {
        //     texture: {type: 't', value: colorMap}
        // }
    });
    var tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterialShader);
    tubeMesh.castShadow = true;
    scene.add(tubeMesh);

    var directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(-20, 40, 60);
    scene.add(directionalLight);

    var ambientLight = new THREE.AmbientLight(0x292929);
    scene.add(ambientLight);

    document.getElementById("WebGL-TimeTubes").appendChild(renderer.domElement);
    renderer.render(scene, camera);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth / 2, window.innerHeight);
}