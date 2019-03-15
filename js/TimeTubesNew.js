class TimeTubes {
    // constructor (set properties (e.g. this.name = values;))
    constructor(idx, o_tubeNum, o_segment) {
        // frequently used values related to data
        this.idx = idx;
        this.tubeNum = o_tubeNum || 1;
        this.segment = o_segment || 16;
        this.data = blazarData[this.idx];
        this.minJD = blazarData[this.idx][0]['JD'];
        this.numJD = blazarNum[this.idx]['JD'];

        this.currentFocusedIdx = 0;
        this.currentHighlightedPlot = 0;
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
    makeModel(texture) {
        // call drawTube, drawGrid, drawLabels, drawAxis, and drawPlots
        this.tube_group = new THREE.Group();
        this.scene.add(this.tube_group);
        this._drawTubeNew(texture);
        // this._drawTube(texture, positions, radiuses, colors, spline, minList, maxList);
        this._drawGrid(20, 10);
        this._drawLabel(10 / blazarRange[this.idx]);
        this._drawAxis();
        this._drawPlot();
        showCurrentVal(this.idx, this.tube_group.position.z);
        this._setGUIControls();
        this.animate();
    }

    _drawTubeNew(texture){//texture, spline, minList, maxList) {
        let maxJD = this.data[this.numJD - 1]['JD'];
        let range = blazarRange[this.idx];
        let divNum = 10 * Math.ceil(maxJD - this.minJD);
        let delTime = (maxJD - this.minJD) / divNum;
        let divNumPol = Math.ceil((dataSplines[this.idx]['position'].getPoint(1).z - dataSplines[this.idx]['position'].getPoint(0).z) / delTime);
        let divNumPho = Math.ceil((dataSplines[this.idx]['color'].getPoint(1).z - dataSplines[this.idx]['color'].getPoint(0).z) / delTime);
        let cen = dataSplines[this.idx]['position'].getSpacedPoints(divNumPol);
        let rad = dataSplines[this.idx]['error'].getSpacedPoints(divNumPol);
        let col = dataSplines[this.idx]['color'].getSpacedPoints(divNumPho);
        let idxGap = Math.ceil((dataSplines[this.idx]['color'].getPoint(0).z - dataSplines[this.idx]['position'].getPoint(0).z) / delTime);
        let del = Math.PI * 2 / this.segment;
        let cossin = [];
        for (let i = 0; i <= this.segment; i++) {
            let deg = del * i;
            cossin.push(new THREE.Vector2(Math.cos(deg), Math.sin(deg)));
        }
        let indexTmp = [];
        for (let i = 0; i < this.segment; i++) {
            indexTmp.push(i);
            indexTmp.push(i + (this.segment + 1));
            indexTmp.push(i + 1);

            indexTmp.push(i + (this.segment + 1));
            indexTmp.push(i + 1 + (this.segment + 1));
            indexTmp.push(i + 1);
        }
        let vertices = [];
        for (let i = 0; i < this.tubeNum; i++) {
            vertices[i] = [];
        }
        let indices = [];
        let colors = [];
        let currentColorX = 0, currentColorY = 0;
        for (let i = 0; i <= divNumPol; i++) {
            currentColorX = 0;
            currentColorY = 0;
            if (idxGap < i && (i - idxGap) < divNumPho) {
                currentColorX = col[i - idxGap].x;
                currentColorY = col[i - idxGap].y;
            }
            for (let j = 0; j <= this.segment; j++) {
                for (let k = 0; k < this.tubeNum; k++) {
                    let currad = (1 / this.tubeNum) * (k + 1);
                    vertices[k].push((cen[i].x * range + currad * rad[i].x * range * cossin[j].x) * -1);
                    vertices[k].push(cen[i].y * range + currad * rad[i].y * range * cossin[j].y);
                    vertices[k].push(cen[i].z - this.minJD);
                }

                colors.push(currentColorX);
                colors.push(currentColorY);

                if (j !== this.segment) {
                    indices.push(indexTmp[j * 6 + 0] + i * (this.segment + 1));
                    indices.push(indexTmp[j * 6 + 1] + i * (this.segment + 1));
                    indices.push(indexTmp[j * 6 + 2] + i * (this.segment + 1));
                    indices.push(indexTmp[j * 6 + 3] + i * (this.segment + 1));
                    indices.push(indexTmp[j * 6 + 4] + i * (this.segment + 1));
                    indices.push(indexTmp[j * 6 + 5] + i * (this.segment + 1));
                }
            }
        }
        indices = indices.slice(0, -1 * this.segment * 3 * 2);
        let normals = new Float32Array(vertices[0].length);
        let geometries = [];
        for (let i = 0; i < this.tubeNum; i++) {
            const geometryTmp = new THREE.BufferGeometry();
            geometryTmp.addAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices[i]), 3));
            geometryTmp.addAttribute('normal', new THREE.BufferAttribute(normals, 3));
            geometryTmp.addAttribute('colorData', new THREE.BufferAttribute(new Float32Array(colors), 2));
            geometryTmp.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
            // geometryTmp.computeFaceNormals();
            geometryTmp.computeVertexNormals();
            geometries.push(geometryTmp);
        }
        let tubeGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
        // optional
        // geometry.computeBoundingBox();
        // geometry.computeBoundingSphere();

        // compute normals automatically
        // tubeGeometry.computeFaceNormals();
        // tubeGeometry.computeVertexNormals();

        let tubeMaterial = new THREE.ShaderMaterial({
            vertexShader: document.getElementById('vertexShader_tube').textContent,
            fragmentShader: document.getElementById('fragmentShader_tube').textContent,
            uniforms: {
                lightPosition: {value: new THREE.Vector3(-20, 40, 60)},
                minmaxVJ: {value: new THREE.Vector2(blazarMin[this.idx]['V-J'], blazarMax[this.idx]['V-J'])},
                minmaxFlx: {value: new THREE.Vector2(blazarMin[this.idx]['Flx(V)'], blazarMax[this.idx]['Flx(V)'])},
                tubeNum: {value: this.tubeNum},
                shade: {value: true},
                texture: {value: texture}
            },
            side: THREE.DoubleSide,
            transparent: true,
            clipping: true,
            clippingPlanes: [this.clippingPlane]
        });
        this.tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
        this.tube_group.add(this.tube);
        this.tube.rotateY(Math.PI);
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
            length: {value: positions.length},
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
        let circleIndices = Array(positions[this.idx].length * this.segment * 2);
        let del = Math.PI * 2 / this.segment;
        let range = blazarRange[this.idx];
        // let plotNum = 0;
        for (let i = 0; i < positions[this.idx].length; i++) {
            let zpos = positions[this.idx][i].z - positions[this.idx][0].z;
            let xcen = -positions[this.idx][i].x * range;
            let ycen = positions[this.idx][i].y * range;
            let xrad = radiuses[this.idx][i].x * range;
            let yrad = radiuses[this.idx][i].y * range;
            // 0-1, 1-2, 2-3, ... , 31-0
            let currentIdx = this.segment * 2 * i;
            circleIndices[currentIdx] = i * this.segment;
            circleIndices[currentIdx + this.segment * 2 - 1] = i * this.segment;
            for (let j = 0; j < this.segment; j++) {
                circlePositions.push(xcen + xrad * Math.cos(del * j));
                circlePositions.push(ycen + yrad * Math.sin(del * j));
                circlePositions.push(zpos);

                circleColor.push(baseColor.r);
                circleColor.push(baseColor.g);
                circleColor.push(baseColor.b);

                if (j !== 0) {
                    circleIndices[currentIdx + 2 * (j - 1) + 1] = i * this.segment + j;
                    circleIndices[currentIdx + 2 * (j - 1) + 2] = i * this.segment + j;
                }
            }
            // if (this.data[i]['Q/I']) {
            //     let zpos = this.data[i]['JD'] - this.data[0]['JD'];
            //     let xcent = -this.data[i]['Q/I'] * range;
            //     let ycent = this.data[i]['U/I'] * range;
            //     let xrad = this.data[i]['E_Q/I'] * range;
            //     let yrad = this.data[i]['E_U/I'] * range;
            //     // 0-1, 1-2, 2-3, ... , 31-0
            //     let currentIdx = this.segment * 2 * plotNum;
            //     circleIndices[currentIdx] = plotNum * this.segment;
            //     circleIndices[currentIdx + this.segment * 2 - 1] = plotNum * this.segment;
            //     for (let j = 0; j < this.segment; j++) {
            //         circlePositions.push(xcent + xrad * Math.cos(del * j));
            //         circlePositions.push(ycent + yrad * Math.sin(del * j));
            //         circlePositions.push(zpos);
            //
            //         circleColor.push(baseColor.r);
            //         circleColor.push(baseColor.g);
            //         circleColor.push(baseColor.b);
            //
            //         if (j !== 0) {
            //             circleIndices[currentIdx + 2 * (j - 1) + 1] = plotNum * this.segment + j;
            //             circleIndices[currentIdx + 2 * (j - 1) + 2] = plotNum * this.segment + j;
            //         }
            //     }
            //     plotNum++;
            // }
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
            shade: true,
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
        let shadeonChange = function() {
            this.tube.material.uniforms.shade.value = this.GUIoptions.shade;
        };
        tube.add(this.GUIoptions, 'shade').onChange(shadeonChange.bind(this));
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
            let changeColFlg = false;
            let now = this.tube_group.position.z;
            let dst = this.tube_group.position.z + event.deltaY / 100;
            if (dst < 0) {
                dst = 0;
            } else if (dst > this.data[this.numJD - 1]['JD'] - this.minJD) {
                dst = this.data[this.numJD - 1]['JD'] - this.minJD;
            }
            let i;
            for (i = 0; i < this.numJD; i++) {
                let tmp = this.data[i]['JD'] - this.minJD;
                if (Math.min(now, dst) < tmp && tmp < Math.max(now, dst)) {
                    dst = tmp;
                    this.currentFocusedIdx = i;
                    if ('Q/I' in this.data[i])
                        changeColFlg = true;
                    break;
                }
            }
            if ((dst === this.data[this.numJD - 1]['JD'] - this.minJD) && ('Q/I' in this.data[this.numJD - 1])) {
                changeColFlg = true;
            }
            if (changeColFlg) {
                console.log(dst);
                for (let j = 0; j < positions[this.idx].length; j++) {
                    if (dst === positions[this.idx][j].z - this.minJD) {
                        // console.log(dst, positions[this.idx][j].z - this.minJD);
                        let color = this.gui.__folders.Display.__folders.Plot.__controllers[1].object.plotColor;
                        this.changePlotColor(this.currentHighlightedPlot * this.segment, new THREE.Color(color[0] / 255, color[1] / 255, color[2] / 255));
                        this.changePlotColor(j * this.segment, new THREE.Color('red'));
                        this.currentHighlightedPlot = j;
                    }
                }
            }
            this.tube_group.position.z = dst;
            this.gui.__folders.Tube.__controllers[0].setValue(dst + this.minJD);
            showCurrentVal(this.idx, dst);
        }.bind(this);
    }

    // get values of currently focused plot
    getCurrentValues(posZ) {
        // Get the current JD
        let currentJD = posZ + this.minJD;

        let i;
        for (i = 1; i < positions[this.idx].length; i++) {
            if (positions[this.idx][i - 1].z <= currentJD && currentJD < positions[this.idx][i].z)
                break;
        }
        let tPos;
        if ((currentJD === positions[this.idx][positions[this.idx].length - 1].z) || (i > positions[this.idx].length - 1)) {
            tPos = 1;
        } else {
            tPos = ((i - 1) + (currentJD - positions[this.idx][i - 1].z) / (positions[this.idx][i].z - positions[this.idx][i - 1].z)) / (positions[this.idx].length - 1);
        }

        let j;
        for (j = 1; j < colors[this.idx].length; j++) {
            if (colors[this.idx][j - 1].z <= currentJD && currentJD < colors[this.idx][j].z)
                break;
        }
        let tCol;
        if (j >= colors[this.idx].length - 1) {
            tCol = 1;
        } else {
            tCol = ((j - 1) + (currentJD - colors[this.idx][j - 1].z) / (colors[this.idx][j].z - colors[this.idx][j - 1].z)) / (colors[this.idx].length - 1);
        }

        let pos = dataSplines[this.idx]['position'].getPoint(tPos);
        let err = dataSplines[this.idx]['error'].getPoint(tPos);
        let col = dataSplines[this.idx]['color'].getPoint(tCol);
        // for (i = 1; i < this.numJD; i++) {
        //     if (this.data[i - 1]['JD'] <= currentJD && currentJD < this.data[i]['JD'])
        //         break;
        // }
        // let t;
        // if (i >= this.numJD - 1) {
        //     t = 1;
        // } else {
        //     t = ((i - 1) + (currentJD - this.data[i - 1]['JD']) / (this.data[i]['JD'] - this.data[i - 1]['JD'])) / (this.numJD - 1);
        // }
        // let pos = dataSplines[this.idx]['position'].getPoint(t);
        // let err = dataSplines[this.idx]['error'].getPoint(t);
        // let col = dataSplines[this.idx]['color'].getPoint(t);
        // for (let j = 0; j < this.numJD; j++) {
        //     u = j / (this.numJD - 1);
        //     console.log(dataSplines[this.idx]['position'].getPointAt(u), dataSplines[this.idx]['position'].getPoint(u));
        // }
        // let points = dataSplines[this.idx]['position'].getSpacedPoints(10 * Math.ceil(this.data[this.numJD - 1]['JD'] - this.minJD) );
        // points.map(function (value) {
        //     value.z = value.z - this.minJD;
        //     return value;
        // }.bind(this));
        // console.log(points);

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
