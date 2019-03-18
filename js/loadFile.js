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

let originalFiles = [];

const dataHeaders = {
    HU: {
        'JD': 'JD',
        'Q/I': 'Q/I',
        'E_Q/I': 'E_Q/I',
        'U/I': 'U/I',
        'E_U/I': 'E_U/I',
        'V-J': 'V-J',
        'Flx(V)': 'Flx(V)'
    },
    AUPolar: {
        'JD': 'JD',
        'Q/I': '< q >',
        'E_Q/I': 'rms(q)',
        'U/I': '< u >',
        'E_U/I': 'rms(q)'
    },
    AUPhoto: {
        'JD': 'JD',
        'Flx(V)': 'V'
    }
};

function loadFile() {
    let file = document.querySelector('input[type=file]').files;
    let dataIdx = blazarData.length;
    let formEle = document.getElementById('file_type');
    let type = formEle.file_type.value;
    let initialLine = document.getElementById('initial_line_input').value;
    let dataSet = [], headers = [];
    let blazarDataTmp = [];
    for (let i = 0; i < file.length; i++) {
        let reader = new FileReader();
        reader.readAsText(file[i]);
        reader.onload = function (ev) {
            let result = reader.result;
            let dataTmp;
            // convert files into object
            switch (type) {
                case 'csv':
                    console.log('csv file');
                    dataTmp = d3.csvParse(result, function (d) {
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
                    dataTmp = d3.tsvParse(result, function (d) {
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
                    let lines = result.split('\n');
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
            let slicedData = dataTmp.slice(initialLine - 2);
            dataSet.push(slicedData);
            // merge files into one
            if (i === file.length - 1) {
                for (let j = 0; j < dataSet.length; j++) {
                    headers.push(dataSet[j].columns);
                    blazarDataTmp = blazarDataTmp.concat(dataSet[j]);
                }
                // sort observation in the order of JD
                blazarDataTmp.sort(function (a, b) {
                    return (a['JD'] < b['JD']) ? -1 : 1;
                });
                blazarData[dataIdx] = blazarDataTmp;
                blazarData[dataIdx] = extractNecessaryData(headers, blazarData[dataIdx]);
                renderTimeTubes(dataIdx, file);
            }
        }
    }
}

function extractNecessaryData(headers, data) {
    // what is includes in the header of the data (data.columns)
    // case 1: all (polar and photo) are in the single data
    // case 2: polarization and photometory are divided into different files
    let result = [];
    for (let i = 0; i < data.length; i++) {
        result[i] = {};
        let polar = data[i]['Q/I'] || data[i]['< q >'];//Math.max(data[i].indexOf('Q/I'), data[i].indexOf('< q >'));
        let photo = data[i]['Flx(V)'] || data[i]['V'];//Math.max(data[i].indexOf('Flx(V)'), data[i].indexOf('V'));
        console.log(polar, photo);
        if (polar && photo) {
            for (let key in dataHeaders['HU']) {
                result[i][key] = data[i][dataHeaders['HU'][key]];
            }
        } else if (polar) {
            for (let key in dataHeaders['AUPolar']) {
                if (key == 'JD') {
                    result[i][key] = data[i][dataHeaders['AUPolar'][key]] - 2450000;
                } else {
                    result[i][key] = data[i][dataHeaders['AUPolar'][key]] || 0;
                }
            }
        } else if (photo) {
            for (let key in dataHeaders['AUPhoto']) {
                if (key == 'JD') {
                    result[i][key] = data[i][dataHeaders['AUPhoto'][key]] - 2450000;
                } else {
                    if (key == 'Flx(V)') {
                        // convert V to Flx(V)
                        result[i][key] = -1 *  (data[i][dataHeaders['AUPhoto'][key]] + 11.7580) / 2.5;
                    } else {
                        result[i][key] = data[i][dataHeaders['AUPhoto'][key]] || 0;
                    }
                }
            }
        }
    }
    return result;
}

function renderTimeTubes(idx, files) {
    // let file = files[files.length - 1];
    // blazarData.push(dataTmp);
    // let dataIdx = blazarData.length - 1;
    // insertDataListRow(file.name, Object.keys(dataTmp[0]), Math.round(file.size / 1024));
    // ToDo: modify for multiple input
    let fileNames = '';
    for (let i = 0; i < files.length; i++) {
        fileNames += files[i].name + '\n';
    }
    showFileName(fileNames);
    showObservationPeriod(idx);
    calcMinMax(idx);
    calcStd(idx);
    calcMagRate(idx);
    // setArraysforTube(idx);
    calcSplines(idx);

    timetubes.push(new TimeTubes(idx));
    timetubes[idx].initScene('TimeTubes_container');
    default_texture = new THREE.TextureLoader();
    default_texture.load('img/1_256.png', function (texture) {
        timetubes[idx].makeModel(texture);
    });
}

function showFileName(fileName) {
    let ele = document.getElementById('file_names');
    ele.innerHTML = fileName;
}

function showObservationPeriod(idx) {
    let ele = document.getElementById("observation_period_values");
    ele.innerHTML = blazarData[idx][0]['JD'].toFixed(3) + ' - ' + blazarData[idx][blazarData[idx].length - 1]['JD'].toFixed(3);
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
            colors[idx].push(blazarData[idx][i]['V-J'] || 0);
            colors[idx].push(blazarData[idx][i]['Flx(V)']);
            colors[idx].push(blazarData[idx][i]['JD'] - minJD);
        }
    }
    makeEdgeExtra(2);

    function makeEdgeExtra(ext) {
        // compute extra edge for position, radius, color
        let a0 = [];
        let pos0 = positions[idx].slice(0, 3);
        a0 = a0.concat(pos0);
        let rad0 = radiuses[idx].slice(0, 2);
        a0 = a0.concat(rad0);
        let col0 = colors[idx].slice(0, 3);
        a0 = a0.concat(col0);

        let a1 = [];
        let pos1 = positions[idx].slice(3, 6);
        a1 = a1.concat(pos1);
        let rad1 = radiuses[idx].slice(2, 4);
        a1 = a1.concat(rad1);
        let col1 = colors[idx].slice(3, 6);
        a1 = a1.concat(col1);

        let diff = [];
        for (let i = 0; i < a0.length; i++) {
            diff[i] = a0[i] - a1[i];
        }
        let tmp = [];
        for (let i = 1; i <= ext; i++) {
            for (let j = 0; j < a0.length; j++) {
                tmp[j] = a0[j] + i * diff[j];
            }
            positions[idx].unshift(tmp[2]);
            positions[idx].unshift(tmp[1]);
            positions[idx].unshift(tmp[0]);

            radiuses[idx].unshift(tmp[4]);
            radiuses[idx].unshift(tmp[3]);

            // colors[idx].unshift(tmp['JD'] - blazarData[idx][0]['JD']);
            colors[idx].unshift(tmp[7]);
            colors[idx].unshift(tmp[6]);
            colors[idx].unshift(tmp[5]);
        }

        a0 = [];
        pos0 = positions[idx].slice(-6, -3);
        a0 = a0.concat(pos0);
        rad0 = radiuses[idx].slice(-4, -2);
        a0 = a0.concat(rad0);
        col0 = colors[idx].slice(-6, -3);
        a0 = a0.concat(col0);

        a1 = [];
        pos1 = positions[idx].slice(-3);
        a1 = a1.concat(pos1);
        rad1 = radiuses[idx].slice(-2);
        a1 = a1.concat(rad1);
        col1 = colors[idx].slice(-3);
        a1 = a1.concat(col1);

        diff = [];
        tmp = [];
        for (let i = 0; i < a0.length; i++) {
            diff[i] = a1[i] - a0[i];
        }
        for (let i = 1; i <= ext; i++) {
            for (let j = 0; j < a0.length; j++) {
                tmp[j] = a1[j] + i * diff[j];
            }
            positions[idx].push(tmp[0]);
            positions[idx].push(tmp[1]);
            positions[idx].push(tmp[2]);

            radiuses[idx].push(tmp[3]);
            radiuses[idx].push(tmp[4]);

            colors[idx].push(tmp[5]);
            colors[idx].push(tmp[6]);
            colors[idx].push(tmp[6]);
        }
    }
    // let result = '';
    // for (let i = 0; i < positions[idx].length / 3; i++) {
    //     result += positions[idx][i * 3 + 0] + ', ' + positions[idx][i * 3 + 1] + ', ' +  positions[idx][i * 3 + 2] + '\r\n';
    // }
    // console.log(result);
}

function calcSplines(idx) {
    let pos = [];
    let err = [];
    let col = [];
    let line = [];
    for (let i = 0; i < blazarData[idx].length; i++) {
        if ('Q/I' in blazarData[idx][i]) {
            pos.push(new THREE.Vector3(blazarData[idx][i]['Q/I'], blazarData[idx][i]['U/I'], blazarData[idx][i]['JD']));
            err.push(new THREE.Vector3(blazarData[idx][i]['E_Q/I'], blazarData[idx][i]['E_U/I'], blazarData[idx][i]['JD']));
        }
        if ('Flx(V)' in blazarData[idx][i]) {
            col.push(new THREE.Vector3(blazarData[idx][i]['V-J'], blazarData[idx][i]['Flx(V)'], blazarData[idx][i]['JD']));
        }
        line.push(new THREE.Vector3(0, 0, blazarData[idx][i]['JD'] - blazarData[idx][0]['JD']));
    }
    positions[idx] = pos;
    radiuses[idx] = err;
    colors[idx] = col;

    dataSplines[idx] = {};
    dataSplines[idx]['position'] = new THREE.CatmullRomCurve3(pos);
    dataSplines[idx]['error'] = new THREE.CatmullRomCurve3(err);
    dataSplines[idx]['color'] = new THREE.CatmullRomCurve3(col);
    dataSplines[idx]['line'] = new THREE.CatmullRomCurve3(line);
}
