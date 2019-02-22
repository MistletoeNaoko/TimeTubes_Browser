let camera;
let camera_set = [];
let camera_para = {};
let scene;
let renderer;
let controls;
let tube;
let grid;
let axis;
let plot;
let clippingPlane;
const segment = 16;

const gui = new dat.GUI();
let GUIoptions;


function init(data) {
    initializeScene('WebGL-TimeTubes', data);
    addLights();
    makeModel(data, blazarMin, blazarMax);
    setGUIControls();
    animate();
}

function setGUIControls() {
    let cam, camPos,
        camx, camy, camz, camfar,
        display;//, background;

    GUIoptions = {
        reset: function () {
            camera.position.x = 0;
            camera.position.y = 0;
            camera.position.z = -50;
        },
        grid: true,
        axis: true,
        plot: true,
        plotColor: [127, 255, 212],
        clip: true,
        background: [0, 0, 0]
    };

    let switchCamera = new function () {
        this.perspective = "Perspective";
        this.switchCamera = function () {
            if (camera instanceof THREE.PerspectiveCamera) {
                camera = camera_set[1];
                camera.position.z = -50;
                camera.lookAt(scene.position);
                this.perspective = "Orthographic";
            } else {
                camera = camera_set[0];
                camera.position.z = -50;

                camera.lookAt(scene.position);
                this.perspective = "Perspective";
            }
            addControls();
            removeCameraControl();
            addCameraControl();
        };
    };

    cam = gui.addFolder('Camera');
    cam.add(GUIoptions, 'reset');
    cam.add(switchCamera, 'switchCamera');
    cam.add(switchCamera, 'perspective').listen();
    camPos = cam.addFolder('Position');
    addCameraControl();
    cam.open();

    display = gui.addFolder('Display');
    display.add(GUIoptions, 'grid').onChange(function (e) {
        grid.visible = e;
    });
    display.add(GUIoptions, 'axis').onChange(function (e) {
        axis.visible = e;
    });

    plotGUIs = display.addFolder('Plot');
    plotGUIs.add(GUIoptions, 'plot').onChange(function (e) {
        plot.visible = e;
    });
    let color = plotGUIs.addColor(GUIoptions, 'plotColor').onChange(function (e) {
        plot.material.color.setRGB(e[0] / 255, e[1] / 255, e[2] / 255);
    });
    plotGUIs.open();
    display.add(GUIoptions, 'clip').onChange(function (e) {
        renderer.localClippingEnabled = e;
    });
    // background = display.addFolder('Background');
    display.add(GUIoptions, 'background',
        {Black: [0, 0, 0],
         Gray_75: [63, 63, 63],
         Gray_50: [127, 127, 127],
         Gray_25: [191, 191, 191],
         White: [255, 255, 255],
         Navy: [25, 25, 112]}).onChange(function (e) {
        let col = e.split(',').map(Number);
        scene.background = new THREE.Color(col[0] / 255, col[1] / 255, col[2] / 255);
    });
    // background.addColor(GUIoptions, 'background_color').onChange(function (e) {
    //     scene.background.setRGB(e[0] / 255, e[1] / 255, e[2] / 255);
    // });
    function addCameraControl() {
        camx = camPos.add(camera.position, 'x', -100, 100).listen();
        camy = camPos.add(camera.position, 'y', -100, 100).listen();
        camz = camPos.add(camera.position, 'z', -100, 100).listen();
        camfar = cam.add(camera, 'far', 100, camera_para['far']).onChange(function () {
            camera.updateProjectionMatrix();
        });
    }
    function removeCameraControl() {
        camPos.remove(camx);
        camPos.remove(camy);
        camPos.remove(camz);
        cam.remove(camfar);
    }
}

function makeModel (data, minList, maxList) {
    let points = [];        // To create spline curve
    let positions = [];     // Pass position (Q/I, U/I) list to the shader
    let radiuses = [];      // Pass radius (E_Q/I, E_U/I) list to the shader
    let colors = [];        // Pass color (V-J, Flx(V)) list to the shader
    for (let i = 0; i < data.length; ++i) {
        points.push(new THREE.Vector3(0, 0, data[i]['JD'] - data[0]['JD']));

        positions.push(data[i]['Q/I']*100);
        positions.push(data[i]['U/I']*100);
        positions.push(data[i]['JD'] - data[0]['JD']);

        radiuses.push(data[i]['E_Q/I']*100);
        radiuses.push(data[i]['E_U/I']*100);

        colors.push(data[i]['V-J']);
        colors.push(data[i]['Flx(V)']);
    }
    makeEdgeExtra(2);

    // Render a tube after finishing loading a texture
    let tubeTexture = new THREE.TextureLoader();
    tubeTexture.load('img/1_256.png', function (texture) {
        // let start = performance.now();
        createTube(texture);
        // let end = performance.now();
        // console.log(end - start);
        drawGrids(20, 10);
        drawAxes();
        drawCircle();
    });

    // Add extra data values to the arrays to compute Catmull splines
    function makeEdgeExtra(range) {
        let a0 = data[0];
        let a1 = data[1];

        let diff = {};
        for (let key in a0) {
            diff[key] = a0[key] - a1[key];
        }
        let tmp = {};
        for (let i = 1; i <= range; i++) {
            for (let key in data[0]) {
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

        for (let key in a0) {
            diff[key] = a1[key] - a0[key];
        }
        for (let i = 1; i <= range; i++) {
            for (let key in data[0]) {
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
        let tubeSpline = new THREE.CatmullRomCurve3(points);
        let tubeNum = 1;

        let tubeGeometry;
        let geometries = [];
        for (let i = 0; i < tubeNum; i++) {
            const geometryTmp = new THREE.TubeBufferGeometry(
                                                tubeSpline,
                                                10 * Math.ceil(data[data.length - 1]['JD'] - data[0]['JD']),
                                                (1 / tubeNum) * (i + 1),
                                                segment,
                                                false);
            geometries.push(geometryTmp);
        }
        tubeGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
        let tubeShaderMaterial = new THREE.ShaderMaterial({
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
        tube = new THREE.Mesh(tubeGeometry, tubeShaderMaterial);
        scene.add(tube);
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
            color: 'white',
            opacity: 0.5,
            clippingPlanes: [clippingPlane]
        });
        let axisPosisitons = [];
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
        axis = new THREE.LineSegments( axisGeometry, axisMaterial );
        scene.add(axis);
    }
    function drawCircle() {
        let circlePositions = [];
        let circleIndices = Array(data.length * segment * 2);
        let del = Math.PI * 2 / segment;
        for (let i = 0; i < data.length; i++) {
            let zpos = data[i]['JD'] - data[0]['JD'];
            let xcent = -data[i]['Q/I']*100;
            let ycent = data[i]['U/I']*100;
            let xrad = data[i]['E_Q/I']*100;
            let yrad = data[i]['E_U/I']*100;
            // 0-1, 1-2, 2-3, ... , 31-0
            let currentIdx = segment * 2 * i;
            circleIndices[currentIdx] = i * segment;
            circleIndices[currentIdx + segment * 2 - 1] = i * segment;
            for (let j = 0; j < segment; j++) {
                circlePositions.push(xcent + xrad * Math.cos(del * j));
                circlePositions.push(ycent + yrad * Math.sin(del * j));
                circlePositions.push(zpos);
                if (j !== 0) {
                    circleIndices[currentIdx + 2 * (j - 1) + 1] = i * segment + j;
                    circleIndices[currentIdx + 2 * (j - 1) + 2] = i * segment + j;
                }
            }
        }
        let circleGeometry = new THREE.BufferGeometry();
        circleGeometry.setIndex(circleIndices);
        circleGeometry.addAttribute('position', new THREE.Float32BufferAttribute(circlePositions, 3));
        let circleMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color('rgb(127, 255, 212)'),
            clippingPlanes: [clippingPlane]
        });
        plot = new THREE.LineSegments(circleGeometry, circleMaterial);
        scene.add(plot);
    }
}

function initializeScene(id, data) {
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(new THREE.Color(0x000000), 1.0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.localClippingEnabled = true;
    document.getElementById(id).appendChild(renderer.domElement);
    document.addEventListener('wheel', onMouseWheel, false);
    // renderer.sortObjects = false;
    clippingPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    camera_para['fov'] = 45;
    let period = data[data.length - 1]['JD'] - data[0]['JD'];
    camera_para['far'] = Math.ceil(period) + 50;
    camera_para['depth'] = Math.tan(camera_para['fov'] / 2.0 * Math.PI / 180.0) * 2;
    camera_para['aspect'] = window.innerWidth / window.innerHeight;
    let size_y = camera_para['depth'] * (50);
    let size_x = camera_para['depth'] * (50) * camera_para['aspect'];
    camera_set[0] = new THREE.PerspectiveCamera(45, (window.innerWidth) / window.innerHeight, 0.1, camera_para['far']);
    camera_set[1] = new THREE.OrthographicCamera(
        -size_x / 2, size_x / 2,
        size_y / 2, -size_y / 2, 0.1, camera_para['far']);
    camera = camera_set[0];
    camera.aspect = (window.innerWidth) / window.innerHeight;
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = -50;
    camera.lookAt(scene.position);

    addControls();
}

// Add lights to the scene
function addLights() {
    let directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(-20, 40, 60);
    scene.add(directionalLight);

    let ambientLight = new THREE.AmbientLight(0x292929);
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
    camera.aspect = (window.innerWidth) / window.innerHeight;
    // camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.updateProjectionMatrix();
}

function onMouseWheel(event) {
    // 1 scroll = 100 in deltaY
    let del = tube.position.z - event.deltaY / 100;
    if (del > 0) {
        tube.position.z = 0;
        axis.position.z = 0;
        plot.position.z = 0;
    } else {
        tube.position.z = del;
        axis.position.z = del;
        plot.position.z = del;
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