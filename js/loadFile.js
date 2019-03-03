let blazarData = [];
let blazarNum = [];
let blazarMin = [];
let blazarMax = [];
let blazarAve = [];
let blazarStd = [];
let blazarRange = [];
let dataSplines = [];

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
    calcSplines(dataIdx);
    init(dataIdx);
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
    blazarMin[idx] = {};
    blazarMax[idx] = {};
    blazarAve[idx] = {};
    blazarNum[idx] = {};
    blazarStd[idx] = {};
    let data0 = blazarData[idx][0];
    for (let key in data0) {
        blazarMin[idx][key] = data0[key];
        blazarMax[idx][key] = data0[key];
        blazarAve[idx][key] = data0[key];
        blazarNum[idx][key] = 1;
    }
    for (let i = 1; i < blazarData[idx].length; i++) {
        for (let key in blazarData[idx][i]) {
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

function calcSplines(idx) {
    let pos = [];
    let err = [];
    let col = [];
    for (let i = 0; i < blazarData[idx].length; i++) {
        pos.push(new THREE.Vector3(blazarData[idx][i]['Q/I'], blazarData[idx][i]['U/I'], blazarData[idx][i]['JD']));
        err.push(new THREE.Vector3(blazarData[idx][i]['E_Q/I'], blazarData[idx][i]['E_U/I'], blazarData[idx][i]['JD']));
        col.push(new THREE.Vector3(blazarData[idx][i]['V-J'], blazarData[idx][i]['Flx(V)'], blazarData[idx][i]['JD']));
    }
    dataSplines[idx] = {};
    dataSplines[idx]['position'] = new THREE.CatmullRomCurve3(pos);
    dataSplines[idx]['error'] = new THREE.CatmullRomCurve3(err);
    dataSplines[idx]['color'] = new THREE.CatmullRomCurve3(col);
}