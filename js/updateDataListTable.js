var dataList = [];
var selectflag = false;

$(document).on('click', "#data_list_table td", function(){
    $tag_td = $(this)[0];
    $tag_tr = $(this).parent()[0];
    var table = document.getElementById('data_list_table');
    // var row = table.rows[$tag_tr.rowIndex];
    for (let i = 0; i < table.rows.length; i++) {
        if (i == $tag_tr.rowIndex) {
            if (table.rows[i].style.backgroundColor == 'lightsteelblue') {
                table.rows[i].style.backgroundColor = 'white';
                selectflag = false;
            } else {
                table.rows[i].style.backgroundColor = 'lightsteelblue';
                selectflag = true;
            }
        } else {
            table.rows[i].style.backgroundColor = 'white';
            selectflag = false;
        }
    }
    if (selectflag) {
        showDataContents($tag_tr.rowIndex - 1);
    } else {
        let parent = document.getElementById('show_data');
        let child  = document.getElementById('data_contents');
        parent.removeChild(child);
    }
});

function showDataContents(dataIdx) {
    var table = document.createElement('table');
    table.setAttribute('id', 'data_contents');
    table.setAttribute('class', 'table table-hover table-bordered');
    var header = table.createTHead();
    var row = header.insertRow(0);
    for (let key in blazarData[dataIdx][0]) {
        cell = row.insertCell(-1);
        cell.appendChild(document.createTextNode(key));
        cell.style.backgroundColor = 'slategray';
    }
    var rows = [];
    rows.push(table.insertRow(-1));
    for (let i = 1; i <= blazarData[dataIdx].length; i++) {
        rows.push(table.insertRow(-1));
        for (let key in blazarData[dataIdx][i]) {
            cell = rows[i].insertCell(-1);
            cell.appendChild(document.createTextNode(blazarData[dataIdx][i][key]));
            cell.style.backgroundColor = 'white';
        }
    }
    document.getElementById('show_data').appendChild(table);
}

function insertDataListRow(name, header, size) {//, format) {
    dataList.push([name, header, size]);
    let table = document.getElementById("data_list_body");
    let row = table.insertRow(-1);
    row.setAttribute('class', 'data_list_row');
    let cells = [];
    cells[0] = row.insertCell(-1);
    cells[0].innerText = dataList.length;
    for (let i = 0; i < dataList[dataList.length - 1].length; i++) {
        cells[i + 1] = row.insertCell(-1);
        cells[i + 1].innerText = dataList[dataList.length - 1][i];
    }
}
