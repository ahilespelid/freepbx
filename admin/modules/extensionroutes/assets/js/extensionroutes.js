var allow_sortable;
var block_sortable;

function extensionroutes_update() {
	$("input[name=extensions_allowed]").val(JSON.stringify(allow_sortable.toArray()))
	$("input[name=extensions_blocked]").val(JSON.stringify(block_sortable.toArray()))
}

$(document).ready(function() {
	var el = document.getElementById('extensions_allowed');
	allow_sortable = Sortable.create(el, {
		group: "extensionroutes_extensions",
		dataIdAttr: "data-extension",
		multiDrag: true,
		sort: true,
		delay: 0,
		selectedClass: "ext-selected",
		onRemove: function (evt) {
			extensionroutes_update()
		},
		onStart: function (evt) {
			if($("#extensions_allowed").height() > $("#extensions_blocked").height()){
				$("#extensions_blocked").css('min-height', $("#extensions_allowed").height());
			}
		},
		onChoose: function (evt) {
			$( `#extensions_allowed li:eq( ${evt.oldIndex} )`).addClass( "move-selected");
		},
	});

	var el = document.getElementById('extensions_blocked');
	block_sortable = Sortable.create(el, {
		group: "extensionroutes_extensions",
		dataIdAttr: "data-extension",
		multiDrag: true,
		sort: true,
		delay: 0,
		selectedClass: "ext-selected",
		onRemove: function (evt) {
			extensionroutes_update()
		},
		onStart: function (evt) {
			if($("#extensions_allowed").height() < $("#extensions_blocked").height()){
				$("#extensions_allowed").css('min-height', $("#extensions_blocked").height());
			}
		},
		onChoose: function (evt) {
			$( `#extensions_blocked li:eq( ${evt.oldIndex} )`).addClass( "move-selected");
		},
	});

});

$(document).on("click",".eraction", function(e){
	e.preventDefault();
	switch($(this).data("action")){
		case "allowall":
			if($("#extensions_blocked li").hasClass("move-selected")){
				$("#extensions_allowed").append($('.move-selected').removeClass( "move-selected"));
			}else{
				$("#extensions_allowed").append($("#extensions_blocked li"));
			}
			extensionroutes_update()
			break;
		case "blockall":
			if($("#extensions_allowed li").hasClass("move-selected")){
				$("#extensions_blocked").append($('.move-selected').removeClass( "move-selected"));
			}else{
				$("#extensions_blocked").append($("#extensions_allowed li"));
			}
			extensionroutes_update()
			break;
		case "swap":
		 	var allowed = $("#extensions_allowed li");
		 	var blocked = $("#extensions_blocked li");
		 	$("#extensions_blocked").append(allowed);
		 	$("#extensions_allowed").append(blocked);
		 	extensionroutes_update()
			break;
	}
});
