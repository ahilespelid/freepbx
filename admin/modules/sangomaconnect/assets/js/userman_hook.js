(function ($, window, document, undefined) {

  $inviteButton = $('#sangomaconnect-invite-user'),
  $dynamicModal = $('#dynamic-modal'),
  $advancedNetwork = $('#advanced-network'),
  $advancedNetworkForm = $('#advanced-network-form'),
  $advancedNetworkEnableBtn = $('#sangomaconnect-adv-network1'),
  $sangomaconnectEnableBtn = $('#sangomaconnect1'),
  $sangomaconnectDisableBtn = $('#sangomaconnect2')
  $scdWebRTCEnableBtn = $('#sangomaconnect_enable_webrtc1');
  $scdWebRTCDisableBtn = $('#sangomaconnect_enable_webrtc2');
  $advancedNetworkDisableBtn = $('#sangomaconnect-adv-network2');
  $inviteButton.on('click', function () {
    if ($('#sangomaconnect_errors').val() !== '') {
      let $this = $(this),
        $icon = $(".fa-envelope-o", $this),
        id = $this.attr('data-id');
      $icon.addClass("animate");
      $this.attr('disabled', true);
      $.ajax({
        url: "ajax.php",
        type: "POST",
        data: { command: "generateTmpPwd", module: "sangomaconnect", user: id },
        success: (result) => {
          $icon.removeClass("animate");
          $this.attr('disabled', false);
          if (result.status) {
            $(".dynamic", $dynamicModal).hide();
            $(".modal-body.server-success p", $dynamicModal).html("Invitation has been sent to the user");
            $(".server-success", $dynamicModal).show();
            $dynamicModal.modal("show");
          } else {
            $(".dynamic", $dynamicModal).hide();
            $(".modal-body.server-error p", $dynamicModal).html(result.message);
            $(".server-error", $dynamicModal).show();
            $dynamicModal.modal("show");
          }
        },
        error: (error) => {
          $icon.removeClass("animate");
          $(".dynamic", $dynamicModal).hide();
          $(".modal-body.server-error p", $dynamicModal).html("Server Error");
          $(".server-error", $dynamicModal).show();
          $dynamicModal.modal("show");
          console.error(error)
        }

      })
    }
  })
  if($sangomaconnectEnableBtn.prop("checked")) {
    $advancedNetwork.show();
  } else {
    $scdWebRTCEnableBtn.prop('disabled', true);
    $scdWebRTCDisableBtn.prop('disabled', true);
  }
  $advancedNetworkEnableBtn.on('click', function () {
    $advancedNetworkForm.show();
  })

  $advancedNetworkDisableBtn.on('click', function () {
    $advancedNetworkForm.hide();
  })
  $sangomaconnectEnableBtn.on('click', function () {
    $advancedNetwork.show();
    if($("#desktop_error_found").val() != '1') {
      $scdWebRTCEnableBtn.prop('disabled', false);
      $scdWebRTCDisableBtn.prop('disabled', false);
    }
  })
  $sangomaconnectDisableBtn.on('click', function () {
    if ($scdWebRTCEnableBtn.prop('checked') && $("#desktop_error_found").val() != '1') {
      if (confirm(_("Disabling Sangoma Connect Mobile will disable Sangoma Phone desktop clients as well. Do you want to continue?"))) {
        $advancedNetwork.hide();
        $scdWebRTCEnableBtn.prop('disabled', true);
        $scdWebRTCDisableBtn.prop('disabled', true);
      } else {
        $sangomaconnectEnableBtn.prop("checked", true);
        $scdWebRTCEnableBtn.prop('disabled', false);
        $scdWebRTCDisableBtn.prop('disabled', false);
      }
    } else {
      $advancedNetwork.hide();
      $scdWebRTCEnableBtn.prop('disabled', true);
      $scdWebRTCDisableBtn.prop('disabled', true);
    }
  })
})(jQuery, window, document);
