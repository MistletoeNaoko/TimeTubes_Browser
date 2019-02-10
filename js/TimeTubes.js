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

    addLights();

    var tubeTexture = new THREE.TextureLoader();
    tubeTexture.load('img/1_512.png', function (texture) {
        createTube(texture);
        render();
    });

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

    function render() {
        document.getElementById("WebGL-TimeTubes").appendChild(renderer.domElement);
        renderer.render(scene, camera);
    }

    // tubeMesh.castShadow = true;
    // tubeMesh.receiveShadow = true;
    // TEST (Default TubeGeometry): START
    // var tubeSpline3D = new THREE.CatmullRomCurve3(points3D);
    // var tubeGeometryShaped = new THREE.TubeGeometry(tubeSpline3D,
    //     Math.ceil(data[data.length - 1]['JD'] - data[0]['JD']),
    //     1,
    //     32,
    //     false);
    // var tubeMaterial = new THREE.MeshLambertMaterial({
    //     color: 0xff0000
    // });
    // var tubeMesh = new THREE.Mesh(tubeGeometryShaped, tubeMaterial);
    // TEST (Default TubeGeometry): END

    // let positionAttribute = new THREE.Float32BufferAttribute(positions, 3);
    // let colorAttribute = new THREE.Uint8BufferAttribute(colors, 4);
    // colorAttribute.normalized = true;
    // var geometry = new THREE.BufferGeometry();
    // geometry.addAttribute( 'position', positionAttribute );
    // geometry.addAttribute( 'color', colorAttribute );
    // var material = new THREE.ShaderMaterial({
    //     vertexShader: document.getElementById('vertexShaderSimple').textContent,
    //     fragmentShader: document.getElementById('fragmentShader').textContent,
    //     uniforms: {
    //         points: {value: positions},
    //         size: {value: Object.keys(data).length}
    //     }
    // });
    // var mesh = new THREE.Points(geometry, material);
    // scene.add(mesh);


    // var pathPos = new THREE.SplineCurve3(points);
    // var pathRad = new THREE.SplineCurve3(radius);
    // // var colors = new THREE.Float32Attribute(color);
    // var textureloader = new THREE.TextureLoader();
    // textureloader.crossOrigin = 'anonymous';
    // textureloader.load('https://openclipart.org/image/2400px/svg_to_png/179452/Color-map-icon.png');
    // // textureloader.load('img/1.png');
    // var tubeTexture = THREE.ImageUtils.loadTexture('img/1.png');
    // var tubeGeometry = new THREE.TubeGeometry(pathPos, data.length * 100, pathRad, 32, false);
    //
    // var tubeMaterialShader = new THREE.ShaderMaterial({
    //     vertexShader: document.getElementById('vertexShaderSimple').textContent,
    //     fragmentShader: document.getElementById('fragmentShader').textContent,
    //     uniforms: {
    //         texture: {type: 't', value: textureloader},
    //         points: {type: 'fv', value: points32}
    //     }
    // });
    //
    // var tubeMaterial = new THREE.MeshLambertMaterial({
    //      color: 0xff0000
    // });
    // var tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterialShader);
    // tubeMesh.castShadow = false;
    // scene.add(tubeMesh);


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