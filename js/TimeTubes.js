var camera;
var scene;
var renderer;
var controls;
var tubeMesh;
var grid;
var clippingPlane;

function init() {

    initializeScene('WebGL-TimeTubes');
    addLights();
    // createUnitTubeGeometry(blazarData);
    makeModel(blazarData, blazarMin, blazarMax);
    animate();
}
function createUnitTubeGeometry(data) {
    let DivX = 32;
    let DivY = 32;
    let DivZ = 32;
    let DZ = DivZ;
    let R, A;
    let P = new THREE.Vector3(0, 0, 0);
    let T = new THREE.Vector2(0, 0);
    var vertexPositions = [];
    var indices = [];
    let PsN = (data.length - 1) * DZ * (DivY + 1) * (DivX + 1);
    let EnN = (data.length - 1) * DZ * 2 * (DivY) * (DivX);
    for (let N = 0; N < data.length - 1; N++) {
        for (let Z = 1; Z <= DZ; Z++) {
            R = Z / DZ;
            for (let Y = 0; Y <= DivY; Y++) {
                P.z = N + Y / DivY;
                T.y = 1 + P.z;
                for (let X = 0; X <= DivX; X++) {
                    T.x = X / DivX;
                    A = Math.PI * 2 * T.x;
                    P.x = R * Math.cos(A);
                    P.y = R * Math.sin(A);

                    vertexPositions.push(P.x);
                    vertexPositions.push(P.y);
                    vertexPositions.push(P.z);
                }
            }
        }
    }

    for (let N = data.length - 2; N >= 0; N--) {
        for (let Z = 0; Z < DZ; Z++) {
            for (let Y = 0; Y < DivY; Y++) {
                for (let X = 0; X < DivX; X++) {
                    indices.push(IYXtoJ(N, Z, X + 0, Y + 0));
                    indices.push(IYXtoJ(N, Z, X + 1, Y + 0));
                    indices.push(IYXtoJ(N, Z, X + 1, Y + 1));

                    indices.push(IYXtoJ(N, Z, X + 1, Y + 1));
                    indices.push(IYXtoJ(N, Z, X + 1, Y + 0));
                    indices.push(IYXtoJ(N, Z, X + 0, Y + 0));
                }
            }
        }
    }
    var vertices = new Float32Array(vertexPositions);
    var indexes = new Uint16Array(indices);
    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
    // geometry.setIndex(new THREE.BufferAttribute(indexes, 1));
    // var material = new THREE.MeshLambertMaterial({
    //     color: 0xff0000
    // });
    // var mesh = new THREE.Mesh(geometry, material);
    var material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
    var mesh = new THREE.Mesh( geometry, material );
    scene.add(mesh);
    function IYXtoJ(I, Z, X, Y) {
        return ((I  * DZ + Z) * (DivY + 1) + Y) * (DivX + 1) + X;
    }
}
function makeModel (data, minList, maxList) {
    console.log(data);
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
    tubeTexture.load('img/1_256.png', function (texture) {
        let start = performance.now();
        createTube(texture);
        let end = performance.now();
        console.log( 'createTube: 実行時間 = ' + (end - start) + 'ミリ秒' );

        drawGrids(20, 10);
        // start = performance.now();
        // render();
        // end = performance.now();
        // console.log( 'render: 実行時間 = ' + (end - start) + 'ミリ秒' );
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

    // Create tube based on values of data
    function createTube(texture) {
        var tubeSpline = new THREE.CatmullRomCurve3(points);
        var tubeNum = 32;

        var tubeGeometry;
        var geometries = [];
        for (let i = 0; i < tubeNum; i++) {
            const geometryTmp = new THREE.TubeBufferGeometry(
                                                tubeSpline,
                                                5 * Math.ceil(data[data.length - 1]['JD'] - data[0]['JD']),
                                                (1 / tubeNum) * (i + 1),
                                                32,
                                                false);
            geometries.push(geometryTmp);
        }
        tubeGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
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
                minmaxVJ: {value: new THREE.Vector2(minList['V-J'], maxList['V-J'])},
                minmaxFlx: {value: new THREE.Vector2(minList['Flx(V)'], maxList['Flx(V)'])},
                viewVector: { value: camera.position }
            },
            //flatShading: true,
            // depthTest: false,
            side: THREE.DoubleSide,
            // depthWrite: false,
            transparent: true,
            clipping: true,
            clippingPlanes: [clippingPlane]
        });
        tubeMesh = new THREE.Mesh(tubeGeometry, tubeShaderMaterial);
        scene.add(tubeMesh);
    }

    function drawGrids(size, divisions) {
        // Draw the current clippingPlane
        grid = new THREE.GridHelper(size, divisions, 'white', 'limegreen');
        grid.rotateX(Math.PI / 2);
        scene.add(grid);
    }
}

function initializeScene(id) {
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(new THREE.Color(0x000000), 1.0);
    renderer.setSize(window.innerWidth / 2, window.innerHeight);
    renderer.localClippingEnabled = true;
    document.getElementById(id).appendChild(renderer.domElement);
    document.addEventListener('wheel', onMouseWheel, false);
    // renderer.sortObjects = false;
    clippingPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    camera = new THREE.PerspectiveCamera(45, (window.innerWidth / 2) / window.innerHeight, 0.1, 1000);
    camera.aspect = (window.innerWidth / 2) / window.innerHeight;
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = -50;
    camera.lookAt(scene.position);

    addControls();
}

// Add lights to the scene
function addLights() {
    var directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(-20, 40, 60);
    scene.add(directionalLight);

    var ambientLight = new THREE.AmbientLight(0x292929);
    scene.add(ambientLight);
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
    // camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth / 2, window.innerHeight);
    camera.updateProjectionMatrix();
}

function onMouseWheel(event) {
    // 1 scroll = 100 in deltaY
    tubeMesh.position.z = tubeMesh.position.z - event.deltaY / 100;
}

function animate() {
    requestAnimationFrame(animate);
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
    render();
}

function render() {
    // document.getElementById('WebGL-TimeTubes').appendChild(renderer.domElement);
    renderer.render(scene, camera);
}