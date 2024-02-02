const NEW_VERSION_AVAILABLE = 'New firmware version available',
  UP_TO_DATE = 'The gateway is up to date',
  REFRES_TABLE = 'Refresh the table'

var scope = (function ($, window, document, undefined) {
  var selectUsers = [],
    scdEnabledUserCount = 0,
    $removeButton = $('#remove-all'),
    $inviteButton = $('#invite-all'),
    $enableButton = $('#enable-all'),
    $installSSl = $('#domain-action'),
    $table = $('#table-all'),
    $tableAllUsers = $('#table-all-users'),
    $tableDevices = $('#sc-devices'),
    $dynamicModal = $('#dynamic-modal'),
    $ssllink = $('#ssllink'),
    $bulkTopMessage = $('#bulkTopMessage'),
    $resetServer = $('#resetSangomaConnectServer'),
    $installProxy = $('#cloudconnect-action'),
    $pclink = $('#pclink'),
    $advancedSettingsSave = $('#advancedSettingsSave')

  $('.nav-tabs a').on('show.bs.tab', function (e) {})

  $tableAllUsers.on('page-change.bs.table', function () {
    $enableButton.prop('disabled', true)
    selectUsers.slice(0, selectUsers.length)
  })
  $tableAllUsers.on(
    'check.bs.table uncheck.bs.table check-all.bs.table uncheck-all.bs.table',
    function () {
      var $this = $(this),
        id = $this.prop('id'),
        toolbar = $this.data('toolbar')
      $enableButton.prop(
        'disabled',
        !$this.bootstrapTable('getSelections').length
      )
      selectUsers = $.map($this.bootstrapTable('getSelections'), function (
        row
      ) {
        return row.id
      })
    }
  )

  $table.on('page-change.bs.table', function () {
    $removeButton.prop('disabled', true)
    $inviteButton.prop('disabled', true)
    selectUsers.slice(0, selectUsers.length)
  })
  $table.on(
    'check.bs.table uncheck.bs.table check-all.bs.table uncheck-all.bs.table',
    function () {
      var $this = $(this),
        id = $this.prop('id'),
        toolbar = $this.data('toolbar')
      $removeButton.prop(
        'disabled',
        !$this.bootstrapTable('getSelections').length
      )
      $inviteButton.prop(
        'disabled',
        !$this.bootstrapTable('getSelections').length
      )
      scdEnabledUserCount = 0;
      selectUsers = $.map($this.bootstrapTable('getSelections'), function (
        row
      ) {
        if (row.webrtcEnabled == '1') {
          scdEnabledUserCount++;
        }
        return row.id
      })
    }
  )

  $table.on('page-change.bs.table', function () {
    selectUsers.slice(0, selectUsers.length)
  })

  $tableAllUsers.on('page-change.bs.table', function () {
    selectUsers.slice(0, selectUsers.length)
  })

  $(document).on("click", 'a[id^="pclink"]', function () {
    $installProxy.attr("disabled", false);
  });

  //Making Password Modal work
    $(document).on("click", 'a[id^="viewlinkmodal"]', function () {
        var link = $(this).data('temp_password');
        $("#loginlink").val(link);
    });


  $installProxy.on('click', function () {
        var $this = $(this);
        var action = $("#connectcloud-action-selector option:selected").text()
        $pclink.attr("disabled", true);

        var _install_completed = false;
        var timer = undefined;
        if (action == "install" || action == "update") {
            $(".progress-bar").css("width", "");
            $(".progress").removeClass("hidden");
            $(".progress-bar").addClass("active");

            timer = setInterval(function () {

                if (_install_completed) {
                    clearInterval(timer);
                    window.location.reload();
                    return;
                }

                $.post("ajax.php", { command: "getProxyInstallProgress", module: "sangomaconnect" }, function (data) {
                    var perc = undefined;
                    if (!data.status) {
                        perc = "100";
                        alert(data.message)
                    } else {
                        perc = data.percentage;
                    }
                    $(".progress-bar").css("width", perc + "%");
                    $(".progress-bar").html(perc + '%');

                    if (perc === "100" || perc === 100) {
                        _install_completed = true;
                        $pclink.attr("disabled", false);
                        $(".progress-bar").removeClass("active");
                        $(".progress-bar").addClass("hidden");
                    }
                });
            }, 5000);

            $.post("ajax.php", { command: "installProxyClient", module: "sangomaconnect" }, function (data) {
                if (!data.status) {
                    $this.prop("disabled", false);
                    clearInterval(timer);
                    $(".progress-bar").removeClass("active");
                    $(".progress-bar").addClass("hidden");
                }
                $('#cloudconnect').modal('hide');
            });
        } else {
            $.post("ajax.php", { command: "processProxyClientAction", module: "sangomaconnect", action: action }, function (data) {
                $pclink.attr("disabled", false);
                $('#cloudconnect').modal('hide');
            }).always(function () {
                $pclink.attr("disabled", false);
                $('#cloudconnect').modal('hide');
                window.location.reload();
            });

        }
    });



  $inviteButton.on('click', function () {
    var $this = $(this)
    $('.dynamic', $dynamicModal).hide()
    $('.modal-body.server-warning p', $dynamicModal).html(
      'Are you sure you wish to Invite the selected users to SangomaConnect'
    )
    $('.server-warning', $dynamicModal).show()
    $( "#dynamic-action-button", $dynamicModal ).unbind('click');
    $('#dynamic-action-button', $dynamicModal).one('click', function () {
      $this.find('span').text(_('Inviting...'))
      $this.prop('disabled', true)
      $removeButton.prop('disabled', true)
      $dynamicModal.modal('hide')
      $.post(
        'ajax.php',
        {
          command: 'generateTmpPwd',
          module: 'sangomaconnect',
          users: selectUsers
        },
        function (data) {
          if (data.status) {
            $table.bootstrapTable('refresh')
            window.location.reload()
          } else {
            $('.dynamic', $dynamicModal).hide()
            $('.modal-body.server-error p', $dynamicModal).html(
              data.message || 'Something went wrong!'
            )
            $('.server-error', $dynamicModal).show()
            $dynamicModal.modal('show')
            console.error(data)
          }
          selectUsers = []
        }
      )
    })
    $dynamicModal.modal('show')
  })

  $removeButton.on('click', function () {
    var $this = $(this)
    var userType = $("#user-type").val();
    var command = userType == 'userlist' ? 'removeAll' : 'scdDisableAll';
    var msg = userType == 'userlist' ? 'Sangoma Connect' : 'Sangoma Phone Desktop Client';
    $('.dynamic', $dynamicModal).hide()
    var scdWarningMsg = '';
    if(userType == 'userlist' && scdEnabledUserCount > 0) {
      scdWarningMsg = 'Sangoma Phone Desktop Client is already enabled for some of the selected users. Disabling Sangoma Connect will also disable Sangoma Phone Desktop Client for these users as well. Do you want to continue?';
    }
    $('.modal-body.server-warning p', $dynamicModal).html(
      'Are you sure you want to disable '+msg+' for the selected users? '+scdWarningMsg
    )
    $('.server-warning', $dynamicModal).show()
    $( "#dynamic-action-button", $dynamicModal ).unbind('click');
    $('#dynamic-action-button', $dynamicModal).one('click', function () {
      $this.find('span').text(_('Removing...'))
      $this.prop('disabled', true)
      $removeButton.prop('disabled', true)
      $dynamicModal.modal('hide')
      $.post(
        'ajax.php',
        { command: command, module: 'sangomaconnect', users: selectUsers },
        function (data) {
          if (data.status) {
            $table.bootstrapTable('refresh')
            selectUsers = []
            window.location.reload()
          } else {
            $this.find('span').text(_('Remove Users'));
            $this.prop('disabled', false);
            $('.dynamic', $dynamicModal).hide()
            $('.modal-body.server-error p', $dynamicModal).html(
              data.message || 'Something went wrong!'
            )
            $('.server-error', $dynamicModal).show()
            $dynamicModal.modal('show')
            console.error(data)
          }
        }
      )
    })
    $dynamicModal.modal('show')
  })

  $enableButton.on('click', function () {
    var $this = $(this)
    var userType = $("#enable-user-type").val();
    var command = userType == 'alluserlist' ? 'enableAll' : 'scdEnableAll';
    var msg = userType == 'alluserlist' ? 'Sangoma Connect' : 'Sangoma Phone Desktop Client';
    $('.dynamic', $dynamicModal).hide()
    $('.modal-body.server-warning p', $dynamicModal).html(
      'Are you sure you want to enable '+msg+' for the selected users?'
    )
    $('.server-warning', $dynamicModal).show()
    $( "#dynamic-action-button", $dynamicModal ).unbind('click');
    $('#dynamic-action-button', $dynamicModal).one('click', function () {
      $this.find('span').text(_('Enabling...'))
      $this.prop('disabled', true)
      $enableButton.prop('disabled', true)
      $dynamicModal.modal('hide')

      $.post(
        'ajax.php',
        { command: command, module: 'sangomaconnect', users: selectUsers },
        function (data) {
          if (data.status) {
            $table.bootstrapTable('refresh')
            if (data.usersToBeProcessed === data.usersProcessed) {
              $bulkTopMessage.html('All users were successfully enabled!')
              $bulkTopMessage.show()
              selectUsers = []
              setTimeout(function () { window.location.reload() }, 5000)
            }else {
              let message = "";
              if (data.message) {
                message = 'Some users cannot be enabled, Due to ' + data.message;
                // displaying message on modal
                $this.find('span').text(_('Enable Users'));
                $this.prop('disabled', false);
                $('.dynamic', $dynamicModal).hide()
                $('.modal-body.server-error p', $dynamicModal).html(
                  message || 'Something went wrong!'
                )
                $('.server-error', $dynamicModal).show()
                $dynamicModal.modal('show');
                message = "Some users cannot be enabled..!!";
              } else {
                message = 'Some users cannot be enabled, please check them individually in Userman -> Sangomaconnect tab.';
              }
              $bulkTopMessage.html(message)
              $bulkTopMessage.show()
            }
          } else {
            $this.find('span').text(_('Enable Users'));
            $this.prop('disabled', false);
            $('.dynamic', $dynamicModal).hide()
            $('.modal-body.server-error p', $dynamicModal).html(
              data.message || 'Something went wrong!'
            )
            $('.server-error', $dynamicModal).show()
            $dynamicModal.modal('show')
            console.error(data)
          }
        }
      )
    })
    $dynamicModal.modal('show')
  })

  $("#user-type").change(function() {
    var val = $(this).val();
    $removeButton.prop('disabled', true)
    $inviteButton.prop('disabled', true)
    $("#table-all").bootstrapTable('refresh',{url: 'ajax.php?module=sangomaconnect&command='+val});
    if(val === 'userlist') {
      $("#table-all").bootstrapTable('showColumn', 'auth_status');
      $("#invite-all").show();
    } else {
      $("#table-all").bootstrapTable('hideColumn', 'auth_status');
      $("#invite-all").hide();
    }
  });
  
  $("#enable-user-type").change(function() {
    var val = $(this).val();
    $enableButton.prop('disabled', true)
    $("#table-all-users").bootstrapTable('refresh',{url: 'ajax.php?module=sangomaconnect&command='+val});
  });

  $('.dynamic-close-button', $dynamicModal).on('click', () => {
    $dynamicModal.modal('hide')
  })

  $installSSl.on('click', function () {
    var $this = $(this)
    var action = $('#domain-action-selector option:selected').val()
    $ssllink.attr('disabled', true)
    var perc = 0
    $('#domainaction').modal('hide')
    var cfmMessage = _(
      'This will disconnect all SangomaConnect users and reset the SangomaConnect service. Are you sure?'
    )
    // action == 2 == remove certificates
    if (action == '2') {
      cfmMessage = _(
        'This will disconnect all SangomaConnect users and stop the SangomaConnect service. Are you sure?'
      )
    }
    if (confirm(cfmMessage)) {
      $('.progress-bar').css('width', '')
      $('.progress').removeClass('hidden')
      $('.progress-bar').addClass('active')
      var timer = setInterval(function () {
        perc += 2
        $('.progress-bar').css('width', perc + '%')
      }, 5000)
      $.post(
        'ajax.php',
        { command: 'generateSSL', module: 'sangomaconnect', action: action },
        function (data) {
          clearInterval(timer)
          $('.progress-bar').css('width', '100%')
          $('.progress-bar').removeClass('active')
          $ssllink.attr('disabled', false)
          $('#domainaction').modal('hide')
          window.location.reload()
        }
      ).always(function () {
        clearInterval(timer)
        $('.progress-bar').removeClass('active')
        $ssllink.attr('disabled', false)
        $('#domainaction').modal('hide')
      })
    } else {
      $ssllink.attr('disabled', false)
    }
  })

  $advancedSettingsSave.on('click', function () {
    var defaultFQDN = $('#SANGOMACONNECTSECURECALLSFQDN').val();
    var defaultTransport = $('#SANGOMACONNECTDEFAULTTRANSPORT').val();
    var displayName = $('#SANGOMACONNECTDISPLAYNAME').val();
    var ecallRoute = $('#SANGOMACONNECTECALLSROUTE').val();
    var useDNSSRVRecord = $("input[name=SANGOMACONNECTDNSSRVRECORD]:checked").val();
    var scdIpAddress = $("#scdIpAddress").val();
    var defaultCC = $('#SANGOMACONNECTCC').val();
    var eNumbersArr = [];
    $eNumbers = $("#SANGOMACONNECTENUMBERS input[name^='SANGOMACONNECTENUMBER[']");
    $eNumbers.each(function(index) {
      eNumbersArr.push($(this).val());
    });
    $.post(
        'ajax.php',
        { 
          command: 'saveSettings',
          module: 'sangomaconnect',
          defaultFQDN: defaultFQDN,
          defaultTransport: defaultTransport,
          displayName: displayName,
          eNumbers: eNumbersArr,
          ecallRoute: ecallRoute,
          useDNSSRVRecord: useDNSSRVRecord,
          scdIpAddress: scdIpAddress,
          showBlf: $("input[name=show_blf]:checked").val(),
          showPresenceStatus: $("input[name=show_presence_status]:checked").val(),
	        defaultCC: defaultCC
        },
        function (data) {
          if (data.status) {
            alert('Settings saved succesfully')
            setTimeout(function () { window.location.reload() }, 5000)
          } else {
            alert(data.message)
          }
        }
      )
  })

  $resetServer.on('click', function () {
    let $this = $(this),
      action = $(this).attr('data-action'),
      request = function (action) {
        $.ajax({
          url: 'ajax.php',
          type: 'GET',
          data: { command: action, module: 'sangomaconnect' },
          success: result => {
            if (result.status) window.location.reload()
            else {
              $this.attr('disabled', false)
              $('.dynamic', $dynamicModal).hide()
              $('.modal-body.server-error p', $dynamicModal).html(
                result.message || 'Something went wrong!'
              )
              $('.server-error', $dynamicModal).show()
              $dynamicModal.modal('show')
              console.error(result)
            }
          },
          error: error => {
            $this.attr('disabled', false)
            $('.dynamic', $dynamicModal).hide()
            $('.modal-body.server-error p', $dynamicModal).html(
              error.message || 'Something went wrong!'
            )
            $('.server-error', $dynamicModal).show()
            $dynamicModal.modal('show')
            console.error(error)
          }
        })
      }
    $this.attr('disabled', true)
    if (action == 'stop-server') {
      $('.dynamic', $dynamicModal).hide()
      $('.modal-body.server-warning p', $dynamicModal).html(
        '<strong>Are you sure you want to disable Sangoma Connect?</strong><br/>' +
          '<br/>Sangoma Connect provisioning and directory will be disabled<br/>' +
          'Users will not be able to log into the Sangoma Connect mobile device<br/>' +
          'Existing logged in users will still be able to make calls'
      )
      $('.server-warning', $dynamicModal).show()
      $('#dynamic-action-button', $dynamicModal).one('click', () => {
        request(action)
      })
      $('.dynamic-close-button', $dynamicModal).one('click', () => {
        $dynamicModal.modal('hide')
        $this.attr('disabled', false)
      })
      $dynamicModal.modal('show')
    } else {
      request(action)
    }
  })

  return {
    toggleFollowme: function (id) {
      let $this = $('#' + id),
        extension = $this.attr('value'),
        state = $this.is(':checked') ? 'enable' : 'disable'
      $.ajax({
        url: 'ajax.php',
        type: 'GET',
        data: {
          command: 'toggleFM',
          module: 'findmefollow',
          extdisplay: extension,
          state: state
        },
        success: function (data) {
          if (data.return) {
            $('.dynamic', $dynamicModal).hide()
            $('.modal-body.server-success p', $dynamicModal).html(
              "'Follow me' has been " +
                state +
                'd properly on extension ' +
                extension
            )
            $('.server-success', $dynamicModal).show()
            $dynamicModal.modal('show')
          } else {
            $('.dynamic', $dynamicModal).hide()
            $('.modal-body.server-error p', $dynamicModal).html(
              'Not able to ' + state + " 'Follow me' for extension " + extension
            )
            $('.server-error', $dynamicModal).show()
            $dynamicModal.modal('show')
            console.error(data)
          }
        },
        error: function (err) {
          $('.dynamic', $dynamicModal).hide()
          $('.modal-body.server-error p', $dynamicModal).html(
            'Something wrong happened when ' +
              state +
              "ing 'Follow me' for extension " +
              extension
          )
          $('.server-error', $dynamicModal).show()
          $dynamicModal.modal('show')
          console.error(err)
        }
      })
    },
    sendinvite: function (id, extension) {
      let $this = $('#pwmlink' + id),
        $icon = $('.fa-envelope-o', $this)
      if (
        !extension ||
        (typeof extension == 'string' && extension.trim() == 'none')
      ) {
        $('.dynamic', $dynamicModal).hide()
        $('.modal-body.server-error p', $dynamicModal).html(
          'Cannot invite user. Please make sure the user has a default extension.'
        )
        $('.server-error', $dynamicModal).show()
        $dynamicModal.modal('show')
      } else {
        $icon.addClass('animate')
        $this.attr('disabled', true)
        $.ajax({
          url: 'ajax.php',
          type: 'POST',
          data: {
            command: 'generateTmpPwd',
            module: 'sangomaconnect',
            user: id
          },
          success: result => {
            $icon.removeClass('animate')
            $this.attr('disabled', false)
            if (result.status) {
              $('.dynamic', $dynamicModal).hide()
              $('.modal-body.server-success p', $dynamicModal).html(
                'Invitation has been sent to the user'
              )
              $('.server-success', $dynamicModal).show()
              $dynamicModal.modal('show')
            }
          },
          error: error => {
            $icon.removeClass('animate')
            $this.attr('disabled', false)
            $('.dynamic', $dynamicModal).hide()
            $('.modal-body.server-error p', $dynamicModal).html('Server Error')
            $('.server-error', $dynamicModal).show()
            $dynamicModal.modal('show')
            console.error(error)
          }
        })
      }
      return true
    }
  }
})(jQuery, window, document)

function userActions (value, row, index) {
  var html =
    '<a href="?display=userman&action=showuser&user=' +
    row.id +
    '#usermanhooksangomaconnect"><i class="fa fa-edit"></i></a>'
    if($("#user-type").val() == 'userlist') {
      html +=
        '<a data-pwuid="' +
        row.id +
        '" data-tmppwd="' +
        row.temp_password +
        '" data-target="#invitemodal" id="pwmlink' +
        row.id +
        '" class="clickable" onclick="return scope.sendinvite(' +
        row.id +
        ",'" +
        row.default_extension +
        '\')" ><i class="fa fa-envelope-o"></i></ a >'

      html += '<a data-toggle="modal" data-temp_password="' +
      row.temp_password +
      '" data-target="#viewloginlink" id="viewlinkmodal' +
      row.id + '" class="clickable"><i class="fa fa-eye"></i></a>'
    }

  html +=
    '&nbsp;<a href="?display=sangomaconnect&action=remove&id=' +
    row.id +
    '" class="delAction"><i class="fa fa-trash"></i></a>'
  //html += '<a class="clickable"><i class="fa fa-trash-o" data-section="all" data-id="'+row.id+'"></i></a>';
  return html
}

function followmeCell (value, row, index) {
  if (row.default_extension && row.default_extension != 'none')
    return (
      '<input type="checkbox" id="followme-' +
      row.id +
      '" onclick="return scope.toggleFollowme(\'followme-' +
      row.id +
      '\')" ' +
      (value ? 'checked' : '') +
      ' value="' +
      row.default_extension +
      '" />'
    )
  else return '-'
}

function addNumber() {
        lastid = $("#SANGOMACONNECTENUMBERS tr[id^=\"SANGOMACONNECTENUMBER_\"]:last-child").attr("id");
        if (lastid) {
                index = lastid.substr(6);
                index++;
        } else {
                index = 0;
        }

        row = "<tr id=\"SANGOMACONNECTENUMBER_" + index + "\">";
        row+= "<td>";
        row+= "<a class=\"clickable\" onclick=\"delNumber(" + index + ")\"><i class=\"fa fa-ban fa-fw\"></i></a>";
        row+= "</td>";
        row+= "<td>";
        row+= "<input class=\"form-control\" type=\"number\" name=\"SANGOMACONNECTENUMBER[" + index + "]\" value=\"\"/>";
        row+= "</td>";

        $("#SANGOMACONNECTENUMBERS").append(row);
}

function delNumber(index) {
        $("#SANGOMACONNECTENUMBER_" + index).remove();
}
