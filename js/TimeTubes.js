var camera;
var scene;
var renderer;

function makeModel (data, minmax) {
    initializeScene();

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
    addLights();

    var tubeTexture = new THREE.TextureLoader();
    tubeTexture.load('img/1_512.png', function (texture) {
        createTube(texture);
        render('WebGL-TimeTubes');
    });

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
        console.log(positions);
    }

    function addLights() {
        var directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight.position.set(-20, 40, 60);
        scene.add(directionalLight);

        var ambientLight = new THREE.AmbientLight(0x292929);
        scene.add(ambientLight);
    }

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
        var tubeMesh = new THREE.Mesh(tubeGeometry, tubeShaderMaterial);
        scene.add(tubeMesh);
    }

}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth / 2, window.innerHeight);
}

function initializeScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.x = 0;
    camera.position.y = 20;
    camera.position.z = -50;
    camera.lookAt(scene.position);

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(new THREE.Color(0x000000), 1.0);
    renderer.setSize(window.innerWidth / 2, window.innerHeight);
}

function render(id) {
    document.getElementById(id).appendChild(renderer.domElement);
    renderer.render(scene, camera);
}