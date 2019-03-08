let blazarData = []; // merged data for program ToDo: Store original data in the other array
let positions = [], radiuses = [], colors = []; // store data necessary for rendering a tube
let blazarNum = [];
let blazarMin = [];
let blazarMax = [];
let blazarAve = [];
let blazarStd = [];
let blazarRange = [];
let dataSplines = [];
let default_texture;

let timetubes = [];

let files = [];

let reader = new FileReader();

function loadFile() {
    let file = document.querySelector('input[type=file]').files[0];
    files.push(file);
    reader.readAsText(file);
    reader.addEventListener("load", parseFile, false);
    // if (file) {
    //     reader.readAsText(file);
    // }
}
function parseFile() {
    let dataTmp;
    let formEle = document.getElementById('file_type');
    let radioList = formEle.file_type;
    let radioValue = radioList.value;
    switch (radioValue) {
        case 'csv':
            console.log('csv file');
            dataTmp = d3.csvParse(reader.result, function (d) {
                // if (Object.keys(d).length = 0)
                //     delete d;
                Object.keys(d).forEach(function(value) {
                    if (!isNaN(d[value]))
                        d[value] = Number(d[value]);
                }, d);
                return d;
            });
            break;
        case 'tsv':
            console.log('tsv file');
            dataTmp = d3.tsvParse(reader.result, function (d) {
                // if (Object.keys(d).length = 0)
                //     delete d;
                Object.keys(d).forEach(function(value) {
                    if (!isNaN(d[value]))
                        d[value] = Number(d[value]);
                }, d);
                return d;
            });
            break;
        case 'space':
            console.log('space');
            let lines = reader.result.split('\n');
            let headertmp = lines[0].split(' ');
            let header = $.grep(headertmp, function(e){return e !== "" && e !== "#";});
            let startIdx = 0;
            for (let i = 0; i < lines.length; i++) {
                if (!lines[i].startsWith('#')) {
                    startIdx = i;
                    break;
                }
            }
            let itemstmp;
            let items = [];
            for (let i = startIdx; i < lines.length; i++) {
                itemstmp = lines[i].split(' ');
                items[i] = $.grep(itemstmp, function(e){return e !== "";});
                items[i].forEach(function (value, index, array) {
                    if (!isNaN(value))
                        array[index] = Number(value);
                })
            }
            break;
        default:
            console.log('cannot open');
    }
    let file = files[files.length - 1];
    blazarData.push(dataTmp);
    let dataIdx = blazarData.length - 1;
    // insertDataListRow(file.name, Object.keys(dataTmp[0]), Math.round(file.size / 1024));
    showFileName(files.length - 1);
    showObservationPeriod(dataIdx);
    calcMinMax(dataIdx);
    calcStd(dataIdx);
    calcMagRate(dataIdx);
    setArraysforTube(dataIdx);
    calcSplines(dataIdx);
    // init(dataIdx);
    let minList = {}, maxList = {};
    minList['V-J'] = blazarMin[dataIdx]['V-J'];
    maxList['V-J'] = blazarMax[dataIdx]['V-J'];
    minList['Flx(V)'] = blazarMin[dataIdx]['Flx(V)'];
    maxList['Flx(V)'] = blazarMax[dataIdx]['Flx(V)'];

    timetubes.push(new TimeTubes(dataIdx));
    let tubeIdx = timetubes.length - 1;
    timetubes[tubeIdx].initScene('WebGL-TimeTubes');
    default_texture = new THREE.TextureLoader();
    default_texture.load('img/1_256.png', function (texture) {
        timetubes[tubeIdx].makeModel(texture, positions[0], radiuses[0], colors[0], dataSplines[0]['line'], minList, maxList);
    });
}

function showFileName(idx) {
    let ele = document.getElementById('file_names');
    ele.innerHTML = files[idx].name;
}

function showObservationPeriod(idx) {
    let ele = document.getElementById("observation_period_values");
    ele.innerHTML = blazarData[idx][0]['JD'] + ' - ' + blazarData[idx][blazarData[idx].length - 1]['JD'];
}

function calcMinMax(idx) {
    blazarMin[idx] = {}, blazarMax[idx] = {}, blazarAve[idx] = {}, blazarNum[idx] = {}, blazarStd[idx] = {};

    for (let i = 0; i < blazarData[idx].length; i++) {
        for (let key in blazarData[idx][i]) {
            // if the key is not assigned yet
            if (isNaN(blazarNum[idx][key])) {
                blazarMin[idx][key] = blazarData[idx][i][key];
                blazarMax[idx][key] = blazarData[idx][i][key];
                blazarAve[idx][key] = 0;
                blazarNum[idx][key] = 0;
            }
            blazarNum[idx][key]++;
            blazarAve[idx][key] += blazarData[idx][i][key];
            if (blazarData[idx][i][key] < blazarMin[idx][key]) {
                blazarMin[idx][key] = blazarData[idx][i][key];
            }
            if (blazarMax[idx][key] < blazarData[idx][i][key]) {
                blazarMax[idx][key] = blazarData[idx][i][key];
            }
        }
    }
    for (let key in blazarAve[idx]) {
        blazarAve[idx][key] = blazarAve[idx][key] / blazarNum[idx][key];
    }
}

function calcStd(idx) {
    for (let i = 0; i < blazarData[idx].length; i++) {
        for (let key in blazarData[idx][i]) {
            if (isNaN(blazarStd[idx][key])) {
                blazarStd[idx][key] = 0;
            }
            blazarStd[idx][key] += Math.pow(blazarData[idx][i][key] - blazarAve[idx][key], 2);
        }
    }
    for (let key in blazarStd[idx]) {
        blazarStd[idx][key] = Math.sqrt(blazarStd[idx][key] / blazarNum[idx][key]);
    }
}

function calcMagRate(idx) {
    // min: ave - 2 * std, max: ave + 2 * std
    let QIrange = Math.max(Math.abs(blazarAve[idx]['Q/I'] - 3 * blazarStd[idx]['Q/I']), blazarAve[idx]['Q/I'] + 2 * blazarStd[idx]['Q/I']);
    let UIrange = Math.max(Math.abs(blazarAve[idx]['U/I'] - 3 * blazarStd[idx]['U/I']), blazarAve[idx]['Q/I'] + 2 * blazarStd[idx]['Q/I']);
    let datarange = Math.max(QIrange, UIrange);
    let int2dig = Math.round(datarange * Math.pow(10, 2 - Math.ceil(Math.log10(datarange))));
    // compute proper range of grid which is multiples of 5
    let range = Math.ceil(int2dig / 5) * 5 * Math.pow(10, - (2 - Math.ceil(Math.log10(datarange))));
    blazarRange[idx] = 10 / range;
}

function setArraysforTube(idx) {
    let range = blazarRange[idx];
    let minJD = blazarData[idx][0]['JD'];
    positions[idx] = [], radiuses[idx] = [], colors[idx] = [];
    for (let i = 0; i < blazarData[idx].length; i++) {
        if ('Q/I' in blazarData[idx][i]) {
            positions[idx].push(blazarData[idx][i]['Q/I'] * range);
            positions[idx].push(blazarData[idx][i]['U/I'] * range);
            positions[idx].push(blazarData[idx][i]['JD'] - minJD);

            radiuses[idx].push(blazarData[idx][i]['E_Q/I'] * range);
            radiuses[idx].push(blazarData[idx][i]['E_U/I'] * range);
        }
        if ('Flx(V)' in blazarData[idx][i]) {
            colors[idx].push(blazarData[idx][i]['V-J']);
            colors[idx].push(blazarData[idx][i]['Flx(V)']);
            // colors[idx].push(blazarData[idx][i]['JD'] - minJD);
        }
    }
    makeEdgeExtra(2);

    function makeEdgeExtra(ext) {
        let a0 = blazarData[idx][0];
        let a1 = blazarData[idx][1];

        let diff = {};
        for (let key in a0) {
            diff[key] = a0[key] - a1[key];
        }
        let tmp = {};
        for (let i = 1; i <= ext; i++) {
            for (let key in blazarData[idx][0]) {
                tmp[key] = a0[key] + i * diff[key];
            }
            positions[idx].unshift(tmp['JD'] - blazarData[idx][0]['JD']);
            positions[idx].unshift(tmp['U/I'] * range);
            positions[idx].unshift(tmp['Q/I'] * range);

            radiuses[idx].unshift(tmp['E_U/I'] * range);
            radiuses[idx].unshift(tmp['E_Q/I'] * range);

            // colors[idx].unshift(tmp['JD'] - blazarData[idx][0]['JD']);
            colors[idx].unshift(tmp['Flx(V)']);
            colors[idx].unshift(tmp['V-J']);
        }

        a0 = blazarData[idx][blazarData[idx].length - 2];
        a1 = blazarData[idx][blazarData[idx].length - 1];

        for (let key in a0) {
            diff[key] = a1[key] - a0[key];
        }
        for (let i = 1; i <= ext; i++) {
            for (let key in blazarData[idx][0]) {
                tmp[key] = a1[key] + i * diff[key];
            }
            positions[idx].push(tmp['Q/I'] * range);
            positions[idx].push(tmp['U/I'] * range);
            positions[idx].push(tmp['JD'] - blazarData[idx][0]['JD']);

            radiuses[idx].push(tmp['E_Q/I'] * range);
            radiuses[idx].push(tmp['E_U/I'] * range);

            colors[idx].push(tmp['V-J']);
            colors[idx].push(tmp['Flx(V)']);
            // colors[idx].push(tmp['JD'] - blazarData[idx][0]['JD']);
        }
    }

}

function calcSplines(idx) {
    let pos = [];
    let err = [];
    let col = [];
    let line = [];
    for (let i = 0; i < blazarData[idx].length; i++) {
        pos.push(new THREE.Vector3(blazarData[idx][i]['Q/I'], blazarData[idx][i]['U/I'], blazarData[idx][i]['JD']));
        err.push(new THREE.Vector3(blazarData[idx][i]['E_Q/I'], blazarData[idx][i]['E_U/I'], blazarData[idx][i]['JD']));
        col.push(new THREE.Vector3(blazarData[idx][i]['V-J'], blazarData[idx][i]['Flx(V)'], blazarData[idx][i]['JD']));
        line.push(new THREE.Vector3(0, 0, blazarData[idx][i]['JD'] - blazarData[idx][0]['JD']));
    }
    dataSplines[idx] = {};
    dataSplines[idx]['position'] = new THREE.CatmullRomCurve3(pos);
    dataSplines[idx]['error'] = new THREE.CatmullRomCurve3(err);
    dataSplines[idx]['color'] = new THREE.CatmullRomCurve3(col);
    dataSplines[idx]['line'] = new THREE.CatmullRomCurve3(line);
}