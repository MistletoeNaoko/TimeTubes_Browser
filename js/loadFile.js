var blazarData;
var blazarMin = {};
var blazarMax = {};

var reader = new FileReader();
function loadFile() {
    var file = document.querySelector('input[type=file]').files[0];
    reader.addEventListener("load", parseFile, false);
    if (file) {
        reader.readAsText(file);
    }
}
function parseFile() {
    blazarData = d3.csvParse(reader.result, function (d) {
        // if (Object.keys(d).length = 0)
        //     delete d;
        Object.keys(d).forEach(function(value) {
            d[value] = Number(d[value]);
        }, d);
        return d;
    });
    calcMinMax(blazarData);
    init();
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