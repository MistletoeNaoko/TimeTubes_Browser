$(".tab_label").on("click",function(){
    var $th = $(this).index();
    $(".tab_label").removeClass("active");
    $(".tab_panel").removeClass("active");
    $(this).addClass("active");
    $(".tab_panel").eq($th).addClass("active");
});