let currentIdx = 0;

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize() {
    let element = document.getElementById('WebGL-TimeTubes');
    timetubes[currentIdx].camera.aspect = element.clientWidth / $(window).height();
    timetubes[currentIdx].camera.updateProjectionMatrix();
    timetubes[currentIdx].renderer.setSize(element.clientWidth, $(window).height());
}

function onSearchButtononClick() {
    let dst = document.getElementById('time_search_input').value;
    if (timetubes[currentIdx] !== undefined) {
        timetubes[currentIdx].searchTime(dst);
    }
}

function showCurrentVal(idx, pos) {
    if (idx === currentIdx) {
        let currentval = timetubes[currentIdx].getCurrentValues(pos);
        let JD = document.getElementById('JD_value');
        JD.innerHTML = currentval[0].toFixed(3);
        let QI = document.getElementById('QI_value');
        QI.innerHTML = currentval[1].toFixed(4);
        let EQI = document.getElementById('EQI_value');
        EQI.innerHTML = currentval[2].toFixed(4);
        let UI = document.getElementById('UI_value');
        UI.innerHTML = currentval[3].toFixed(4);
        let EUI = document.getElementById('EUI_value');
        EUI.innerHTML = currentval[4].toFixed(4);
        let VJ = document.getElementById('VJ_value');
        VJ.innerHTML = currentval[5].toFixed(3);
        let FL = document.getElementById('FL_value');
        FL.innerHTML = currentval[6].toExponential(2);
    }
}

function  onClickShowScatterPlot() {
    setScatterplots(currentIdx, 'JD', 'Flx(V)');
}

$( function() {
    let value = $("#color_value");
    let vMin = $('#color_value_min');
    let vMax = $('#color_value_max');
    value.slider({
        range: true,
        min: 0,
        max: 100,
        values: [ 0, 100 ],
        orientation: "vertical",
        slide: function (event, ui) {
            vMin.css('display', 'initial');
            vMax.css('display', 'initial');
            vMin.val(ui.values[0]);
            vMax.val(ui.values[1]);
            let min = value.slider("option", "min");
            let range = value.slider("option", "max") - min;
            let minPos = -10 + 150 * (ui.values[0] - min) / range;
            let maxPos = -10 + 150 - 150 * (ui.values[1] - min) / range;
            vMin.css('bottom', minPos + 'px');
            vMax.css('top', maxPos + 'px');
            if (blazarData[currentIdx].length !== 0) {
                let rangeFL = blazarMax[currentIdx]['Flx(V)'] - blazarMin[currentIdx]['Flx(V)'];
                timetubes[currentIdx].tube.material.uniforms.minmaxFlx.value = new THREE.Vector2(
                    ui.values[0] / 100 * rangeFL + blazarMin[currentIdx]['Flx(V)'],
                    ui.values[1] / 100 * rangeFL + blazarMin[currentIdx]['Flx(V)']);
            }
        },
        stop: function () {
            vMin.css('display', 'none');
            vMax.css('display', 'none');
        }
    });
    vMin.val(value.slider('values', 0));
    vMax.val(value.slider('values', 1));
} );

$( function() {
    let hue = $( "#color_hue" );
    let hMin = $('#color_hue_min');
    let hMax = $('#color_hue_max');
    hue.slider({
        range: true,
        min: 0,
        max: 100,
        values: [ 0, 100 ],
        // orientation: "horizontal"
        slide: function( event, ui ) {
            hMin.css('display', 'initial');
            hMax.css('display', 'initial');
            hMin.val(ui.values[0]);
            hMax.val(ui.values[1]);
            let minPos = -35 + 150 * ui.values[0] / 100;
            let maxPos = -20 + 150 - 150 * ui.values[1] / 100;
            hMin.css('left', minPos + 'px');
            hMax.css('right', maxPos + 'px');
            if (blazarData[currentIdx].length !== 0) {
                let rangeVJ = blazarMax[currentIdx]['V-J'] - blazarMin[currentIdx]['V-J'];
                timetubes[currentIdx].tube.material.uniforms.minmaxVJ.value = new THREE.Vector2(
                    ui.values[0] / 100 * rangeVJ + blazarMin[currentIdx]['V-J'],
                    ui.values[1] / 100 * rangeVJ + blazarMin[currentIdx]['V-J']);
            }
        },
        stop: function () {
            hMin.css('display', 'none');
            hMax.css('display', 'none');
        }
    });
    hMin.val(hue.slider('values', 0));
    hMax.val(hue.slider('values', 1));
} );

$('.add').click(function () {
    $(this).prev().val(+$(this).prev().val() + 1);
});
$('.sub').click(function () {
    if ($(this).next().val() > 0) $(this).next().val(+$(this).next().val() - 1);
});

$('#close_value_panel').click( function()
{
    $('#panel_main_area').slideToggle();
    if (this.innerText.match('Close')) {
        this.innerText = 'Open the panel';
    } else {
        this.innerText = 'Close the panel';
    }
});

$('#close_file_panel').click( function()
{
    $('#file_main_area').slideToggle();
    if (this.innerText.match('Close')) {
        this.innerText = 'Open the panel';
    } else {
        this.innerText = 'Close the panel';
    }
});