var blazarData;
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
        // console.log(d);
        return d;
    });
    // console.log(typeof data[0]);
    // console.log(Object.keys(data[0]).length);
    makeModel(blazarData);
}
// function OnButtonClick() {
//     var fileRef = document.getElementById('fileUpload');
//     // var outFrame = document.getElementById('output');
//     if (1 <= fileRef.files.length) {
//         var fileData = fileRef.files[0];
//         var reader = new FileReader();
//         reader.onload = function () {
//             var lineArr = reader.result.split("\n");
//             var itemArr = [];
//             for (var i = 1; i < lineArr.length; i++) {
//                 itemArr[i] = lineArr[i].split(",");
//                 itemArr[i] = itemArr[i].map(function (e) {
//                     return Number(e);
//                 });
//                 // console.log(itemArr[i]);
//                 blazarData[i] = itemArr[i];
//                 // if (itemArr[i].length > 1) {
//                 //     blazarData[i] = [];
//                 //     blazarData[i] = itemArr[i];
//                 //     // for (var j = 0; j < itemArr.length; j++) {
//                 //     //     blazarData[i][j] = itemArr[j];
//                 //     // }
//                 // }
//             }
//             // var insert = '<table>';
//             // for (var i = 0; i < itemArr.length; i++) {
//             //     insert += '<tr>';
//             //     for (var j = 0; j < itemArr[i].length; j++) {
//             //         insert += '<td>';
//             //         insert += itemArr[i][j];
//             //         insert += '</td>';
//             //     }
//             //     insert += '</tr>';
//             // }
//             // insert += '</table>';
//             // outFrame.innerHTML = insert;
//         };
//         console.log(blazarData);
//         // console.log(blazarData.length);
//         // console.log(blazarData[1][1]);
//         reader.readAsText(fileData);
//     }
//     makeModel(blazarData);
// }