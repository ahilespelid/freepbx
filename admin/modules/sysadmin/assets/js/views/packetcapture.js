//License for all code of this FreePBX module can be found in the license file inside the module directory
//Copyright 2020 Sangoma Technologies.

// This is where the startpcap and stoppcap buttons register, convert them to command=packetcapture-startpcap and command=packetcapture-stoppcap
$(document).ready(function(){
    $('input[type=submit]').click(function(e){
        var form = $(this).parents('form');
        var url = 'ajax.php?module=sysadmin&command=packetcapture-' + $(this).attr('name');
        $.ajax({
            type: "POST",
	    url: url, 
            data: form.serialize(),
            error: function(xhr, status, error) {
                freepbx_alert_bar(_("An error has occurred sending PCAP command, please try again"), '10000');
            },
            success: function(response) {}
        });
	if($(this).attr('name')==='stoppcap')
	{
	    // tcpdump -v only sends output every second, and in this mode PHP only checks signals when
	    // there is output, so after stop we need to wait 1.5 seconds before refreshing the file list
	    setTimeout(function(){window.location.reload()}, 1500);
	}
        return false;
    })

    // Override the "No Records Found" option for bootstrap table
    $("#pcapfiletable").bootstrapTable({
	formatNoMatches: function () {
            return _("No packet captures found");
	}
    });

    getPCAPStatus();
});

function pollPCAPStatus() {
  setTimeout(function () {
     getPCAPStatus();
  }, 2000);
}

function getPCAPStatus() {
    $.ajax({
        type: "GET",
	url: 'ajax.php?module=sysadmin&command=packetcapture-getpcapstatus',
        error: function(xhr, status, error) {
	    $( '#pcapstatusbody' ).html( _("Failed to query packet status") );
        },
        success: function(response) {
	    $( '#pcapstatusbody' ).html( response['pcapstatus'] );
	}
    });
    pollPCAPStatus();
}

//Sorts numbers with commas
function fileSizeSort(a, b) {
    var aa = a.replace(/,/g, '');
    var bb = b.replace(/,/g, '');
    return aa - bb;
}

//This format's the action column
function actionColumnFormat(value,row){
    var html = "";
    html += '<a href="ajax.php?module=sysadmin&command=packetcapture-downloadpcap&fname='+encodeURIComponent(row['pcapfilename'])+
	'" data-toggle="tooltip" title="'+_("Download PCAP")+'"><i class="fa fa-download"></i></a>';
    html += '<a href="ajax.php?module=sysadmin&command=packetcapture-downloadzipped&fname='+encodeURIComponent(row['pcapfilename'])+
	'" data-toggle="tooltip" title="'+_("Download Zipped PCAP")+'"><i class="fa fa-file-archive-o"></i></a>';
    html += '<a href="#" class="delPcapButton" data-fname="'+encodeURIComponent(row['pcapfilename'])+
	'"  data-toggle="tooltip" title="'+_("Delete PCAP")+'"><i class="fa fa-trash"></i></a>';
    return html;
}

$(document).on('click', '.delPcapButton', function(e) {
    var curRow = $(this).closest('tr');	
    var pcapfname = $(this).data('fname');
    if (!confirm(_("Are you sure you want to delete file")+"\""+pcapfname+"\"?")) {
	return false;
    }
    else {
	e.preventDefault();

        var url = 'ajax.php?module=sysadmin&command=packetcapture-deletepcap&fname=' + pcapfname;
        $.ajax({
            type: "GET",
	    url: url, 
            error: function(xhr, status, error) {
                freepbx_alert_bar(_("An error has occurred deleting PCAP, please try again"), '10000');
            },
            success: function(response) {
		fpbxToast(_("File Deleted"));
		$("#pcapfiletable").bootstrapTable('remove', {
		    field: "pcapfilename",
		    values: [pcapfname]
		});
		
	    }
        });
    }
});
