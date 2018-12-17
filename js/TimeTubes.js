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
    var radius = [];
    var color = [];
    // for (var i = 0; i < Object.keys(data).length - 1; ++i) {
    //     points.push(new THREE.Vector3(0, 0, (data[i]['JD'] - data[0]['JD'])));
    // }
    for (var i = 0; i < Object.keys(data).length - 1; ++i) {
        points.push(new THREE.Vector3(data[i]['Q/I']*100, data[i]['U/I']*100, data[i]['JD'] - data[0]['JD']));
        radius.push(new THREE.Vector3(data[i]['E_Q/I']*100, data[i]['E_U/I']*100, data[i]['JD'] - data[0]['JD']));
        color.push(new THREE.Vector3(data[i]['V-J'], data[i]['Flx(V)'], data[i]['JD'] - data[0]['JD']));
    }
    var pathPos = new THREE.SplineCurve3(points);
    var pathRad = new THREE.SplineCurve3(radius);
    // var colors = new THREE.Float32Attribute(color);
    var textureloader = new THREE.TextureLoader();
    textureloader.crossOrigin = 'anonymous';
    textureloader.load('https://openclipart.org/image/2400px/svg_to_png/179452/Color-map-icon.png');
    // textureloader.load('img/1.png');
    var tubeTexture = THREE.ImageUtils.loadTexture('img/1.png');
    // var geometry = new THREE.BufferGeometry();
    var tubeGeometry = new THREE.TubeGeometry(pathPos, data.length * 100, pathRad, 32, false);
    // convert tubeGeometry to BufferGeometry
    // geometry.fromGeometry(tubeGeometry);
    // geometry.addAttribute('color', new THREE.BufferAttribute(colors, 2));
    var tubeMaterialShader = new THREE.ShaderMaterial({
        vertexShader: document.getElementById('vertexShaderSimple').textContent,
        fragmentShader: document.getElementById('fragmentShader').textContent,
        uniforms: {
            texture: {type: 't', value: textureloader}//,
            //dataNum: {type: 'i', value: color.length},
            //FLVJArray: {type: 'v3v', value: color}
        }
    });
    // var colorMap = THREE.ImageUtils.loadTexture('img/1.png');
    // var tubeMaterialShader = new THREE.ShaderMaterial({
    //     vertexShader: document.getElementById('vertexShaderSimple').textContent,
    //     fragmentShader: document.getElementById("fragmentShader").textContent,
    //         uniforms: {
    //
    //         }
    //     // uniforms: {
    //     //     texture: {type: 't', value: colorMap}
    //     // }
    // });
    // var tubeMaterial = new THREE.MeshLambertMaterial({
    //     color: 0xff0000
    // });
    var tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterialShader);
    // tubeMesh.castShadow = true;
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