var camera;
var scene;
var renderer;
var controls;
var tubeMesh;

function init() {
    makeModel(blazarData, minmax);
    animate();
}

function makeModel (data, minmax) {
    initializeScene('WebGL-TimeTubes');
    addLights();

    var points = [];        // To create spline curve
    var positions = [];     // Pass position (Q/I, U/I) list to the shader
    var radiuses = [];      // Pass radius (E_Q/I, E_U/I) list to the shader
    var colors = [];        // Pass color (V-J, Flx(V)) list to the shader
    for (var i = 0; i < data.length; ++i) {
        points.push(new THREE.Vector3(0, 0, data[i]['JD'] - data[0]['JD']));

        positions.push(data[i]['Q/I']*100);
        positions.push(data[i]['U/I']*100);
        positions.push(data[i]['JD'] - data[0]['JD']);

        radiuses.push(data[i]['E_Q/I']*100);
        radiuses.push(data[i]['E_U/I']*100);

        colors.push(data[i]['V-J']);
        colors.push(data[i]['Flx(V)']);
    }
    makeEdgeExtra(1);

    // Render a tube after finishing loading a texture
    var tubeTexture = new THREE.TextureLoader();
    tubeTexture.load('img/1_512.png', function (texture) {
        createTube(texture);
    });

    // Add extra data values to the arrays to compute Catmull splines
    function makeEdgeExtra(range) {
        let a0 = data[0];
        let a1 = data[1];

        let diff = {};
        for (var key in a0) {
            diff[key] = a0[key] - a1[key];
        }
        let tmp = {};
        for (var i = 1; i <= range; i++) {
            for (var key in data[0]) {
                tmp[key] = a0[key] + i * diff[key];
            }
            positions.unshift(tmp['JD'] - data[0]['JD']);
            positions.unshift(tmp['U/I'] * 100);
            positions.unshift(tmp['Q/I'] * 100);

            radiuses.unshift(tmp['E_U/I'] * 100);
            radiuses.unshift(tmp['E_Q/I'] * 100);

            colors.unshift(tmp['Flx(V)']);
            colors.unshift(tmp['V-J']);
        }

        a0 = data[data.length - 2];
        a1 = data[data.length - 1];

        for (var key in a0) {
            diff[key] = a1[key] - a0[key];
        }
        for (var i = 1; i <= range; i++) {
            for (var key in data[0]) {
                tmp[key] = a1[key] + i * diff[key];
            }
            positions.push(tmp['Q/I'] * 100);
            positions.push(tmp['U/I'] * 100);
            positions.push(tmp['JD'] - data[0]['JD']);

            radiuses.push(tmp['E_Q/I'] * 100);
            radiuses.push(tmp['E_U/I'] * 100);

            colors.push(tmp['V-J']);
            colors.push(tmp['Flx(V)']);
        }
    }

    // Add lights to the scene
    function addLights() {
        var directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight.position.set(-20, 40, 60);
        scene.add(directionalLight);

        var ambientLight = new THREE.AmbientLight(0x292929);
        scene.add(ambientLight);
    }

    // Create tube based on values of data
    function createTube(texture) {
        var tubeSpline = new THREE.CatmullRomCurve3(points);
        var tubeGeometry = new THREE.TubeGeometry(  tubeSpline,
                                                    5 * Math.ceil(data[data.length - 1]['JD'] - data[0]['JD']),
                                                    1,
                                                    32,
                                                    false);
        var tubeShaderMaterial = new THREE.ShaderMaterial({
            vertexShader: document.getElementById('vertexShaderSimple').textContent,
            fragmentShader: document.getElementById('fragmentShader').textContent,
            uniforms: {
                points: {value: positions},
                radiuses: {value: radiuses},
                colors: {value: colors},
                size: {value: data.length},
                texture: {value: texture},
                lightPosition: {value: new THREE.Vector3(-20, 40, 60)},
                minmaxVJ: {value: new THREE.Vector2(minmax['min_V-J'], minmax['max_V-J'])},
                minmaxFlx: {value: new THREE.Vector2(minmax['min_Flx(V)'], minmax['max_Flx(V)'])}
            },
            flatShading: true
        });
        tubeMesh = new THREE.Mesh(tubeGeometry, tubeShaderMaterial);
        scene.add(tubeMesh);
    }

}

function initializeScene(id) {
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(new THREE.Color(0x000000), 1.0);
    renderer.setSize(window.innerWidth / 2, window.innerHeight);
    document.getElementById(id).appendChild(renderer.domElement);
    document.addEventListener('wheel', onMouseWheel, false);

    camera = new THREE.PerspectiveCamera(45, (window.innerWidth / 2) / window.innerHeight, 0.1, 1000);
    camera.aspect = (window.innerWidth / 2) / window.innerHeight;
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = -50;
    camera.lookAt(scene.position);

    addControls();
}

function addControls() {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    // controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    // controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.enableZoom = false;
    // controls.minDistance = 100;
    // controls.maxDistance = 500;
    // controls.maxPolarAngle = Math.PI / 2;
}

function onResize() {
    camera.aspect = (window.innerWidth / 2) / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth / 2, window.innerHeight);
}

function onMouseWheel(event) {
    // 1 scroll = 100 in deltaY
    tubeMesh.position.z = tubeMesh.position.z + event.deltaY / 100;
}

function animate() {
    requestAnimationFrame(animate);
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
    render();
}

function render() {
    renderer.render(scene, camera);
}