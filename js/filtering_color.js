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
            if (blazarData[0].length !== 0) {
                let rangeFL = blazarMax[0]['Flx(V)'] - blazarMin[0]['Flx(V)'];
                tube.material.uniforms.minmaxFlx.value = new THREE.Vector2(ui.values[0] / 100 * rangeFL + blazarMin[0]['Flx(V)'], ui.values[1] / 100 * rangeFL + blazarMin[0]['Flx(V)']);
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
            if (blazarData[0].length !== 0) {
                let rangeVJ = blazarMax[0]['V-J'] - blazarMin[0]['V-J'];
                tube.material.uniforms.minmaxVJ.value = new THREE.Vector2(ui.values[0] / 100 * rangeVJ + blazarMin[0]['V-J'], ui.values[1] / 100 * rangeVJ + blazarMin[0]['V-J']);
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
