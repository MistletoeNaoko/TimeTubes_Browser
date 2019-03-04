// current camera
let camera;
// camera_set[0]: Perspective, camera_set[1]: Orthographic
let camera_set = [];
// fov, far, etc.
let camera_para = {};
let scene;
let renderer;
let controls;
let tube_group;
let tube;
let grid;
let labels = [];
let axis;
let plot;
let clippingPlane;
let animation_para = {flag: false, dep: 0, dst:0, speed: 40, now: 0};
let current_focused_idx;
const segment = 16;

const gui = new dat.GUI();
let GUIoptions;

function init(idx) {
    initializeScene('WebGL-TimeTubes', idx);
    tube_group = new THREE.Group();
    tube_group.userData = {idx: idx};
    makeModel(idx);
    setGUIControls();
    animate();
}

function initializeScene(id, idx) {
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(new THREE.Color(0x000000), 1.0);
    renderer.setSize($(window).width(), $(window).height());//window.innerWidth, window.innerHeight);
    renderer.localClippingEnabled = true;
    document.getElementById(id).appendChild(renderer.domElement);
    document.addEventListener('wheel', onMouseWheel, false);
    clippingPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

    camera_para['fov'] = 45;
    camera_para['far'] = Math.ceil(blazarData[idx][blazarNum[idx]['JD'] - 1]['JD'] - blazarData[idx][0]['JD']) + 50;
    camera_para['depth'] = Math.tan(camera_para['fov'] / 2.0 * Math.PI / 180.0) * 2;
    camera_para['aspect'] = ($(window).width()) / $(window).height();
    let size_y = camera_para['depth'] * (50);
    let size_x = camera_para['depth'] * (50) * camera_para['aspect'];
    camera_set[0] = new THREE.PerspectiveCamera(45, ($(window).width()) / $(window).height(), 0.1, camera_para['far']);
    camera_set[1] = new THREE.OrthographicCamera(
        -size_x / 2, size_x / 2,
        size_y / 2, -size_y / 2, 0.1, camera_para['far']);
    camera = camera_set[0];
    camera.aspect = ($(window).width()) / $(window).height();
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = 50;
    camera.lookAt(-scene.position);

    addLights();
    addControls();

    // Add lights to the scene
    function addLights() {
        let directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight.position.set(-20, 40, 60);
        scene.add(directionalLight);

        let ambientLight = new THREE.AmbientLight(0x292929);
        scene.add(ambientLight);
    }
}

function makeModel (idx) {
    let data = blazarData[idx];
    let range = blazarRange[idx];
    let minList = blazarMin[idx];
    let maxList = blazarMax[idx];

    let points = [];        // To create spline curve
    let positions = [];     // Pass position (Q/I, U/I) list to the shader
    let radiuses = [];      // Pass radius (E_Q/I, E_U/I) list to the shader
    let colors = [];        // Pass color (V-J, Flx(V)) list to the shader

    for (let i = 0; i < data.length; ++i) {
        points.push(new THREE.Vector3(0, 0, data[i]['JD'] - data[0]['JD']));

        positions.push(data[i]['Q/I']*range);
        positions.push(data[i]['U/I']*range);
        positions.push(data[i]['JD'] - data[0]['JD']);

        radiuses.push(data[i]['E_Q/I']*range);
        radiuses.push(data[i]['E_U/I']*range);

        colors.push(data[i]['V-J']);
        colors.push(data[i]['Flx(V)']);
    }
    makeEdgeExtra(2);

    // Render a tube after finishing loading a texture
    let tubeTexture = new THREE.TextureLoader();
    tubeTexture.load('img/1_256.png', function (texture) {
        scene.add(tube_group);
        createTube(texture);
        drawGrids(20, 10);
        drawLabels(10 / range);
        drawAxes();
        drawCircle();
        showCurrentVal(tube_group.position.z);
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
            positions.unshift(tmp['U/I'] * range);
            positions.unshift(tmp['Q/I'] * range);

            radiuses.unshift(tmp['E_U/I'] * range);
            radiuses.unshift(tmp['E_Q/I'] * range);

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
            positions.push(tmp['Q/I'] * range);
            positions.push(tmp['U/I'] * range);
            positions.push(tmp['JD'] - data[0]['JD']);

            radiuses.push(tmp['E_Q/I'] * range);
            radiuses.push(tmp['E_U/I'] * range);

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
        tube_group.add(tube);
        tube.rotateY(Math.PI);
    }

    function drawGrids(size, divisions) {
        // Draw the current clippingPlane
        grid = new THREE.GridHelper(size, divisions, 'white', 'limegreen');
        grid.rotateX(Math.PI / 2);
        scene.add(grid);
    }

    function drawLabels(valrange) {
        let pm = [
            [1, 1],
            [-1, 1],
            [-1, -1],
            [1, -1]
        ];
        for (let i = 0; i < pm.length; i++) {
            let label = new THREE.TextSprite({
                material: {
                    color: 0xffffff,
                },
                redrawInterval: 250,
                textSize: 0.8,
                texture: {
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    text: '(' + pm[i][0] * valrange + ', ' + pm[i][1] * valrange + ')',
                },
            });
            labels.push(label);
            scene.add(label);
            label.position.set( pm[i][0] * 10,  pm[i][1] * 10, 0);
        }
        let QIlabel = new THREE.TextSprite({
            material: {
                color: 0x006400,
            },
            redrawInterval: 250,
            textSize: 1,
            texture: {
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontStyle: 'italic',
                text: 'Q/I',
            },
        });
        let UIlabel = new THREE.TextSprite({
            material: {
                color: 0x006400,
            },
            redrawInterval: 250,
            textSize: 1,
            texture: {
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontStyle: 'italic',
                text: 'U/I',
            },
        });
        labels.push(QIlabel);
        labels.push(UIlabel);
        scene.add(QIlabel);
        scene.add(UIlabel);
        QIlabel.position.set(11, 0, 0);
        UIlabel.position.set(0, 11, 0);
    }

    function drawAxes() {
        // 20 * 20

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
        tube_group.add(axis);
        axis.rotateY(Math.PI);
    }
    function drawCircle() {
        let circlePositions = [];
        let circleColor = [];
        let baseColor = new THREE.Color('rgb(127, 255, 212)');
        let circleIndices = Array(data.length * segment * 2);
        let del = Math.PI * 2 / segment;
        for (let i = 0; i < data.length; i++) {
            let zpos = data[i]['JD'] - data[0]['JD'];
            let xcent = -data[i]['Q/I']*range;
            let ycent = data[i]['U/I']*range;
            let xrad = data[i]['E_Q/I']*range;
            let yrad = data[i]['E_U/I']*range;
            // 0-1, 1-2, 2-3, ... , 31-0
            let currentIdx = segment * 2 * i;
            circleIndices[currentIdx] = i * segment;
            circleIndices[currentIdx + segment * 2 - 1] = i * segment;
            for (let j = 0; j < segment; j++) {
                circlePositions.push(xcent + xrad * Math.cos(del * j));
                circlePositions.push(ycent + yrad * Math.sin(del * j));
                circlePositions.push(zpos);

                circleColor.push(baseColor.r);
                circleColor.push(baseColor.g);
                circleColor.push(baseColor.b);

                if (j !== 0) {
                    circleIndices[currentIdx + 2 * (j - 1) + 1] = i * segment + j;
                    circleIndices[currentIdx + 2 * (j - 1) + 2] = i * segment + j;
                }
            }
        }
        let circleGeometry = new THREE.BufferGeometry();
        circleGeometry.setIndex(circleIndices);
        circleGeometry.addAttribute('position', new THREE.Float32BufferAttribute(circlePositions, 3));
        circleGeometry.addAttribute('color', new THREE.Float32BufferAttribute(circleColor, 3));

        let circleMaterial = new THREE.LineBasicMaterial({
            // color: new THREE.Color('rgb(127, 255, 212)'),
            vertexColors: THREE.VertexColors,
            clippingPlanes: [clippingPlane]
        });
        plot = new THREE.LineSegments(circleGeometry, circleMaterial);
        tube_group.add(plot);
        plot.rotateY(Math.PI);
    }
}

function setGUIControls() {
    let cam, camPos,
        camx, camy, camz, camfar,
        tube,
        display;//, background;

    GUIoptions = {
        reset: function () {
            camera.position.x = 0;
            camera.position.y = 0;
            camera.position.z = 50;
        },
        tubePosition: blazarData[tube_group.userData.idx][0]['JD'],
        grid: true,
        label: true,
        axis: true,
        plot: true,
        plotColor: [127, 255, 212],
        clip: true,
        background: [0, 0, 0]
    };

    let switchCamera = new function () {
        let current_pos = camera.position;
        this.perspective = "Perspective";
        this.switchCamera = function () {
            if (camera instanceof THREE.PerspectiveCamera) {
                camera = camera_set[1];
                camera.position.x = current_pos.x;
                camera.position.y = current_pos.y;
                camera.position.z = current_pos.z;
                camera.lookAt(scene.position);
                this.perspective = "Orthographic";
            } else {
                camera = camera_set[0];
                camera.position.x = current_pos.x;
                camera.position.y = current_pos.y;
                camera.position.z = current_pos.z;
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

    tube = gui.addFolder('Tube');
    let tubePos = tube.add(
        GUIoptions,
        'tubePosition',
        blazarData[tube_group.userData.idx][0]['JD'],
        blazarData[tube_group.userData.idx][blazarNum[tube_group.userData.idx]['JD'] - 1]['JD']).onChange(function (e) {
    }).listen();
    tubePos.onChange(function (e) {
        tube_group.position.z = e - blazarData[tube_group.userData.idx][0]['JD'];
        showCurrentVal(tube_group.userData.idx, tube_group.position.z);
    })
    tube.open();

    display = gui.addFolder('Display');
    display.add(GUIoptions, 'grid').onChange(function (e) {
        grid.visible = e;
    });
    display.add(GUIoptions, 'label').onChange(function (e) {
       for (let i = 0; i < labels.length; i++) {
           labels[i].visible = e;
       }
    });
    display.add(GUIoptions, 'axis').onChange(function (e) {
        axis.visible = e;
    });

    plotGUIs = display.addFolder('Plot');
    plotGUIs.add(GUIoptions, 'plot').onChange(function (e) {
        plot.visible = e;
    });
    plotGUIs.addColor(GUIoptions, 'plotColor').onChange(function (e) {
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

function currentValues(idx, posZ) {
    // Get the current JD
    let currentJD = posZ + blazarData[idx][0]['JD'];
    let i;
    for (i = 1; i < blazarData[idx].length; i++) {
        if (blazarData[idx][i - 1]['JD'] <= currentJD && currentJD < blazarData[idx][i]['JD'])
            break;
    }
    let u;
    if (i >= blazarData[idx].length - 1) {
        u = 1;
    } else {
        u = ((i - 1) + (currentJD - blazarData[idx][i - 1]['JD']) / (blazarData[idx][i]['JD'] - blazarData[idx][i - 1]['JD'])) / (blazarData[idx].length - 1);
    }
    let pos = dataSplines[idx]['position'].getPoint(u);
    let err = dataSplines[idx]['error'].getPoint(u);
    let col = dataSplines[idx]['error'].getPoint(u);
    return [pos.z, pos.x, err.x, pos.y, err.y, col.x, col.y]; //JD, QI, EQI, UI, EUI, VJ, Flx
}

function showCurrentVal(idx, pos) {
    let currentval = currentValues(idx, pos);
    let JD = document.getElementById('JD_value');
    JD.innerHTML = currentval[0].toFixed(2);
    let QI = document.getElementById('QI_value');
    QI.innerHTML = currentval[1].toFixed(4);
    let EQI = document.getElementById('EQI_value');
    EQI.innerHTML = currentval[2].toFixed(4);
    let UI = document.getElementById('UI_value');
    UI.innerHTML = currentval[3].toFixed(4);
    let EUI = document.getElementById('EUI_value');
    EUI.innerHTML = currentval[4].toFixed(4);
    let VJ = document.getElementById('VJ_value');
    VJ.innerHTML = currentval[5].toFixed(3);
    let FL = document.getElementById('FL_value');
    FL.innerHTML = currentval[6].toExponential(2);
}

function moveTube() {
    if (animation_para.flag) {
        requestAnimationFrame(moveTube);
        renderer.render(scene, camera);
        animation_para.now += 1;
        let anim = (1 - Math.cos(Math.PI * animation_para.now / animation_para.speed)) / 2;
        tube_group.position.z = animation_para.dep + (animation_para.dst - animation_para.dep) * anim;
        if (animation_para.now == animation_para.speed) {
            animation_para.flag = false;
            animation_para.now = 0;
            animation_para.dep = 0;
            animation_para.dst = 0;
        }
    } else {
        animation_para.flag = false;
        animation_para.dst = 0;
    }
}

function onResize() {
    camera.aspect = ($(window).width()) / $(window).height();
    // camera.updateProjectionMatrix();
    renderer.setSize($(window).width(), $(window).height());//window.innerWidth, window.innerHeight);
    camera.updateProjectionMatrix();
}

function onMouseWheel(event) {
    // 1 scroll = 100 in deltaY
    let now = tube_group.position.z;
    let del = tube_group.position.z + event.deltaY / 100;
    let idx = tube_group.userData.idx;
    if (del < 0) {
        del = 0;
    } else if (del > blazarData[idx][blazarNum[idx]['JD'] - 1]['JD'] -  blazarData[idx][0]['JD']) {
        del = blazarData[idx][blazarNum[idx]['JD'] - 1]['JD'] - blazarData[idx][0]['JD'];
    }
    for (let i = 0; i < blazarNum[idx]['JD']; i++) {
        let tmp = blazarData[idx][i]['JD'] - blazarData[idx][0]['JD'];
        if (Math.min(now, del) < tmp && tmp < Math.max(now, del)) {
            del = tmp;
            let color = gui.__folders.Display.__folders.Plot.__controllers[1].object.plotColor;
            changePlotColor(current_focused_idx * segment, new THREE.Color(color[0] / 255, color[1] / 255, color[2] / 255));
            changePlotColor(i * segment, new THREE.Color('red'));
            current_focused_idx = i;
            break;
        }
    }
    tube_group.position.z = del;
    gui.__folders.Tube.__controllers[0].setValue(del + blazarData[idx][0]['JD']);
    showCurrentVal(tube_group.userData.idx, del);
}

function changePlotColor(idx, color) {
    for (let i = 0; i < segment; i++) {
        plot.geometry.attributes.color.needsUpdate = true;
        plot.geometry.attributes.color.setXYZ(idx + i, color.r, color.g, color.b);
    }
}

function TimeSearch() {
    let ele = document.getElementById('time_search_input').value - blazarData[0][0]['JD'];
    if (isNaN(ele)) {
        alert('Please input numbers.');
    } else {
        animation_para.flag = true;
        animation_para.dep = tube_group.position.z;
        animation_para.dst = ele;
        moveTube();
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