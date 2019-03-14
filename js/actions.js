let currentIdx = 0;

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize() {
    timetubes[currentIdx].camera.aspect = $(window).width() / $(window).height();
    timetubes[currentIdx].camera.updateProjectionMatrix();
    timetubes[currentIdx].renderer.setSize($(window).width(), $(window).height());
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

$( function() {
    $("#color_value").slider({
        range: true,
        min: 0,
        max: 100,
        values: [ 0, 100 ],
        orientation: "vertical",
        slide: function (event, ui) {
            $('#color_value_min').css('display', 'initial');
            $('#color_value_max').css('display', 'initial');
            $('#color_value_min').val(ui.values[0]);
            $('#color_value_max').val(ui.values[1]);
            let min = $('#color_value').slider("option", "min");
            let range = $('#color_value').slider("option", "max") - min;
            let minPos = -10 + 150 * (ui.values[0] - min) / range;
            let maxPos = -10 + 150 - 150 * (ui.values[1] - min) / range;
            $('#color_value_min').css('bottom', minPos + 'px');
            $('#color_value_max').css('top', maxPos + 'px');
            if (blazarData[currentIdx].length !== 0) {
                let rangeFL = blazarMax[currentIdx]['Flx(V)'] - blazarMin[currentIdx]['Flx(V)'];
                timetubes[currentIdx].tube.material.uniforms.minmaxFlx.value = new THREE.Vector2(
                    ui.values[0] / 100 * rangeFL + blazarMin[currentIdx]['Flx(V)'],
                    ui.values[1] / 100 * rangeFL + blazarMin[currentIdx]['Flx(V)']);
            }
        },
        stop: function () {
            $('#color_value_min').css('display', 'none');
            $('#color_value_max').css('display', 'none');
        }
    });
    $('#color_value_min').val($('#color_value').slider('values', 0));
    $('#color_value_max').val($('#color_value').slider('values', 1));
} );

$( function() {
    $( "#color_hue" ).slider({
        range: true,
        min: 0,
        max: 100,
        values: [ 0, 100 ],
        // orientation: "horizontal"
        slide: function( event, ui ) {
            $('#color_hue_min').css('display', 'initial');
            $('#color_hue_max').css('display', 'initial');
            $('#color_hue_min').val(ui.values[0]);
            $('#color_hue_max').val(ui.values[1]);
            let minPos = -35 + 150 * ui.values[0] / 100;
            let maxPos = -20 + 150 - 150 * ui.values[1] / 100;
            $('#color_hue_min').css('left', minPos + 'px');
            $('#color_hue_max').css('right', maxPos + 'px');
            if (blazarData[currentIdx].length !== 0) {
                let rangeVJ = blazarMax[currentIdx]['V-J'] - blazarMin[currentIdx]['V-J'];
                timetubes[currentIdx].tube.material.uniforms.minmaxVJ.value = new THREE.Vector2(
                    ui.values[0] / 100 * rangeVJ + blazarMin[currentIdx]['V-J'],
                    ui.values[1] / 100 * rangeVJ + blazarMin[currentIdx]['V-J']);
            }
        },
        stop: function () {
            $('#color_hue_min').css('display', 'none');
            $('#color_hue_max').css('display', 'none');
        }
    });
    $('#color_hue_min').val($('#color_hue').slider('values', 0));
    $('#color_hue_max').val($('#color_hue').slider('values', 1));
} );

$('.add').click(function () {
    $(this).prev().val(+$(this).prev().val() + 1);
});
$('.sub').click(function () {
    if ($(this).next().val() > 0) $(this).next().val(+$(this).next().val() - 1);
});