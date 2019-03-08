class TimeTubes {
    // constructor (set properties (e.g. this.name = values;))
    constructor(idx, o_tubeNum, o_segment) {
        // frequently used values related to data
        this.idx = idx;
        if (o_tubeNum === undefined) {
            this.tubeNum = 1;
        } else {
            this.tubeNum = o_tubeNum;
        }
        if (o_segment === undefined) {
            this.segment = 16;
        } else {
            this.segment = o_segment;
        }
        this.data = blazarData[this.idx];
        this.minJD = blazarData[this.idx][0]['JD'];
        this.numJD = blazarNum[this.idx]['JD'];

        this.currentFocusedIdx = 0;
        this.animationPara = {flag: false, dep: 0, dst:0, speed: 40, now: 0};
    }

    // initialize scene or other general variables independent on data
    initScene(id) {
        // general components for Three.js
        this.renderer = new THREE.WebGLRenderer();
        this.scene = new THREE.Scene();
        this.clippingPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
        this.renderer.setClearColor(new THREE.Color(0x000000), 1.0);
        this.renderer.setSize($(window).width(), $(window).height());
        this.renderer.localClippingEnabled = true;

        document.getElementById(id).appendChild(this.renderer.domElement);
        let onMouseWheel = this._onMouseWheel();
        document.addEventListener('wheel', onMouseWheel.bind(this), false);

        this.camera_prop = {};
        this.camera_prop['fov'] = 45;
        this.camera_prop['far'] = Math.ceil(this.data[this.numJD - 1]['JD'] - this.minJD) + 50;
        this.camera_prop['depth'] = Math.tan(this.camera_prop['fov'] / 2.0 * Math.PI / 180.0) * 2;
        this.camera_prop['aspect'] = ($(window).width()) / $(window).height();
        let size_y = this.camera_prop['depth'] * (50);
        let size_x = this.camera_prop['depth'] * (50) * this.camera_prop['aspect'];
        this.camera_set = [];
        this.camera_set[0] = new THREE.PerspectiveCamera(
            45,
            $(window).width() / $(window).height(),
            0.1,
            this.camera_prop['far']);
        this.camera_set[1] = new THREE.OrthographicCamera(
            -size_x / 2, size_x / 2,
            size_y / 2, -size_y / 2, 0.1,
            this.camera_prop['far']);
        this.camera = this.camera_set[0];
        this.camera.aspect = ($(window).width()) / $(window).height();
        this.camera.position.x = 0;
        this.camera.position.y = 0;
        this.camera.position.z = 50;
        this.camera.lookAt(-this.scene.position);

        let directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight.position.set(-20, 40, 60);
        this.scene.add(directionalLight);
        let ambientLight = new THREE.AmbientLight(0x292929);
        this.scene.add(ambientLight);
        this.grid = new THREE.GridHelper(20, 10, 'white', 'limegreen');

        this.gui = new dat.GUI();

        this._addControls();
    }

    // make models such like tube, grid, plots, etc.
    makeModel(texture, positions, radiuses, colors, spline, minList, maxList) {
        // call drawTube, drawGrid, drawLabels, drawAxis, and drawPlots
        this.tube_group = new THREE.Group();
        this.scene.add(this.tube_group);
        this._drawTube(texture, positions, radiuses, colors, spline, minList, maxList);
        this._drawGrid(20, 10);
        this._drawLabel(10 / blazarRange[this.idx]);
        this._drawAxis();
        this._drawPlot();
        showCurrentVal(this.idx, this.tube_group.position.z);
        this._setGUIControls();
        this.animate();
    }

    _drawTube(texture, positions, radiuses, colors, spline, minList, maxList) {
        let tubeGeometry;
        let geometries = [];
        for (let i = 0; i < this.tubeNum; i++) {
            const geometryTmp = new THREE.TubeBufferGeometry(
                spline,
                10 * Math.ceil(this.data[this.numJD - 1]['JD'] - this.minJD),
                (1 / this.tubeNum) * (i + 1),
                this.segment,
                false);
            geometries.push(geometryTmp);
        }
        tubeGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
        let uniforms = {
            points: {value: positions},
            radiuses: {value: radiuses},
            colors: {value: colors},
            size: {value: this.numJD},
            lightPosition: {value: new THREE.Vector3(-20, 40, 60)},
            minmaxVJ: {value: new THREE.Vector2(minList['V-J'], maxList['V-J'])},
            minmaxFlx: {value: new THREE.Vector2(minList['Flx(V)'], maxList['Flx(V)'])},
            viewVector: {value: this.camera.position},
            texture: {value: texture}
        };
        let tubeShaderMaterial = new THREE.ShaderMaterial({
            vertexShader: document.getElementById('vertexShaderSimple').textContent,
            fragmentShader: document.getElementById('fragmentShader').textContent,
            uniforms: uniforms,
            side: THREE.DoubleSide,
            transparent: true,
            clipping: true,
            clippingPlanes: [this.clippingPlane]
        });
        this.tube = new THREE.Mesh(tubeGeometry, tubeShaderMaterial);
        this.tube_group.add(this.tube);
        this.tube.rotateY(Math.PI);
    }

    _drawGrid(size, divisions) {
        this.grid = new THREE.GridHelper(size, divisions, 'white', 'limegreen');
        this.grid.rotateX(Math.PI / 2);
        this.scene.add(this.grid);
    }

    _drawLabel(range) {
        this.label_group = new THREE.Group();
        this.scene.add(this.label_group);
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
                    text: '(' + pm[i][0] * range + ', ' + pm[i][1] * range + ')',
                },
            });
            this.label_group.add(label);
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
        this.label_group.add(QIlabel);
        this.label_group.add(UIlabel);
        QIlabel.position.set(11, 0, 0);
        UIlabel.position.set(0, 11, 0);
    }

    _drawAxis() {
        // 20 * 20
        let axisGeometry = new THREE.BufferGeometry();
        let axisMaterial = new THREE.LineBasicMaterial({
            color: 'white',
            opacity: 0.5,
            clippingPlanes: [this.clippingPlane]
        });
        let axisPosisitons = [];
        let axisIndices = [];
        let j = 0, curJD = 0;
        for (let i = 0; i < this.numJD; i++) {
            curJD = this.data[i]['JD'] - this.minJD;

            // left
            axisPosisitons.push(-10);
            axisPosisitons.push(0);
            axisPosisitons.push(curJD);
            // right
            axisPosisitons.push(10);
            axisPosisitons.push(0);
            axisPosisitons.push(curJD);
            // top
            axisPosisitons.push(0);
            axisPosisitons.push(10);
            axisPosisitons.push(curJD);
            // bottom
            axisPosisitons.push(0);
            axisPosisitons.push(-10);
            axisPosisitons.push(curJD);

            axisIndices.push(j + 0);
            axisIndices.push(j + 1);
            axisIndices.push(j + 2);
            axisIndices.push(j + 3);
            j = j + 4;
        }
        axisGeometry.setIndex(axisIndices);
        axisGeometry.addAttribute(
            'position',
            new THREE.Float32BufferAttribute(axisPosisitons, 3)
        );
        this.axis = new THREE.LineSegments( axisGeometry, axisMaterial );
        this.tube_group.add(this.axis);
        this.axis.rotateY(Math.PI);
    }

    _drawPlot() {
        let circlePositions = [];
        let circleColor = [];
        let baseColor = new THREE.Color('rgb(127, 255, 212)');
        let circleIndices = Array(this.numJD * this.segment * 2);
        let del = Math.PI * 2 / this.segment;
        let range = blazarRange[this.idx];
        for (let i = 0; i < this.numJD; i++) {
            let zpos = this.data[i]['JD'] - this.data[0]['JD'];
            let xcent = -this.data[i]['Q/I'] * range;
            let ycent = this.data[i]['U/I'] * range;
            let xrad = this.data[i]['E_Q/I'] * range;
            let yrad = this.data[i]['E_U/I'] * range;
            // 0-1, 1-2, 2-3, ... , 31-0
            let currentIdx = this.segment * 2 * i;
            circleIndices[currentIdx] = i * this.segment;
            circleIndices[currentIdx + this.segment * 2 - 1] = i * this.segment;
            for (let j = 0; j < this.segment; j++) {
                circlePositions.push(xcent + xrad * Math.cos(del * j));
                circlePositions.push(ycent + yrad * Math.sin(del * j));
                circlePositions.push(zpos);

                circleColor.push(baseColor.r);
                circleColor.push(baseColor.g);
                circleColor.push(baseColor.b);

                if (j !== 0) {
                    circleIndices[currentIdx + 2 * (j - 1) + 1] = i * this.segment + j;
                    circleIndices[currentIdx + 2 * (j - 1) + 2] = i * this.segment + j;
                }
            }
        }
        let circleGeometry = new THREE.BufferGeometry();
        circleGeometry.setIndex(circleIndices);
        circleGeometry.addAttribute('position', new THREE.Float32BufferAttribute(circlePositions, 3));
        circleGeometry.addAttribute('color', new THREE.Float32BufferAttribute(circleColor, 3));

        let circleMaterial = new THREE.LineBasicMaterial({
            vertexColors: THREE.VertexColors,
            clippingPlanes: [this.clippingPlane]
        });
        this.plot = new THREE.LineSegments(circleGeometry, circleMaterial);
        this.tube_group.add(this.plot);
        this.plot.rotateY(Math.PI);
    }

    // add orbitcontrols to the camera
    _addControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.screenSpacePanning = false;
        this.controls.enableZoom = false;
    }

    // add dat.GUI controllers
    _setGUIControls() {
        let cam, camPos,
            camx, camy, camz, camfar,
            tube,
            display, plotGUIs;//, background;

        this.GUIoptions = {
            reset: function () {
                this.camera.position.x = 0;
                this.camera.position.y = 0;
                this.camera.position.z = 50;
            }.bind(this),
            cameraType: 'Perspective',
            switchCamera: function() {
                let current_pos = this.camera.position;
                if (this.camera instanceof THREE.PerspectiveCamera) {
                    this.camera = this.camera_set[1];
                    this.camera.position.x = current_pos.x;
                    this.camera.position.y = current_pos.y;
                    this.camera.position.z = current_pos.z;
                    this.camera.lookAt(this.scene.position);
                    this.GUIoptions.cameraType = "Orthographic";
                } else {
                    this.camera = this.camera_set[0];
                    this.camera.position.x = current_pos.x;
                    this.camera.position.y = current_pos.y;
                    this.camera.position.z = current_pos.z;
                    this.camera.lookAt(this.scene.position);
                    this.GUIoptions.cameraType = "Perspective";
                }
                this._addControls();
                removeCameraControl.bind(this);
                addCameraControl.bind(this);
            }.bind(this),
            tubePosition: this.minJD,
            grid: true,
            label: true,
            axis: true,
            plot: true,
            plotColor: [127, 255, 212],
            clip: true,
            background: [0, 0, 0]
        };

        cam = this.gui.addFolder('Camera');
        cam.add(this.GUIoptions, 'reset');
        cam.add(this.GUIoptions, 'switchCamera');
        cam.add(this.GUIoptions, 'cameraType').listen();
        camPos = cam.addFolder('Position');
        addCameraControl.bind(this)();
        cam.open();

        // tube controller
        tube = this.gui.addFolder('Tube');
        let tubePos = tube.add(
            this.GUIoptions,
            'tubePosition',
            this.minJD,
            this.data[this.numJD - 1]['JD']).onChange(function (e) {
        }).listen();
        let tubePositionChange = function() {
            this.tube_group.position.z = this.GUIoptions.tubePosition - this.minJD;
            showCurrentVal(this.idx, this.tube_group.position.z);
        };
        tubePos.onChange(tubePositionChange.bind(this));
        tube.open();

        // folder for display controllers
        display = this.gui.addFolder('Display');
        // grid controller
        let gridonChange = function () {
            this.grid.visible = this.GUIoptions.grid;
        };
        let gridGUI = display.add(this.GUIoptions, 'grid');
        gridGUI.onChange(gridonChange.bind(this));
        // label controller
        let labelonChange = function() {
            this.label_group.visible = this.GUIoptions.label;
        };
        display.add(this.GUIoptions, 'label').onChange(labelonChange.bind(this));
        // axis controller
        let axisonChange = function () {
            this.axis.visible = this.GUIoptions.axis;
        };
        display.add(this.GUIoptions, 'axis').onChange(axisonChange.bind(this));
        // folder for plot controllers
        plotGUIs = display.addFolder('Plot');
        // plot controller
        let plotonChange = function () {
            this.plot.visible = this.GUIoptions.plot;
        };
        plotGUIs.add(this.GUIoptions, 'plot').onChange(plotonChange.bind(this));
        // plot color controller
        let plotColoronChange = function() {
            let color = this.GUIoptions.plotColor;
            this.plot.material.color.setRGB(color[0] / 255, color[1] / 255, color[2] / 255);
        };
        plotGUIs.addColor(this.GUIoptions, 'plotColor').onChange(plotColoronChange.bind(this));
        plotGUIs.open();
        // clip controller
        let cliponChange = function() {
            this.renderer.localClippingEnabled = this.GUIoptions.clip;
        };
        display.add(this.GUIoptions, 'clip').onChange(cliponChange.bind(this));
        // background controller
        let backgroundonChange = function() {
            let col = this.GUIoptions.background.split(',').map(Number);
            this.scene.background = new THREE.Color(col[0] / 255, col[1] / 255, col[2] / 255);
        };
        display.add(this.GUIoptions, 'background',
            {Black: [0, 0, 0],
                Gray_75: [63, 63, 63],
                Gray_50: [127, 127, 127],
                Gray_25: [191, 191, 191],
                White: [255, 255, 255],
                Navy: [25, 25, 112]}).onChange(backgroundonChange.bind(this));

        function addCameraControl() {
            camx = camPos.add(this.camera.position, 'x', -100, 100).listen();
            camy = camPos.add(this.camera.position, 'y', -100, 100).listen();
            camz = camPos.add(this.camera.position, 'z', -100, 100).listen();
            camfar = cam.add(this.camera, 'far', 100, this.camera_prop['far']).onChange(function () {
                this.camera.updateProjectionMatrix();
            }.bind(this));
        }
        function removeCameraControl() {
            camPos.remove(camx);
            camPos.remove(camy);
            camPos.remove(camz);
            cam.remove(camfar);
        }
    }

    // move the tube to arbitrary position on z axis
    _moveTube() {
        if (this.animationPara.flag) {
            requestAnimationFrame(this._moveTube.bind(this));
            this.renderer.render(this.scene, this.camera);
            this.animationPara.now += 1;
            let anim = (1 - Math.cos(Math.PI * this.animationPara.now / this.animationPara.speed)) / 2;
            this.tube_group.position.z = this.animationPara.dep + (this.animationPara.dst - this.animationPara.dep) * anim;
            if (this.animationPara.now == this.animationPara.speed) {
                this.animationPara.flag = false;
                this.animationPara.now = 0;
                this.animationPara.dep = 0;
                this.animationPara.dst = 0;
            }
        }else {
            this.animationPara.flag = false;
            this.animationPara.dst = 0;
        }
    }

    // mouse wheel
    _onMouseWheel() {
        return function(event) {
            // 1 scroll = 100 in deltaY
            let now = this.tube_group.position.z;
            let del = this.tube_group.position.z + event.deltaY / 100;
            if (del < 0) {
                del = 0;
            } else if (del > this.data[this.numJD - 1]['JD'] - this.minJD) {
                del = this.data[this.numJD - 1]['JD'] - this.minJD;
            }
            for (let i = 0; i < this.numJD; i++) {
                let tmp = this.data[i]['JD'] - this.minJD;
                if (Math.min(now, del) < tmp && tmp < Math.max(now, del)) {
                    del = tmp;
                    let color = this.gui.__folders.Display.__folders.Plot.__controllers[1].object.plotColor;
                    this.changePlotColor(this.currentFocusedIdx * this.segment, new THREE.Color(color[0] / 255, color[1] / 255, color[2] / 255));
                    this.changePlotColor(i * this.segment, new THREE.Color('red'));
                    this.currentFocusedIdx = i;
                    break;
                }
            }
            this.tube_group.position.z = del;
            this.gui.__folders.Tube.__controllers[0].setValue(del + this.minJD);
            showCurrentVal(this.idx, del);
        };
    }

    // get values of currently focused plot
    getCurrentValues(posZ) {
        // Get the current JD
        let currentJD = posZ + this.minJD;
        let i;
        for (i = 1; i < this.numJD; i++) {
            if (this.data[i - 1]['JD'] <= currentJD && currentJD < this.data[i]['JD'])
                break;
        }
        let u;
        if (i >= this.numJD - 1) {
            u = 1;
        } else {
            u = ((i - 1) + (currentJD - this.data[i - 1]['JD']) / (this.data[i]['JD'] - this.data[i - 1]['JD'])) / (this.numJD - 1);
        }
        let pos = dataSplines[this.idx]['position'].getPoint(u);
        let err = dataSplines[this.idx]['error'].getPoint(u);
        let col = dataSplines[this.idx]['error'].getPoint(u);

        //JD, QI, EQI, UI, EUI, VJ, Flx
        return [pos.z, pos.x, err.x, pos.y, err.y, col.x, col.y];
    }

    // navigate subspaces by observation time
    searchTime(dst) {
        let ele = dst - this.minJD;
        if (isNaN(ele)) {
            alert('Please input numbers.');
        } else {
            this.animationPara.flag = true;
            this.animationPara.dep = this.tube_group.position.z;
            this.animationPara.dst = ele;
            this._moveTube();
        }
    }
    // change the color of the currently focused plot
    changePlotColor(idx, color) {
        for (let i = 0; i < this.segment; i++) {
            this.plot.geometry.attributes.color.needsUpdate = true;
            this.plot.geometry.attributes.color.setXYZ(idx + i, color.r, color.g, color.b);
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.render();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}