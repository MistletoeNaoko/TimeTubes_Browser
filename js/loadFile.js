var blazarData = [];
var blazarMin = {};
var blazarMax = {};

var files = [];

var reader = new FileReader();
function loadFile() {
    var file = document.querySelector('input[type=file]').files[0];
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
    // insertDataListRow(file.name, Object.keys(dataTmp[0]), Math.round(file.size / 1024));
    calcMinMax(dataTmp);
    init(dataTmp);
}

function calcMinMax(data) {
    let data0 = data[0];
    for (let key in data0) {
        blazarMin[key] = data0[key];
        blazarMax[key] = data0[key];
    }

    for (var i = 1; i < data.length; i++) {
        for (let key in data[i]) {
            if (data[i][key] < blazarMin[key]) {
                blazarMin[key] = data[i][key];
            }
            if (blazarMax[key] < data[i][key]) {
                blazarMax[key] = data[i][key];
            }
        }
    }
}