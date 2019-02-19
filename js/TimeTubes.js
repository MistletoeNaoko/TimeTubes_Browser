var camera;
var scene;
var renderer;
var controls;
var tubeMesh;
var grid;
var axis;
var clippingPlane;

const gui = new dat.GUI();

function init(data) {
    initializeScene('WebGL-TimeTubes');
    addLights();
    makeModel(data, blazarMin, blazarMax);
    setGUIControls();
    animate();
}

function setGUIControls() {
    var options = {
        reset: function () {
            camera.position.x = 0;
            camera.position.y = 0;
            camera.position.z = -50;
        }
    };
    var controls = new function () {
        this.perspective = "Perspective";
        this.switchCamera = function () {
            if (camera instanceof THREE.PerspectiveCamera) {
                camera = new THREE.OrthographicCamera(window.innerWidth / -30, window.innerWidth / 30, window.innerHeight / 30, window.innerHeight / -30, 0.1, 1000);
                camera.position.z = -50;
                camera.lookAt(scene.position);
                this.perspective = "Orthographic";
            } else {
                camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
                camera.position.z = -50;

                camera.lookAt(scene.position);
                this.perspective = "Perspective";
            }
            addControls();
        };
    };
    gui.add(options, 'reset');
    var cam = gui.addFolder('camera');
    cam.add(camera.position, 'x', -100, 100).listen();
    cam.add(camera.position, 'y', -100, 100).listen();
    cam.add(camera.position, 'z', -100, 100).listen();
    cam.open();

    gui.add(controls, 'switchCamera');
    gui.add(controls, 'perspective').listen();
}

function makeModel (data, minList, maxList) {
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
        createTube(texture);
        drawGrids(20, 10);
        drawAxes();
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
        var tubeNum = 1;

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
            side: THREE.DoubleSide,
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

    function drawAxes() {
        // 200 * 200

        let axisGeometry = new THREE.BufferGeometry();
        let axisMaterial = new THREE.LineBasicMaterial({
            vertexColors: THREE.VertexColors,
            clippingPlanes: [clippingPlane]
        });
        let axisPosisitons = [];
        let axisColors = (new Array(data.length * 4 * 3)).fill(1);
        let axisIndices = [];
        let j = 0;
        for (let i = 0; i < data.length; i++) {
            // left
            axisPosisitons.push(-10);
            axisPosisitons.push(0);
            axisPosisitons.push(data[i]['JD'] - data[0]['JD']);
            // right
            axisPosisitons.push(10);
            axisPosisitons.push(0);
            axisPosisitons.push(data[i]['JD'] - data[0]['JD']);
            // top
            axisPosisitons.push(0);
            axisPosisitons.push(10);
            axisPosisitons.push(data[i]['JD'] - data[0]['JD']);
            // bottom
            axisPosisitons.push(0);
            axisPosisitons.push(-10);
            axisPosisitons.push(data[i]['JD'] - data[0]['JD']);

            axisIndices.push(j + 0);
            axisIndices.push(j + 1);
            axisIndices.push(j + 2);
            axisIndices.push(j + 3);
            j = j + 4;
        }
        axisGeometry.setIndex(axisIndices);
        axisGeometry.addAttribute('position', new THREE.Float32BufferAttribute(axisPosisitons, 3));
        axisGeometry.addAttribute('color', new THREE.Float32BufferAttribute(axisColors, 3));
        axis = new THREE.LineSegments( axisGeometry, axisMaterial );
        scene.add(axis);
    }
}

function initializeScene(id) {
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(new THREE.Color(0x000000), 1.0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.localClippingEnabled = true;
    document.getElementById(id).appendChild(renderer.domElement);
    document.addEventListener('wheel', onMouseWheel, false);
    // renderer.sortObjects = false;
    clippingPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    camera = new THREE.PerspectiveCamera(45, (window.innerWidth) / window.innerHeight, 0.1, 1000);
    camera.aspect = (window.innerWidth) / window.innerHeight;
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

function switchCamera() {
    if (camera instanceof THREE.PerspectiveCamera) {
        camera = new THREE.OrthographicCamera(-window.innerWidth, window.innerWidth, window.innerHeight, -window.innerHeight, -200, 500);
        // camera.position.x = 120;
        // camera.position.y = 60;
        // camera.position.z = 180;
        camera.lookAt(scene.position);
        this.perspective = "Orthographic";
    } else {
        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        // camera.position.x = 120;
        // camera.position.y = 60;
        // camera.position.z = 180;

        camera.lookAt(scene.position);
        this.perspective = "Perspective";
    }
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
    camera.aspect = (window.innerWidth) / window.innerHeight;
    // camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.updateProjectionMatrix();
}

function onMouseWheel(event) {
    // 1 scroll = 100 in deltaY
    let del = tubeMesh.position.z - event.deltaY / 100;
    if (del > 0) {
        tubeMesh.position.z = 0;
        axis.position.z = 0;
    } else {
        tubeMesh.position.z = del;
        axis.position.z = del;
    }
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