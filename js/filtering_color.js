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
            let minPos = -10 + 150 * ui.values[0] / 100;
            let maxPos = -10 + 150 - 150 * ui.values[1] / 100;
            $('#color_value_min').css('bottom', minPos + 'px');
            $('#color_value_max').css('top', maxPos + 'px');
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
        },
        stop: function () {
            $('#color_hue_min').css('display', 'none');
            $('#color_hue_max').css('display', 'none');
        }
    });
    $('#color_hue_min').val($('#color_hue').slider('values', 0));
    $('#color_hue_max').val($('#color_hue').slider('values', 1));
} );
