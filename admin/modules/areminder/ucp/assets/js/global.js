var AreminderC = UCPMC.extend({
	init: function(){
    var self = this;
    self.thistable = null;
	},
	displayWidget: function(widget_id,dash_id) {
		var id = $(".grid-stack-item[data-id='"+widget_id+"']").data('widget_type_id');
		$(".grid-stack-item[data-id='"+widget_id+"'] table").on("post-body.bs.table", function() {
			$(".grid-stack-item[data-id='"+widget_id+"'] table .notes").click(function(e){
				var client = $(this).data("id"),
						selected = $(this).data("status");
				e.preventDefault();
				$.post(UCP.ajaxUrl, { module:"areminder", command:"getNotes", id:id },function(data){
					UCP.showDialog(
						_('Notes'),
						$(".grid-stack-item[data-id='"+widget_id+"'] .modal-content").html(),
						'<button type="button" class="btn btn-default" data-dismiss="modal">'+_("Close")+'</button>'+
						'<button type="button" class="btn btn-primary save-notes">'+_("Save Changes")+'</button>',
						function() {
							if(data.notes !== null){
								$("#globalModal .notes-text").val(data.notes);
							} else {
								$("#globalModal .notes-text").val("");
							}
							$("#globalModal select[name='arstatus'] option:contains("+selected+")").prop('selected',true);
							//save
							$("#globalModal .save-notes").click(function(){
								var notes = $("#globalModal .notes-text").val();
								var status = $("#globalModal select[name='arstatus']").val();
								$.post(UCP.ajaxUrl, { module:"areminder", command:"updateNotes", id:client, notes: notes, status:status },function(data){
									$(".grid-stack-item[data-id='"+widget_id+"'] table").bootstrapTable('refresh');
									UCP.hideDialog();
								});
							});
						}
					);
				},"json");
			});
		});
		$(".grid-stack-item[data-id='"+widget_id+"'] .arenable").change(function(){
		  var command = 'disableReminder';
		  if(this.checked){
		    command = 'enableReminder';
		  }
		  $.post(UCP.ajaxUrl, { module:"areminder", command:command, id:id},function(data){
		   });
		});
	},
  notesFormatter: function(val,row){
    return '<a href="#" class="notes" data-id="'+val+'" data-status="'+row.status+'"><i class="fa fa-edit"></i></a>';
  },
	dateFormatter: function(val,row){
		if(val == "None"){
			return val;
		}
		return UCP.dateTimeFormatter(Date.parse(val)/1000);
	}
});
