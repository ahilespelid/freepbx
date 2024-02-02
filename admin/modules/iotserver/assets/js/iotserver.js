const NEW_VERSION_AVAILABLE = "New firmware version available",
    NEW_SANGOMA_VERSION_AVAILABLE = "New firmware version available, please contact Sangoma support team to upgrade to the new version",
    UP_TO_DATE = "The gateway is up to date",
    REFRES_TABLE = "Refresh the table";
const GUEST_SAVE_BUTTON_TEXT = "Save";
const GUEST_SAVE_BUTTON_TEXT_INVITE = "Save and Send Invitation";
const GUEST_INVITE_STATUS_NOT_APPLICABLE = "Not applicable";
var scope = (function ($, window, document, undefined) {
    var selectUsers = [],
        $table = $('#table-all'),
        $eventTable = $('#table-events-all'),
        $logsTable = $('#table-audit-logs-all'),
        $accessProfilesTable = $('#table-access-profiles-all'),
        $automatedActionsTable = $('#table-automated-actions-all'),
        $guestAccessTable = $('#table-guest-access-all'),
        $devicesTable = $('#table-devices-events-all'),
        $removeButton = $('#remove-all'),
        $inviteButton = $('#invite-all'),
        $resetButton = $('#resetIot'),
        $installProxy = $('#cloudconnect-action'),
        $installSSl = $('#domain-action'),
        $logRefresh = $('#log-refresh'),
        $pclink = $('#pclink'),
        $ssllink = $('#ssllink'),
        $loglink = $('#loglink'),
        $pcAction = $('#connectcloud-action-selector'),
        $sslAction = $('#domain-action-selector'),
        $chartMain = $('#chartMain'),
        $chartMain2 = $('#chartMain2'),
        $exportButton = $('#bulk-export-button'),
        $importButton = $('#bulk-import-button'),
        $importBrowseSpan = $('#import-browse-span'),
        $importRemoteDiv = $('#import-from-remote-div'),
        $importBrowseInput = $('#import-browse-input'),
        $importFileSpan = $('#import-filename-span'),
        $bulkActionRun = $('#bulk-action-run'),
        $localFName = $("#localfilename"),
        $bulkHelp = $("#bulk-icon-help"),
        $auditSelector = $("#audit-selector"),
        $loglevelSelector = $("#loglevel-selector"),
        $importHostField = $('#remote-host'),
        $importUserField = $('#remote-user'),
        $importPWDField = $('#remote-pass'),
        $remoteImportButton = $('#remote-import-users'),
        $exportLabel = $('#export-c-label'),
        $exportHelp = $('#export-help-icon'),
        $createProfileBtn = $('#accesscreatemlink'),
        $saveProfileBtn = $('#accessprofile-save'),
        $troubleshootingModal = $('#troubleshooting-modal'),
        $installFirmwareButton = $("#install-firmware-button"),
        $downgradeFirmwareButton = $("#downgrade-firmware-button"),
        $updateCertificateButton = $("#update-certificate-button"),
        $progressBar = $('.progress-bar'),
        $progress = $('.progress'),
        $createAutomationBtn = $('#automatedactioncreatemlink'),
        $saveAdvancedSettings = $("#saveAdvancedSettings");
        
    let apTypeSelectorName                 = "profile-type-selector";
    let apGroupSelectorDivName             = "input-group-ap-group-selector-div";
    let apGroupSelectorSelectName          = "ap-group-selector-select";
    let apScheduleDaysCheckboxYesId        = "schedule_repeat_checkbox_yes";
    let apScheduleDaysCheckboxNoId         = "schedule_repeat_checkbox_no";
    let apEnableProfileCheckboxYesId       = "ap_enable_checkbox_yes";
    let aaEnableAutomationCheckboxYesId    = "aa_enable_checkbox_yes";
    let aaEnableAdminOverrideCheckYesId    = "aa_admin_overide_checkbox_yes";
    let aaEnableAdminOverrideCheckNoId     = "aa_admin_overide_checkbox_no";
    let aaEnableUserOverrideCheckYesId     = "aa_user_overide_checkbox_yes";
    let aaEnableUserOverrideCheckNoId      = "aa_user_overide_checkbox_no";
    let aaEnableGuestOverrideCheckYesId    = "aa_guest_overide_checkbox_yes";
    let aaEnableGuestOverrideCheckNoId     = "aa_guest_overide_checkbox_no";
    let apScheduleDaysMultiSelectName      = "shedule-specifiy-days-selector";
    let apScheduleDaysRadiosetName         = "ap-schedule-is-select-days";
    let $apScheduleDaysCheckboxYes  = $("#"+apScheduleDaysCheckboxYesId );
    let $apScheduleDaysCheckboxNo   = $("#"+apScheduleDaysCheckboxNoId );
    let $apEnableProfileCheckboxYes = $('#'+apEnableProfileCheckboxYesId);
    let $aaEnableAutomationCheckboxYes = $('#'+aaEnableAutomationCheckboxYesId);
    let $aaEnableAdminOverrideCheckYes = $('#'+aaEnableAdminOverrideCheckYesId);
    let $aaEnableAdminOverrideCheckNo  = $('#'+aaEnableAdminOverrideCheckNoId);
    let $aaEnableUserOverrideCheckYes  = $('#'+aaEnableUserOverrideCheckYesId);
    let $aaEnableUserOverrideCheckNo   = $('#'+aaEnableUserOverrideCheckNoId);
    let $aaEnableGuestOverrideCheckYes = $('#'+aaEnableGuestOverrideCheckYesId);
    let $aaEnableGuestOverrideCheckNo  = $('#'+aaEnableGuestOverrideCheckNoId);
    let $apScheduleDaysMultiSelect  = $('#'+apScheduleDaysMultiSelectName);
    let $apTypeSelector             = $('#'+apTypeSelectorName);
    let $apGroupSelectorDiv         = $('#'+apGroupSelectorDivName);
    let $apGroupSelectorSelect      = $('#'+apGroupSelectorSelectName);
    let $apCredentialInputGroup     = $('#input-group-ap-credentials');
    let $apCredetialLabel           = $('#label-access-profile-credentials');
    let $apCredentialHelp           = $('#iot_help_info_credential_id');
    let $apScheduleDaysCheckboxDiv  = $('#shedule_div_specifiy_days');
    let $apScheduleDaysSelectorDiv  = $('#shedule-specifiy-days-div');
    let $aaScheduleDaysSelectorDiv  = $('#automated-shedule-specifiy-days-div');
    let $apProfileStatusView        = $('#access-profile-status');
    let $apScheduleDaysCheckbox     = $('.schedule_repeat_checkbox');
    let $apEnableProfileCheckbox    = $('.ap_enable_checkbox');

    let gpEnableGuestCheckboxYesId  = "gp_enable_checkbox_yes";
    let $gpEnableGuestCheckboxYes   = $('#' + gpEnableGuestCheckboxYesId);
    let $gpGuestStatus              = $('#guest-profile-status');
    let $gpEnableGuestCheckbox      = $('.gp_enable_checkbox');
    let $guestUID                   = $("#guestprofilesUID");
    let $guestName                  = $("#guest-profile-name");
    let $guestEmail                 = $('#guest-profile-email');
    let $guestToken                 = $('#guest-token');
    let $saveGuestBtn               = $('#guestprofile-save');
    let $guestEndDate               = $('#guest-profile-end-at-date');
    let $createGuestBtn             = $('#guestaccesscreatemlink');
    let $guestModalTitle            = $("#guest-modal-title");
    let $guestInviteStatus          = $('#guest-invite-status');
    let $guestProfileDataField      = $("#guestprofilesData");
    let guestScopeSelectorId        = "guestprofile-scope-object-selector";
    let $guestScopeSelector         = $('#' + guestScopeSelectorId);
    let guestModalId                = "modalguestaccess"
    let $guestModal                 = $('#'+guestModalId);
    
    let $aaEnableAutomationCheckbox    = $('.aa_enable_checkbox');
    let aaScheduleDaysMultiSelectName  = "aa-shedule-specifiy-days-selector";
    let $aaScheduleDaysMultiSelect     = $('#' + aaScheduleDaysMultiSelectName);
    let $automatedActionDataField      = $("#automatedActionData");
    let $aaAdminOverrideCheckbox       = $('.aa_admin_overide_checkbox');
    let $aaUserOverrideCheckbox        = $('.aa_user_overide_checkbox');
    let $aaScheduleDaysCheckbox        = $('.schedule_is_days_checkbox');
    let aaScheduleDaysCheckboxYesId    = "schedule_is_days_checkbox_yes";
    let aaScheduleDaysCheckboxNoId     = "schedule_is_days_checkbox_no";
    let $aaScheduleDaysCheckboxYes     = $("#"+aaScheduleDaysCheckboxYesId );
    let $aaScheduleDaysCheckboxNo      = $("#"+aaScheduleDaysCheckboxNoId );
    let $automatedActionStatus         = $('#automated-action-status');
    let $automatedActionName           = $('#automated-action-name');
    let $automatedActionType           = $('#automated-action-type');
    let $automatedActionDesiredState   = $('#automated-action-desired-state-selector');
    let $saveAutomatedAccessBtn        = $('#automated-action-save');
    let aaScheduleDaysRadiosetName     = "aa-schedule-is-select-days";
    let aaAdminOverrideRadiosetName    = "aa_admin_overide_checkbox";
    let aaUserOverrideRadiosetName     = "aa_user_overide_checkbox";
    let aaGuestOverrideRadiosetName    = "aa_guest_overide_checkbox";
    var tabNameToObjMap = { 'access-profiles': { 'tab': $accessProfilesTable, 'timer': null }, 'automated-actions':{ 'tab':$automatedActionsTable, 'timer':null }, 'guest-access':{ 'tab':$guestAccessTable, 'timer':null }, 'events': { 'tab': $eventTable, 'timer': null }, 'audit-logs': { 'tab': $logsTable, 'timer': null }, 'devices-events': { 'tab': $devicesTable, 'timer': null } };
    $('.nav-tabs a').on("show.bs.tab", function (e) {
        var name = e.target.attributes['aria-controls'].nodeValue;
        var oldName = e.relatedTarget.attributes['aria-controls'].nodeValue;
        var currentObj = tabNameToObjMap[name] ? tabNameToObjMap[name] : null;
        var oldObj = tabNameToObjMap[oldName] ? tabNameToObjMap[oldName] : null;
        if (oldObj && oldObj.timer) {
            clearInterval(oldObj.timer)
            oldObj.timer = null;
            tabNameToObjMap[oldName] = oldObj;
        }

        if (name == 'users') {
            $resetButton.show();
            $pclink.show();
            $ssllink.show();
        } else {
            $resetButton.hide();
            $pclink.hide();
            $ssllink.hide();
            if (currentObj) {
                if (currentObj.timer) {
                    clearInterval(currentObj.timer)
                    currentObj.timer = null;
                }

                var timeoutValue = undefined;

                if (['access-profiles','automated-actions'].includes(name)) {
                    timeoutValue = 15000;
                } if (!['audit-logs', 'devices-events'].includes(name)) {
                    // do not set refresh interval for audit logs and devices events tables
                    timeoutValue = 60000;
                }

                if (timeoutValue) {
                    currentObj.timer = setInterval(function () {
                        currentObj.tab.bootstrapTable('refresh', { silent: true, query: { pageNumber: currentObj.tab.bootstrapTable('getOptions').pageNumber, pageSize: currentObj.tab.bootstrapTable('getOptions').pageSize } });
                    }, timeoutValue);
                }
                tabNameToObjMap[name] = currentObj;
            }
        }
    });
    $("#modalguestaccess").on("hidden.bs.modal", function () {
        window.location = "#guest-access";
    });
    $("#setiotaccess").on("hidden.bs.modal", function () {
        window.location = "#access-profiles";
    });
    $("#setiotautomatedaction").on("hidden.bs.modal", function () {
        window.location = "#automated-actions";
    });

    if(document.location.hash!='') {
        //get the index from URL hash
        var select = 'a[href="'+ document.location.hash +'"]';
        $(select).trigger('click');
    }
    $table.on("page-change.bs.table", function () {
        $removeButton.prop("disabled", true);
        $inviteButton.prop("disabled", true);
        selectUsers.slice(0, selectUsers.length);
    });
    $table.on('check.bs.table uncheck.bs.table check-all.bs.table uncheck-all.bs.table',
        function () {
            var $this = $(this),
                id = $this.prop("id"),
                toolbar = $this.data('toolbar');
            $removeButton.prop('disabled', !$('#' + id).bootstrapTable('getSelections').length);
            $inviteButton.prop('disabled', !$('#' + id).bootstrapTable('getSelections').length);
            selectUsers = $.map($("#" + id).bootstrapTable('getSelections'), function (row) {
                return row.id;
            });
        });

    $table.on("page-change.bs.table", function () {
        $removeButton.prop("disabled", true);
        $inviteButton.prop("disabled", true);
        selectUsers.slice(0, selectUsers.length);
    });
    $table.on('check.bs.table uncheck.bs.table check-all.bs.table uncheck-all.bs.table',
        function () {
            var $this = $(this),
                id = $this.prop("id"),
                toolbar = $this.data('toolbar');
            $removeButton.prop('disabled', !$('#' + id).bootstrapTable('getSelections').length);
            $inviteButton.prop('disabled', !$('#' + id).bootstrapTable('getSelections').length);
            selectUsers = $.map($("#" + id).bootstrapTable('getSelections'), function (row) {
                return row.id;
            });
        });

    $removeButton.on('click', function () {
        var $this = $(this);
        if (confirm(_('Are you sure you wish to remove these users from SmartOffice server?'))) {
            $this.find("span").text(_("Removing..."));
            $this.prop("disabled", true);
            $inviteButton.prop("disabled", true);
            $.post("ajax.php", { command: "remove", module: "iotserver", users: selectUsers }, function (data) {
                $this.find("span").text(_('Remove Users'));
                if (data.status) {
                    $table.bootstrapTable('remove', {
                        field: "id",
                        values: selectUsers
                    });
                    selectUsers = [];
                    toggle_reload_button("show");
                    $("#header-message").html(data.header);
                } else {
                    $this.prop("disabled", true);
                    alert(data.message);
                }
            })
        }
    });

    $inviteButton.on('click', function () {
        var $this = $(this);
        if (confirm(_('Are you sure you wish to Invite the selected users to SmartOffice'))) {
            $this.find("span").text(_("Inviting..."));
            $this.prop("disabled", true);
            $removeButton.prop("disabled", true);

            $.post("ajax.php", { command: "generateTmpPwd", module: "iotserver", users: selectUsers }, function (data) {
                if (data.status) {
                    $table.bootstrapTable('refresh');
                    window.location.reload();
                } else {
                    if (data.message) alert(data.message);
                    $this.find("span").text(_("Invite Users"));
                    $this.prop("disabled", false);
                }
                selectUsers = [];
            });
        }
    });


    $exportButton.on('click', function () {
        $importBrowseSpan.hide();
        $importFileSpan.hide();
        $importRemoteDiv.hide()
        $exportHelp.attr("style", "visibility:visible");
        $exportLabel.attr("style", "visibility:visible");
        $bulkActionRun.attr("style", "visibility:visible")

        $importButton.removeClass();
        $exportButton.removeClass();


        $importButton.addClass('list-group-item');
        $exportButton.addClass('list-group-item active');
        $("#activityval").val('export');
        $bulkHelp.text(_("Export SmartOffice Users to CSV file"));
    })

    $importButton.on('click', function () {
        $importBrowseSpan.attr("style", "visibility:visible");
        $importFileSpan.attr("style", "visibility:visible");
        $exportHelp.hide()
        $exportLabel.hide()

        if (!$localFName.val() || $localFName.val() == "") {
            $bulkActionRun.hide()
            $importRemoteDiv.attr("style", "visibility:visible");
        }
        $importButton.removeClass();
        $exportButton.removeClass();

        $importButton.addClass('list-group-item active');
        $exportButton.addClass('list-group-item');
        $("#activityval").val('import');
        $bulkHelp.text(_("Import SmartOffice Users from CSV file"));
    })

    $importBrowseInput.on('change', function () {
        var $this = $(this);
        var files = $this[0].files[0];
        if (!files) {
            alert('No file choosen');
            $bulkActionRun.hide();
            $importRemoteDiv.attr("style", "visibility:visible");
        } else {
            var fd = new FormData();
            fd.append('import', files);
            $.ajax({
                url: 'ajax.php?module=iotserver&command=upload_users',
                type: 'post',
                data: fd,
                contentType: false,
                processData: false,
                success: function (response) {
                    if (response.status === true) {
                        $localFName.val(response.localfilename);
                        alert('file uploaded');
                        $bulkActionRun.attr("style", "visibility:visible")
                        $importRemoteDiv.hide()
                    } else {
                        alert('file not uploaded');
                    }
                },
            });
        }
    })

    $bulkActionRun.on('click', function () {
        var $this = $(this);
        var action = $("#activityval").val();
        var file = $localFName.val();
        var perc = 0;
        // if(confirm(_('Are you sure you want to run ' + action + ' action?'))){

        if (action == 'export') {
            window.location = '?display=smartoffice&quietmode=true&activity=export';
        } else {

            $(".progress-bar").css("width", "");
            $(".progress").removeClass("hidden");
            $(".progress-bar").addClass("active");

            var timer = setInterval(function () {
                perc += 5;
                $(".progress-bar").css("width", perc + "%");
            }, 5000);

            $.post("ajax.php", { command: "import", module: "iotserver", localfilename: file }, function (data) {
                $this.find("span").text(_("Importing..."));
                $this.prop("disabled", true);
                clearInterval(timer);
                if (data.status) {
                    $(".progress-bar").css("width", "100%");
                    $(".progress-bar").removeClass("active");
                    $this.prop("disabled", false);
                    if (data.message) alert(data.message);
                    window.location = '?display=smartoffice';
                } else {
                    $this.prop("disabled", true);
                    alert(data.message);
                }
            })
        }
        // }
    })

    $saveAdvancedSettings.on('click', function () {
        var $this = $(this);
        var bind_ip = $("#iot-binding-address option:selected").val();
        var bind_port = $("#iot-binding-port").val();
        var key = $("#iot-cert-key").val();
        var display_name = $("#iot-display-name").val();
        var cert = $("#iot-cert").val();
        var web_expose = $("#iot-web-expose option:selected").val();

        if (!bind_ip) {
            alert('Invalid bind ip address');
            return;
        }

        if (!bind_port) {
            alert('Invalid bind port number');
            return;
        }

        if (!key) {
            alert('Invalid ssl private key path');
            return;
        }

        if (!cert) {
            alert('Invalid ssl certificate path');
            return;
        }

        if (!display_name) {
            alert('Invalid display name');
            return;
        }
        var data = { ip: bind_ip, port: bind_port, key: key, cert: cert, display_name: display_name, web_expose: (web_expose == "true") ? true : false };

        if (confirm(_('Are you sure you want to submit these Settings? This will disconnect all connected users and restart the SmartOffice server'))) {
            $.post("ajax.php", { command: "saveAdvancedSettings", module: "iotserver", settings: data }, function (data) {
                if (data.status) {
                    window.location.reload();
                } else {
                    alert(data.msg)
                }
            });
        }
    })

    $(".iot_help_info").mouseenter(function () {
        $this = $(this);
        $element = $this.data('for');
        $("#"+$element).fadeIn();
    });
    $(".iot_help_info").mouseleave(function(){
        $this = $(this);
        $element = $this.data('for');
        $("#"+$element).fadeOut();
    });
    $(document).on("click", 'a[id^="guestaccesssmlink"]', function () {
        var guests_data = JSON.parse(atob($(this).data('tmpguestdata')));
        $guestUID.val($(this).data('guestuid'));
        $guestProfileDataField.val($(this).data('tmpguestdata'));
        $guestModalTitle.html("Edit Guest User");
        $guestName.val(guests_data.guestname);
        $guestEmail.val(guests_data.email);
        $guestEndDate.val(guests_data.expiry);
        $guestInviteStatus.val(guests_data.invite_status);
        $guestToken.val(guests_data.token);
        var objs = guests_data['groups'];
        var sel = objs.find(x => x.uuid == guests_data.access_scope);
        sel = sel ? sel : { name: "", uuid: "" };
        objs = objs ? objs : [];
        objs.forEach((obj) => {
            $guestScopeSelector.append($("<option></option>").attr("value", obj.uuid).text(obj.name));
        });
        $guestScopeSelector.val(sel.uuid);
        if (guests_data.status == "enabled" || guests_data.status == "active") {
            $gpEnableGuestCheckboxYes.prop('checked', true);
            $saveGuestBtn.text(GUEST_SAVE_BUTTON_TEXT_INVITE)
        } else {
            $saveGuestBtn.text(GUEST_SAVE_BUTTON_TEXT)
            $gpEnableGuestCheckboxYes.prop('checked', false);
        }
        $gpGuestStatus.val(guests_data.status);
    });
    $(document).on("click", 'a[id^="accesssmlink"]', function () {
        var profile_data = JSON.parse(atob($(this).data('tmpdata')));

        $("#profilesData").val($(this).data('tmpdata'))

        $("#access-profile-modal-title").html("Edit Access Profile");
        $("#access-profile-name").val(profile_data.name);
        $("#access-profile-name").attr('readonly', true);

        $("#access-profile-credentials").val(profile_data.pincode);
        $apProfileStatusView.val(profile_data.status);
        $("#profilesUID").val($(this).data('accessuid'));
        $('#profile-type-selector').val(profile_data.type);

        arrangeApItemsByApType();
        if (profile_data.status=="running" || profile_data.status=="active") {
            $apEnableProfileCheckboxYes.prop('checked',true);
        } else if(profile_data.status=="disabled" || profile_data.status=="expired") {
            $apEnableProfileCheckboxYes.prop('checked',false);
        }
        var scope_type = profile_data.access_scope;
        $("#profile-scope-type-selector").val(scope_type);

        var option = $('<option></option>').attr("value", "").text("Choose one object");
        $("#profile-scope-object-selector").empty().append(option);

        if (scope_type == "") {
            $("#profile-scope-object-selector").val("");
        } else {
            var objs = profile_data[scope_type + 's'];
            var sel = objs.find(x => x.uuid == profile_data.scope_object_uuid);
            sel = sel ? sel : { name: "", uuid: "" };
            objs = objs ? objs : [];
            objs.forEach((obj) => {
                $("#profile-scope-object-selector").append($("<option></option>").attr("value", obj.uuid).text(obj.name));
            })
            $("#profile-scope-object-selector").val(sel.uuid);
        }


        if (profile_data.start_time) {
            let arr = profile_data.start_time.split('|');
            if (arr[0].includes('EveryDay') || arr[0].includes('[')) {
                $('#access-profile-start-at-date').val('')  
            } else {
                $('#access-profile-start-at-date').val(arr[0].trim())
            }
            if (arr[1] !== undefined)
            $('#access-profile-start-at-time').val(arr[1].trim())
        } else {
            $('#access-profile-start-at-date').val('')
            $('#access-profile-start-at-time').val('')
        }
        var selected_days = [];
        if (profile_data.end_time) {
            let arr = profile_data.end_time.split('|');
            if (arr[0].includes('EveryDay') ) {
                $('#access-profile-end-at-date').val('');
            } else if (arr[0].includes('[')) {
                $('#access-profile-end-at-date').val('');
                  selected_days = arr[0].replace(/[\[\]"]+/g,'').trim().split(",");
            } else {
                $('#access-profile-end-at-date').val(arr[0].trim())
            }
            if (arr[1] !== undefined) $('#access-profile-end-at-time').val(arr[1].trim())
        } else {
            $('#access-profile-end-at-date').val('')
            $('#access-profile-end-at-time').val('')
        }
        if (selected_days.length > 0) {
            var selected_days_num = convertDaysStrToNum(selected_days);
            $apScheduleDaysMultiSelect.val(selected_days_num);
            $apScheduleDaysMultiSelect.multiselect('rebuild');
            $apScheduleDaysCheckboxYes.prop('checked',true);
            $('#access-profile-start-at-date').val('').attr("disabled", "disabled");
            $('#access-profile-end-at-date').val('').attr("disabled", "disabled");
        } else {
            $apScheduleDaysCheckboxYes.prop('checked',false);
            $apScheduleDaysMultiSelect.multiselect("clearSelection");
            $apScheduleDaysSelectorDiv.hide();
        }

        let current_status = $('button.iot-round-button').attr('class').replace(/iot-round-button\s*/, '');
        current_status = current_status == '' ? 'disabled' : current_status;

        if (profile_data.status == 'running' || profile_data.status == 'active') {

            $("#access-profile-start-at-date").attr('disabled', true);
            $("#access-profile-start-at-time").attr('disabled', true);

            $("#access-profile-end-at-date").attr('disabled', true);
            $("#access-profile-end-at-time").attr('disabled', true);

            $("#profile-scope-type-selector").attr('disabled', true);
            $("#profile-scope-object-selector").attr('disabled', true);

            $("#access-profile-credentials").attr('readonly', true);

            $("#refresh-pincode").attr('disabled', true);
            $('#profile-type-selector').attr('disabled', true);

            $('#reset-start-date').attr('disabled', true);
            $('#reset-start-time').attr('disabled', true);

            $('#reset-end-date').attr('disabled', true);
            $('#reset-end-time').attr('disabled', true);

            $apScheduleDaysCheckboxYes.attr('disabled',true);
            $apScheduleDaysCheckboxNo.attr('disabled',true);
            $apScheduleDaysMultiSelect.multiselect("disable");
            $apGroupSelectorSelect.multiselect('disable');
            

        }



        $('button.iot-round-button').removeClass(current_status).addClass(profile_data.status);
    });
    $(document).on("click", 'a[id^="automatedactionmlink"]', function () {

        var automated_action_data = JSON.parse(atob($(this).data('tmpautomationdata')));
        $("#automatedActionData").val($(this).data('tmpautomationdata'))

        $("#automated-action-modal-title").html("Edit Automated Action");
        $("#automated-action-name").val(automated_action_data.name);
        $("#automated-action-name").attr('readonly', true);
        
        $('#automated-action-type').val(automated_action_data.type);
        $("#automated-action-desired-state-selector").val(automated_action_data.desired_state);
        
        $("#automatedActionUID").val($(this).data('automatedactionuid'));

        if (automated_action_data.status=="running" || automated_action_data.status=="active") {
            $aaEnableAutomationCheckboxYes.prop('checked',true); 
            $automatedActionStatus.val("active");
        } else if(automated_action_data.status=="disabled" || automated_action_data.status=="expired") {
            $aaEnableAutomationCheckboxYes.prop('checked',false);
            $automatedActionStatus.val("disabled");
        }
        var scope_type = automated_action_data.access_scope;
        $("#automated-action-scope-type-selector").val(scope_type);

        var option = $('<option></option>').attr("value", "").text("Choose one object");
        $("#automated-action-scope-object-selector").empty().append(option);

        if (scope_type == "") {
            $("#automated-action-scope-object-selector").val("");
        } else {
            var objs = automated_action_data[scope_type + 's'];
            var sel = objs.find(x => x.uuid == automated_action_data.scope_object_uuid);
            sel = sel ? sel : { name: "", uuid: "" };
            objs = objs ? objs : [];
            objs.forEach((obj) => {
                $("#automated-action-scope-object-selector").append($("<option></option>").attr("value", obj.uuid).text(obj.name));
            })
            $("#automated-action-scope-object-selector").val(sel.uuid);
        }


        var selected_days = [];
        if (automated_action_data.start_time) {
            let arr = automated_action_data.start_time.split('|');
            if (arr[0].includes('EveryDay')) {
                $('#automated-action-start-at-date').val('')  
            } else if(arr[0].includes('[')) {
                $('#automated-action-start-at-date').val('');
                selected_days = arr[0].replace(/[\[\]"]+/g,'').trim().split(",");
            } else{
                $('#automated-action-start-at-date').val(arr[0].trim())
            }
            if (arr[1] !== undefined)
            $('#automated-action-start-at-time').val(arr[1].trim())
        } else {
            $('#automated-action-start-at-date').val('')
            $('#automated-action-start-at-time').val('')
        }
        if (automated_action_data.end_time) {
            let arr = automated_action_data.end_time.split('|');
            if (arr[0].includes('EveryDay') || arr[0].includes('[')) {
                $('#automated-action-end-at-date').val('');
            } else {
                $('#automated-action-end-at-date').val(arr[0].trim())
            }
            if (arr[1] !== undefined) $('#automated-action-end-at-time').val(arr[1].trim())
        } else {
            $('#automated-action-end-at-date').val('')
            $('#automated-action-end-at-time').val('')
        }
        if (selected_days.length > 0) {
            var selected_days_num = convertDaysStrToNum(selected_days);
            $aaScheduleDaysMultiSelect.val(selected_days_num);
            $aaScheduleDaysMultiSelect.multiselect('rebuild');
            $aaScheduleDaysCheckboxYes.prop('checked',true);
            $('#automated-action-start-at-date').val('').attr("disabled", "disabled");
            $('#automated-action-end-at-date').val('').attr("disabled", "disabled");
        } else {
            $aaScheduleDaysCheckboxYes.prop('checked',false);
            $aaScheduleDaysMultiSelect.multiselect("clearSelection");
            $aaScheduleDaysSelectorDiv.hide();
        }

        let current_status = $('button.iot-round-button').attr('class').replace(/iot-round-button\s*/, '');
        current_status = current_status == '' ? 'disabled' : current_status;

        if (automated_action_data.status == 'running' || automated_action_data.status == 'active') {

            $("#automated-action-start-at-date").attr('disabled', true);
            $("#automated-action-start-at-time").attr('disabled', true);

            $("#automated-action-end-at-date").attr('disabled', true);
            $("#automated-action-end-at-time").attr('disabled', true);

            $("#automated-action-scope-type-selector").attr('disabled', true);
            $("#automated-action-scope-object-selector").attr('disabled', true);


            $('#automated-action-type-selector').attr('disabled', true);

            $('#automated-action-reset-start-date').attr('disabled', true);
            $('#automated-action-reset-start-time').attr('disabled', true);

            $('#automated-action-reset-end-date').attr('disabled', true);
            $('#automated-action-reset-end-time').attr('disabled', true);

            $aaScheduleDaysCheckboxYes.attr('disabled',true);
            $aaScheduleDaysCheckboxNo.attr('disabled',true);
            $aaScheduleDaysMultiSelect.multiselect("disable");
            $aaEnableAdminOverrideCheckYes.attr('disabled',true);
            $aaEnableAdminOverrideCheckNo.attr('disabled',true);
            $aaEnableUserOverrideCheckYes.attr('disabled',true);
            $aaEnableUserOverrideCheckNo.attr('disabled',true);
            $aaEnableGuestOverrideCheckYes.attr('disabled',true);
            $aaEnableGuestOverrideCheckNo.attr('disabled',true);
            $automatedActionDesiredState.attr('disabled',true);
            $automatedActionType.attr('disabled',true);
            $automatedActionName.attr('disabled',true);
        }

        $('button.iot-round-button').removeClass(current_status).addClass(automated_action_data.status);
        if (automated_action_data.details) {
            let details = JSON.parse(automated_action_data.details);
            if ( details.user_override && details.user_override == "true" ) {
                $aaEnableUserOverrideCheckYes.prop('checked',true);
            }
            if ( details.admin_override && details.admin_override == "true" ) {
                $aaEnableAdminOverrideCheckYes.prop('checked',true);
            }
            if ( details.guest_override && details.guest_override == "true" ) {
                $aaEnableGuestOverrideCheckYes.prop('checked',true);
            }
        }

    });

    $(document).on("click", 'a[id^="accesscreatemlink"]', function () {
        var profilesData = $(this).data('profilesdata');
        $("#profilesData").val(profilesData)
    });
    $(document).on("click", 'a[id^="guestaccesscreatemlink"]', function () {
        var guestprofilesData = $(this).data('guestprofilesdata');
        $guestProfileDataField.val(guestprofilesData);
        guestprofilesData = JSON.parse(atob(guestprofilesData));
        $guestInviteStatus.val(GUEST_INVITE_STATUS_NOT_APPLICABLE);
        var scope_type = "group";
        var option = $('<option></option>').attr("value", "").text("Choose one Device Group");
        $guestScopeSelector.empty().append(option);
        var objs = guestprofilesData[scope_type + 's'];
        objs = objs ? objs : [];
        objs.forEach((obj) => {
            $guestScopeSelector.append($("<option></option>").attr("value", obj.uuid).text(obj.name));
        })
        $guestScopeSelector.val("");
    });
    var setupBootstrapMultiselect = function(el) {
        $('#'+el).multiselect({
            enableFiltering: true,
            enableCaseInsensitiveFiltering: true,
            buttonWidth: '180px'
        });
    };
    var setupBootstrapMultiselectNoSearch = function(el) {
        $('#'+el).multiselect({
            enableFiltering: false,
            enableCaseInsensitiveFiltering: false
        });
    };

    $apProfileStatusView.attr('disabled','disabled');
    setupBootstrapMultiselectNoSearch(apScheduleDaysMultiSelectName);
    setupBootstrapMultiselectNoSearch(aaScheduleDaysMultiSelectName);
    function arrangeApItemsByApType(){    
        let selected  = $('#'+apTypeSelectorName+' :selected').val();
        if (selected=="usertimed") {
            $apCredentialInputGroup.hide();
            $apGroupSelectorDiv.show();
            $apCredetialLabel.text("Select Group");
            $apCredentialHelp.data('for','ap_usergroups_help');
            $apCredentialHelp.show();
            $apScheduleDaysCheckboxDiv.show();
            apLoadGroupsOnSelector();
        } else if(selected=="user" || selected=="guest") {
            $apGroupSelectorDiv.hide();
            $apCredentialInputGroup.show();
            $apCredetialLabel.text("Credentials");
            $apCredentialHelp.data('for','ap_credentials_help');
            $apCredentialHelp.show();
            $apScheduleDaysCheckboxDiv.hide();
        } else {
            $apGroupSelectorDiv.hide();
            $apCredentialInputGroup.hide();
            $apCredentialHelp.hide();
            $apCredetialLabel.text("");
            $apScheduleDaysCheckboxDiv.hide();
        }
    }
    
    function apLoadGroupsOnSelector(){
        setupBootstrapMultiselect(apGroupSelectorSelectName);
        var profile_data = JSON.parse(atob($("#profilesData").val()));
        var usergroups = profile_data.usergroups;
        $('#'+apGroupSelectorSelectName +' option').remove();

        usergroups.forEach((ugrp,ind) => {
             ugrp = JSON.parse(ugrp);
             $apGroupSelectorSelect.append($("<option></option>").attr("value",ugrp.id).text(ugrp.groupname));
         });
         if(profile_data.details && profile_data.details.usergroups) $apGroupSelectorSelect.val(profile_data.details.usergroups);
         $apGroupSelectorSelect.multiselect('rebuild');
    }
    
    $apTypeSelector.change(function(){
        arrangeApItemsByApType();
    });
    $apScheduleDaysCheckbox.change(function(){
        var $this = $(this);
        
      if($this.attr('id') == apScheduleDaysCheckboxYesId ){
        $apScheduleDaysSelectorDiv.show();
        $('#access-profile-start-at-date').val('').attr("disabled", "disabled");
        $('#access-profile-end-at-date').val('').attr("disabled", "disabled");
      }else{
        $('#access-profile-start-at-date').removeAttr("disabled");
        $('#access-profile-end-at-date').removeAttr("disabled");
        $apScheduleDaysMultiSelect.multiselect("clearSelection");
        $apScheduleDaysSelectorDiv.hide();
      }
    });
    $apEnableProfileCheckbox.change(function(){
        var $this = $(this);
        $apProfileStatusView.attr('class').replace(/iot-round-button\s*/,'');
        if($this.attr('id') == apEnableProfileCheckboxYesId){ 
            $apProfileStatusView.removeClass();
            $apProfileStatusView.addClass("iot-round-button active");
        }else{
            $apProfileStatusView.removeClass();
            $apProfileStatusView.addClass("iot-round-button disabled");
        }
    });
    $gpEnableGuestCheckbox.change(function(){
        var $this = $(this);
        var status = "disabled";
        var save_button_text = GUEST_SAVE_BUTTON_TEXT;
        if ($this.val() == "true"){
            status = "enabled";
            save_button_text = GUEST_SAVE_BUTTON_TEXT_INVITE;
        } 
        $gpGuestStatus.val(status);
        $saveGuestBtn.text(save_button_text);
    });
    $("#profile-scope-type-selector").on('change', function () {
        var $this = $(this);
        var profile_data = JSON.parse(atob($("#profilesData").val()))
        var scope_type = $("#profile-scope-type-selector option:selected").val();
        var option = $('<option></option>').attr("value", "").text("Choose one object");
        $("#profile-scope-object-selector").empty().append(option);

        if (scope_type != '') {
            var objs = profile_data[scope_type + 's'];
            objs = objs ? objs : [];
            objs.forEach((obj) => {
                $("#profile-scope-object-selector").append($("<option></option>").attr("value", obj.uuid).text(obj.name));
            })
            $("#profile-scope-object-selector").val("");
        }
        $("#profile-scope-object-selector").val("");
    })


    $createProfileBtn.on('click', function () {
        var $this = $(this);
        //var profile_data = JSON.parse($(this).data('tmpData'));
        //var profile_data = JSON.parse($("#profilesData").val());
        $("#profile-scope-type-selector").val("");
        $("#profile-scope-object-selector").val("");
        $("#access-profile-modal-title").html("Create Access Profile");
        $("#profilesUID").val("")

        $('#access-profile-start-at-date').val('');
        $('#access-profile-start-at-time').val('');
        $('#access-profile-end-at-date').val('');
        $('#access-profile-end-at-time').val('');
        $apScheduleDaysSelectorDiv.hide();
        arrangeApItemsByApType();
    })
    $createGuestBtn.on('click', function () {
        var $this = $(this);
        $guestToken.val('');
        $guestScopeSelector.val("");
        $guestModalTitle.html("Add Guest User");
        $guestUID.val("");
        $guestEndDate.val('');
    });
    $("#automated-action-scope-type-selector").on('change', function () {
        var $this = $(this);
        var automatedActionData = JSON.parse(atob($("#automatedActionData").val()))
        var scope_type = $("#automated-action-scope-type-selector option:selected").val();
        var option = $('<option></option>').attr("value", "").text("Choose one object");
        $("#automated-action-scope-object-selector").empty().append(option);
        
        if (scope_type != '') {
            var objs = automatedActionData[scope_type + 's'];
            objs = objs ? objs : [];
            objs.forEach((obj) => {
                $("#automated-action-scope-object-selector").append($("<option></option>").attr("value", obj.uuid).text(obj.name));
            })
            $("#automated-action-scope-object-selector").val("");
        }
        $("#automated-action-scope-object-selector").val("");
    })
    $aaEnableAutomationCheckbox.change(function(){
        var $this = $(this);
        var status = ($this.val() == "true") ? "active" : "disabled";
        $automatedActionStatus.val(status);
    });
    $aaScheduleDaysCheckbox.change(function(){
        var $this = $(this);
        
      if($this.attr('id') == aaScheduleDaysCheckboxYesId ){
        $aaScheduleDaysSelectorDiv.show();
        $('#automated-action-start-at-date').val('').attr("disabled", "disabled");
        $('#automated-action-end-at-date').val('').attr("disabled", "disabled");
      }else{
        $('#automated-action-start-at-date').removeAttr("disabled");
        $('#automated-action-end-at-date').removeAttr("disabled");
        $aaScheduleDaysMultiSelect.multiselect("clearSelection");
        $aaScheduleDaysSelectorDiv.hide();
      }
    });

    $aaAdminOverrideCheckbox.change(function(){
        var $this = $(this);
        if($this.attr('id') == aaEnableAdminOverrideCheckNoId){
            $aaEnableUserOverrideCheckYes.prop('checked',false);
            $aaEnableUserOverrideCheckNo.prop('checked',true);
        }
    });

    $aaUserOverrideCheckbox.change(function(){
        var $this = $(this);
        if($this.attr('id') == aaEnableUserOverrideCheckYesId){
            $aaEnableAdminOverrideCheckYes.prop('checked',true);
            $aaEnableAdminOverrideCheckNo.prop('checked',false);
        }
    })
    
    $createAutomationBtn.on('click', function () {
        var $this = $(this);
        var automatedActionData = $this.data('autoactionsdata');
        $automatedActionDataField.val(automatedActionData);

        $('#automated-action-type').val('access_automation');

        $("#automated-action-scope-type-selector").val("");
        $("#automated-action-scope-object-selector").val("");
        $("#automated-action-modal-title").html("Create Automation");
        $("#automatedActionUID").val("");

        $('#automated-action-start-at-date').val('');
        $('#automated-action-start-at-time').val('');
        $('#automated-action-end-at-date').val('');
        $('#automated-action-end-at-time').val('');
        $aaScheduleDaysSelectorDiv.hide();
    })

    $('#setiotaccess').on('show.bs.modal', function () {
        if ($("#profilesUID").val() == "") {
            $("#access-profile-modal-title").html("Create Access Profile");
        } else {
            $("#access-profile-modal-title").html("Edit Access Profile");
        }
    });
    

    $guestModal.on('hidden.bs.modal', function () {
        window.location.reload();
    });
    $guestModal.on('show.bs.modal', function () {
        if ($guestUID.val() == "") {
            $guestModalTitle.html("Add Guest User");
        } else {
            $guestModalTitle.html("Edit Guest User");
        }
    });
    $('#setiotautomatedaction').on('show.bs.modal', function () {
        if ($("#automatedActionUID").val() == "") {
            $("#automated-action-modal-title").html("Create Automated Action");
        } else {
            $("#automated-action-modal-title").html("Edit Automated Action");
        }
    });
    

    $('#setiotaccess').on('hidden.bs.modal', function () {
        window.location.reload();
    });
    $('#setiotautomatedaction').on('hidden.bs.modal', function () {
        window.location.reload();
    });
    var days = new Array();
   
    days[1] = "Mon";
    days[2] = "Tue";
    days[3] = "Wed";
    days[4] = "Thu";
    days[5] = "Fri";
    days[6] = "Sat";
    days[7] = "Sun";
    function convertDaysStrToNum(selected_days){
        var selected_days_num  = [];
        days.forEach(function(curr,index){
            if(selected_days.includes(curr)) {
                selected_days_num.push(index);
            }
        });
        return selected_days_num;
    }
    $saveGuestBtn.on('click', function () {
        var $this = $(this);
        let current_status = $gpGuestStatus.val();
        current_status = current_status == '' ? 'disabled' : current_status;

        let guest_name = $guestName.val();
        let guest_email = $guestEmail.val();
        let expiry_date = $guestEndDate.val();
        let scope_uuid = $('#' +guestScopeSelectorId+ ' option:selected').val();
        let invite_status = $guestInviteStatus.val();
        let token = $guestToken.val();
        let id = $guestUID.val();


        if (!guest_name || !guest_name.trim()) {
            alert('Inavlid Guest Name');
            return;
        }

        if (!guest_email || !guest_email.trim()) {
            alert('Inavlid Guest Email');
            return;
        }

        if (!expiry_date || !expiry_date.trim()) {
            alert('Please select a expiry date');
            return;
        }
        if (!scope_uuid || !scope_uuid.trim()) {
            alert('Inavlid Access Scope');
            return;
        }
        if (!token || !token.trim()) {
            token = generateUUID();
        }
        var guestprof = { name: guest_name, email: guest_email, expiry: expiry_date, access_scope: scope_uuid, invite_status: invite_status, status: current_status,token:token };
        if (id && id.trim()) {
            guestprof.id = id.trim();
        }
        if(current_status == "enabled"){
            $.post("ajax.php", { command: "inviteGuestUser", module: "iotserver", guestname:guest_name,expiry: expiry_date, email : guest_email,device: scope_uuid ,token : token}, function (data) {
                if (data.status) {
                    guestprof.invite_status = "Invite sent";
                } else {
                    guestprof.invite_status = GUEST_INVITE_STATUS_NOT_APPLICABLE;
                    alert(data.message);
                }
                saveGuest(guestprof,$guestModal);
            });
        }else{
            guestprof.invite_status = GUEST_INVITE_STATUS_NOT_APPLICABLE;
            saveGuest(guestprof,$guestModal);
        }
    });

    $saveProfileBtn.on('click', function () {
        var $this = $(this);
        let current_status = $('button.iot-round-button').attr('class').replace(/iot-round-button\s*/, '');
        current_status = current_status == '' ? 'disabled' : current_status;
        let type = $('#'+apTypeSelectorName  +' option:selected').val();
        let usergroups = $apGroupSelectorSelect.val();
        let schedule_is_days_selected =$('#'+apScheduleDaysRadiosetName+' input:checked').val();
        let selected_days = $apScheduleDaysMultiSelect.val()
        
        let name = $('#access-profile-name').val();
        let scope_type = $('#profile-scope-type-selector option:selected').val();
        let scope_uuid = $('#profile-scope-object-selector option:selected').val();
        let from = $('#access-profile-start-at-date').val(), to = $('#access-profile-end-at-date').val();
        let time_from = $('#access-profile-start-at-time').val(), time_to = $('#access-profile-end-at-time').val();
        let creds = $("#access-profile-credentials").val();
        let id = $("#profilesUID").val();

        if (!type || !type.trim()) {
            alert('Invalid Profile Type');
            return;
        }
        if (type == "user" || type == "guest") {
            if (!creds || !creds.trim()) {
                alert('Invalid Profile credentials');
                return;
            }
            if (isNaN(creds) || creds.length != 6) {
                alert('Invalid Profile Pin Code, Pin Code should be 6 digit number');
                return;
            }
        }else{
            if( !usergroups || usergroups.length <= 0){
                alert('Invalid User Group Selected');
                return;
            }
            if(schedule_is_days_selected && schedule_is_days_selected=="true"){
                if( !selected_days || selected_days.length <= 0){
                    alert('Days must be choosed if Specify days Switch is enabled');
                    return;
                }
            }
        }

        if (!name || !name.trim()) {
            alert('Invalid Profile Name');
            return;
        }

        if (!scope_type || !scope_type.trim()) {
            alert('Invalid Profile Scope');
            return;
        }

        if (!scope_uuid || !scope_uuid.trim()) {
            alert('Invalid Profile Object');
            return;
        }

        if (type == 'guest' && (!from || !from.trim() || !to || !to.trim())) {
            alert('Scheduler must be specified for guest profiles');
            return;
        }

        if (from && from.trim() && (!to || !to.trim())) {
            alert('Invalid scheduler settings. End at cannot be empty if Start at is not empty');
            return;
        }

        if (to && to.trim() && (!from || !from.trim())) {
            alert('Invalid scheduler settings. Start at cannot be empty if End at is not empty');
            return;
        }

        if (time_from && time_from.trim() && (!from || !from.trim()) && (!time_to || !time_to.trim())) {
            alert('Invalid scheduler settings. End time cannot be empty for peridic schedules');
            return;
        }

        if (time_to && time_to.trim() && (!time_from || !time_from.trim())) {
            alert('Invalid scheduler settings. Start time at cannot be empty if End time is not empty');
            return;
        }

        if (!checkDates(from, to, time_from, time_to)) {
            return;
        }

        let pincode = creds;

        var prof = { name: name, type: type, status: current_status, pincode: pincode, access_scope: scope_type, scope_object_uuid: scope_uuid, groups_selected : usergroups }

        if (id && id.trim()) {
            prof.id = id.trim();
        }

        var start = null;
        var end = null;

        if (from && from.trim()) {
            start = from.trim();
            if (!time_from || !time_from.trim()) {
                time_from = '12:00 AM';
            }
        }
        if (type == "usertimed") {
            if ( schedule_is_days_selected=="true" && selected_days.length > 0) {
                var str_selected_days = selected_days.map(d => `"${days[d]}"`).join(',');
                start = '['+ str_selected_days.toString() + ']';
                end = '['+ str_selected_days.toString() + ']';
            }
            if (!time_from || !time_from.trim() || !time_to || !time_to.trim()) {
                alert('Invalid scheduler settings. Start time and End time should be specified for User timed Access Profile');
                return;
            }  
           
        }

        if (time_from && time_from.trim()) {
                start = start ? start + ' | ' + time_from.trim() : 'EveryDay | ' + time_from.trim();
        }

        if (start) {
            prof.start = start;
        } else {
            prof.start = null;
        }

        if (to && to.trim()) {
            end = to.trim();
            if (!time_to || !time_to.trim()) {
                time_to = '12:00 AM';
            }
        }

        if (time_to && time_to.trim()) {
                end = end ? end + ' | ' + time_to.trim() : start.includes('EveryDay') ? 'EveryDay | ' + time_to.trim() : null;
        }

        if (end) {
            prof.end = end;
        } else {
            prof.end = null;
        }

        $.post("ajax.php", { command: "setAccessProfile", module: "iotserver", profile: prof }, function (data) {
            if (data.status) {
                $('#setiotaccess').modal('hide');
            } else {
                alert('Failed to Save Profile: ' + data.message);
            }
        })


    });
    $saveAutomatedAccessBtn.on('click', function () {
        var $this = $(this);
        let current_status = $automatedActionStatus.val();
        current_status = current_status == '' ? 'disabled' : current_status;
        let aa_name = $automatedActionName.val();
        let aa_type = $automatedActionType.val();
        let aa_desired_state = $automatedActionDesiredState.val();
        let aa_schedule_is_days_selected = $('#'+aaScheduleDaysRadiosetName+' input:checked').val();
        let aa_selected_days = $aaScheduleDaysMultiSelect.val();
        let aa_scope_type = $('#automated-action-scope-type-selector option:selected').val();
        let aa_scope_uuid = $('#automated-action-scope-object-selector option:selected').val();
        let aa_from = $('#automated-action-start-at-date').val(), aa_to = $('#automated-action-end-at-date').val();
        let aa_time_from = $('#automated-action-start-at-time').val(), aa_time_to = $('#automated-action-end-at-time').val();
        let aa_id = $("#automatedActionUID").val();
        let aa_admin_override = $('#'+aaAdminOverrideRadiosetName+' input:checked').val();
        let aa_user_override  = $('#'+aaUserOverrideRadiosetName +' input:checked').val();
        let aa_guest_override = $('#'+aaGuestOverrideRadiosetName+' input:checked').val();
        if (!aa_name || !aa_name.trim()) {
            alert('Inavlid Automated Action Name');
            return;
        }
        if (!aa_type || !aa_type.trim()) {
            alert('Inavlid Automated Action Type');
            return;
        }
        if (!aa_desired_state || !aa_desired_state.trim()) {
            alert('Inavlid Automated Action Desired State');
            return;
        }
        if (!aa_scope_type || !aa_scope_type.trim()) {
            alert('Inavlid Automated Action Scope type');
            return;
        }
        if (!aa_scope_uuid || !aa_scope_uuid.trim()) {
            alert('Inavlid Automated Action Scope');
            return;
        }
        if(aa_schedule_is_days_selected && aa_schedule_is_days_selected=="true"){
            if( !aa_selected_days || aa_selected_days.length <= 0){
                alert('Days must be choosed if Specify days Switch is enabled');
                return;
            }
        }    
        if (aa_from && aa_from.trim() && (!aa_to || !aa_to.trim())) {
            alert('Invalid scheduler settings. End at cannot be empty if Start at is not empty');
            return;
        }
        if (aa_to && aa_to.trim() && (!aa_from || !aa_from.trim())) {
            alert('Invalid scheduler settings. Start at cannot be empty if End at is not empty');
            return;
        }
        if (aa_time_from && aa_time_from.trim() && (!aa_from || !aa_from.trim()) && (!aa_time_to || !aa_time_to.trim())) {
            alert('Invalid scheduler settings. End time cannot be empty for peridic schedules');
            return;
        }
        if (aa_time_to && aa_time_to.trim() && (!aa_time_from || !aa_time_from.trim())) {
            alert('Invalid scheduler settings. Start time at cannot be empty if End time is not empty');
            return;
        }
        if (!aa_time_from || !aa_time_from.trim() || !aa_time_to || !aa_time_to.trim()) {
            alert('Invalid scheduler settings. Start time and End time should be specified');
            return;
        }  
        if (!checkDates(aa_from, aa_to, aa_time_from, aa_time_to)) {
            return;
        }
        var details = { admin_override:aa_admin_override, user_override:aa_user_override, guest_override: aa_guest_override };
        var automatedAction = { name: aa_name, type: aa_type, desired_state: aa_desired_state, access_scope: aa_scope_type, scope_object_uuid: aa_scope_uuid, status: current_status, details : details };
        
        if (aa_id && aa_id.trim()) {
            automatedAction.id = aa_id.trim();
        }
        var start = null;
        var end = null;
        if (aa_from && aa_from.trim()) {
            start = aa_from.trim();
            if (!aa_time_from || !aa_time_from.trim()) {
                aa_time_from = '12:00 AM';
            }
        }
        if ( aa_schedule_is_days_selected=="true" && aa_selected_days.length > 0) {
            var str_selected_days = aa_selected_days.map(d => `"${days[d]}"`).join(',');
            start = '['+ str_selected_days.toString() + ']';
            if(timeToInt(aa_time_from) > timeToInt(aa_time_to)) {
                var str_selected_days_new = aa_selected_days.map(d => (d==7) ? `"${days[1]}"` : `"${days[++d]}"`).join(',');
                end = '['+ str_selected_days_new.toString() + ']';
            } else {
                end = '['+ str_selected_days.toString() + ']';
            }
        }
        if (aa_time_from && aa_time_from.trim()) {
                start = start ? start + ' | ' + aa_time_from.trim() : 'EveryDay | ' + aa_time_from.trim();
        }
        if (start) {
            automatedAction.start = start;
        } else {
            automatedAction.start = null;
        }
        if (aa_to && aa_to.trim()) {
            end = aa_to.trim();
            if (!aa_time_to || !aa_time_to.trim()) {
                aa_time_to = '12:00 AM';
            }
        }
        if (aa_time_to && aa_time_to.trim()) {
                end = end ? end + ' | ' + aa_time_to.trim() : start.includes('EveryDay') ? 'EveryDay | ' + aa_time_to.trim() : null;
        }
        if (end) {
            automatedAction.end = end;
        } else {
            automatedAction.end = null;
        }

        $.post("ajax.php", { command: "setAutomatedAction", module: "iotserver", automated_action: automatedAction }, function (data) {
            if (data.status) {
                $('#setiotautomatedaction').modal('hide');
            } else {
                alert('Failed to Save Automated Action Details: ' + data.message);
            }
        });
    });

    $(document).on("click", 'a[id^="rsilink"]', function () {
        $remoteImportButton.attr("disabled", false);
        $remoteImportButton.html(_("Import Users"))
    });

    $(document).on("click", 'a[id^="pclink"]', function () {
        $installProxy.attr("disabled", false);
    });

    $(document).on("click", 'a[id^="ssllink"]', function () {
        $installSSl.attr("disabled", false);
    });

    $(document).on("click", 'a[id^="loglink"]', function () {
        $logRefresh.attr("disabled", false);
        $.post("ajax.php", { command: "refreshLogs", module: "iotserver" }, function (data) {
            $("#logarea").val(data.message);
        })
    });

    //Making Chart Modal work
    $(document).on("click", 'a[id^="chartmlink"]', function () {
        var chartuid = $(this).data('chartuid');
        var event_type = $(this).data('chartevent');
        var name = $(this).data('chartname');
        var type = $(this).data('charttype');
        console.log(chartuid);
        $("#chartuid").val(chartuid);
        var myChart = echarts.init(document.getElementById('chartMain'));
        var myChart2 = echarts.init(document.getElementById('chartMain2'));
        $.post("ajax.php", { command: "getObjectEvents", module: "iotserver", event: event_type, object: chartuid }, function (data) {
            if (data.status) {
                var d = []

                for (var i = 0; i < data.times.length; i++) {
                    d[i] = [data.times[i], data.values[i]]
                }
                var option = {
                    title: {
                        textAlign: 'left',
                        text: name + ' ' + type + ' ' + event_type.replace('-update', '') + ' Chart'
                    },
                    tooltip: {},
                    xAxis: {
                        name: 'Date',
                        min: 'dataMin',
                        max: 'dataMax',
                        nameLocation: 'end',
                        axisLabel: {
                            rotate: 0,
                        },
                        type: 'time',
                        display: true,
                        bounds: 'ticks',
                    },
                    yAxis: {
                        name: event_type.replace('-update', ''),
                        nameLocation: 'center',
                        type: data.data_type,
                    },
                    series: [{
                        name: event_type.replace('-update', ''),
                        type: 'line',
                        data: d
                    }]
                };
                // use configuration item and data specified to show chart
                myChart.setOption(option);

                var d2 = []

                for (var i = 0; i < data.times.length; i++)
                    d2[i] = [data.times[i], data.values[i]]
                var hours = ['12a', '1a', '2a', '3a', '4a', '5a', '6a',
                    '7a', '8a', '9a', '10a', '11a',
                    '12p', '1p', '2p', '3p', '4p', '5p',
                    '6p', '7p', '8p', '9p', '10p', '11p'];
                var days = ['Saturday', 'Friday', 'Thursday',
                    'Wednesday', 'Tuesday', 'Monday', 'Sunday'].reverse(),
                    h = {},
                    _min = 1000,
                    _max = 0;
                var data2 = [];
                for (var i = 0; i < d2.length; i++) {
                    var _date = new Date(d2[i][0]),
                        key = _date.getDay() + '-' + _date.getHours();
                    if (!h[key])
                        h[key] = 0
                    h[key] += d2[i][1]
                }
                for (let k in h) {
                    if (h[k] > _max)
                        _max = h[k]
                    if (h[k] < _min)
                        _min = h[k]
                }
                for (var i = 0; i < 7; i++) {
                    for (var j = 0; j < 24; j++) {
                        data2.push([j, i, h[i + '-' + j] ? h[i + '-' + j] : "-"])
                    }
                }

                option = {
                    tooltip: {
                        position: 'top'
                    },
                    animation: true,
                    grid: {
                        height: '50%',
                        y: '10%'
                    },
                    xAxis: {
                        type: 'category',
                        data: hours,
                        splitArea: {
                            show: true
                        }
                    },
                    yAxis: {
                        type: 'category',
                        data: days,
                        splitArea: {
                            show: true
                        }
                    },
                    visualMap: {
                        min: _min,
                        max: _max,
                        calculable: true,
                        orient: 'horizontal',
                        left: 'center',
                        bottom: '15%'
                    },
                    series: [{
                        name: 'Punch Card',
                        type: 'heatmap',
                        data: data2,
                        label: {
                            normal: {
                                show: true
                            }
                        },
                        itemStyle: {
                            emphasis: {
                                shadowBlur: 10,
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        }
                    }]
                };
                myChart2.setOption(option);
            }
        })
    });


    $remoteImportButton.on('click', function () {
        var $this = $(this);
        $this.html(_('Importing'));
        $this.attr("disabled", true);
        var host = $importHostField.val();
        var user = $importUserField.val();
        var pwd = $importPWDField.val();
        var perc = 0;

        $(".progress-bar").css("width", "");
        $(".progress").removeClass("hidden");
        $(".progress-bar").addClass("active");

        var timer = setInterval(function () {
            perc += 3;
            $(".progress-bar").css("width", perc + "%");
        }, 5000);

        $.post("ajax.php", { command: "remote-import", module: "iotserver", host: host, user: user, pwd: pwd }, function (data) {
            clearInterval(timer);
            if (data.status) {
                $(".progress-bar").css("width", "100%");
                $(".progress-bar").removeClass("active");
                $this.html(_('Imported'));
                $this.attr("disabled", true);
            } else {
                $(".progress-bar").css("width", "0%");
                $(".progress-bar").removeClass("active");
                $this.html("Import Users");
                $this.attr("disabled", false);
            }
        })
    });

    $logRefresh.on('click', function () {
        var $this = $(this);
        $logRefresh.attr("disabled", true);
        $.post("ajax.php", { command: "refreshLogs", module: "iotserver" }, function (data) {
            $("#logarea").val(data.message);
            $logRefresh.attr("disabled", false);
        })
    });

    $resetButton.on('click', function () {
        var $this = $(this);
        if (confirm(_("This will reset and disconnect all SmartOffice users. Are you sure?"))) {
            var oldText = $this.find("span").text();
            $this.find("span").text(_("Resetting..."));
            $this.prop("disabled", true);
            $.post("ajax.php", { command: "reset", module: "iotserver" }, function (data) {
                if (data.status) {
                    $table.bootstrapTable('refresh');
                    window.location.reload();
                }
                $this.find("span").text(oldText);
                $this.prop("disabled", false);
            });
        }
    });

    $installSSl.on('click', function () {
        var $this = $(this);
        var action = $("#domain-action-selector option:selected").text();
        $ssllink.attr("disabled", true);
        $pclink.attr("disabled", true);
        var perc = 0;
        $('#domainaction').modal('hide');
        var cfmMessage = _("This will disconnect all SmartOffice users and reset the SmartOffice service. Are you sure?");
        if (action == "remove certificates") {
            cfmMessage = _("This will disconnect all SmartOffice users and stop the SmartOffice service. Are you sure?");
        }
        if (confirm(cfmMessage)) {
            $(".progress-bar").css("width", "");
            $(".progress").removeClass("hidden");
            $(".progress-bar").addClass("active");
            var timer = setInterval(function () {
                perc += 2;
                $(".progress-bar").css("width", perc + "%");
            }, 5000);
            $.post("ajax.php", { command: "generateSSL", module: "iotserver", action: action }, function (data) {
                clearInterval(timer);
                $(".progress-bar").css("width", "100%");
                $(".progress-bar").removeClass("active");
                $pclink.attr("disabled", false);
                $ssllink.attr("disabled", false);
                $('#domainaction').modal('hide');
                window.location.reload();
            }).always(function () {
                clearInterval(timer);
                $(".progress-bar").removeClass("active");
                $pclink.attr("disabled", false);
                $ssllink.attr("disabled", false);
                $('#domainaction').modal('hide');
            });
        } else {
            $pclink.attr("disabled", false);
            $ssllink.attr("disabled", false);
        }
    });

    $installProxy.on('click', function () {
        var $this = $(this);
        var action = $("#connectcloud-action-selector option:selected").text()
        $pclink.attr("disabled", true);
        $ssllink.attr("disabled", true);

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

                $.post("ajax.php", { command: "getProxyInstallProgress", module: "iotserver" }, function (data) {
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
                        $ssllink.attr("disabled", false);
                        $(".progress-bar").removeClass("active");
                        $(".progress-bar").addClass("hidden");
                    }
                });
            }, 5000);

            $.post("ajax.php", { command: "installProxyClient", module: "iotserver" }, function (data) {
                if (!data.status) {
                    $this.prop("disabled", false);
                    clearInterval(timer);
                    $(".progress-bar").removeClass("active");
                    $(".progress-bar").addClass("hidden");
                }
                $('#cloudconnect').modal('hide');
            });
        } else {
            $.post("ajax.php", { command: "processProxyClientAction", module: "iotserver", action: action }, function (data) {
                $pclink.attr("disabled", false);
                $ssllink.attr("disabled", false);
                $('#cloudconnect').modal('hide');
            }).always(function () {
                $pclink.attr("disabled", false);
                $ssllink.attr("disabled", false);
                $('#cloudconnect').modal('hide');
                window.location.reload();
            });

        }
    });
    $auditSelector.on('change', function () {
        var $this = $(this);
        var tabObj = tabNameToObjMap['audit-logs'];
        var dateFrom  =  $('#auditlogdatefrom').val();
        var dateTo =  $('#auditlogdateto').val();
        if ($("#audit-selector option:selected").text() == 'all') {

            if (!tabObj.timer) {
                tabObj.timer = setInterval(function () {
                    tabObj.tab.bootstrapTable('refresh', { silent: true, query: { pageNumber: tabObj.tab.bootstrapTable('getOptions').pageNumber, pageSize: tabObj.tab.bootstrapTable('getOptions').pageSize } });
                }, 15000);
                tabNameToObjMap['audit-logs'] = tabObj;
                tabObj.tab.bootstrapTable('refresh', { silent: true, query: { pageNumber: tabObj.tab.bootstrapTable('getOptions').pageNumber, pageSize: tabObj.tab.bootstrapTable('getOptions').pageSize } });
            }

        } else {
            if (tabObj.timer) {
                clearInterval(tabObj.timer)
                tabObj.timer = null;
                tabNameToObjMap['audit-logs'] = tabObj;
            }
            $.post("ajax.php", { command: "auditlogs", module: "iotserver", auditloggroupfilter: $this.val(), auditlogdatefrom: dateFrom, auditlogdateto: dateTo }, function (data) {
                if (data.status) {
                    tabObj.tab.bootstrapTable('load', data.data);
                }
            })
        }
    });

    $loglevelSelector.on('change', function () {
        var $this = $(this);
        var level = $("#loglevel-selector option:selected").text();

        $.post("ajax.php", { command: "troubleshootOperation", module: "iotserver", type: "set_loglevel", value: level }, function (data) {

        })

    });

    let post_request = (action, data) => {
        let baseUrl = "/admin/ajax.php?module=iotserver&command=troubleshootOperation&type=" + action;
        console.log(data);
        return new Promise((resolve, reject) => {
            $.ajax({
                url: baseUrl,
                type: "POST",
                data: data,
                success: (result) => {
                    result = typeof result == "string" ? JSON.parse(result) : result;
                    if (result.status) resolve(result);
                    else {
                        $(".dynamic", $troubleshootingModal).hide();
                        $(".modal-body.server-error p", $troubleshootingModal).html(result.message);
                        $(".server-error", $troubleshootingModal).show();
                        reject(result);
                    };
                },
                error: (err) => {
                    reject(err)
                }
            })
        });
    },
        check_status = (uuid) => {
            let baseUrl = "/admin/ajax.php?module=iotserver&command=troubleshootOperation&type=check_fw_process";
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: baseUrl,
                    type: "POST",
                    data: { data: uuid },
                    success: (res) => {
                        if (res.status)
                            resolve(res);
                        else {
                            $(".dynamic", $troubleshootingModal).hide();
                            $(".modal-body.server-error p", $troubleshootingModal).html(res.message);
                            $(".server-error", $troubleshootingModal).show();
                            $troubleshootingModal.modal("show");
                            reject(res);
                        }
                    },
                    error: (err) => {
                        reject(err);
                    }
                });
            });
        },
        init_process = () => {
            $progressBar.css("width", "2%");
            $progress.removeClass("hidden");
            $progressBar.addClass("active");
            $grayout_buttons = $(".update-firmware");
            $grayout_buttons.attr("onclick", "");
            $grayout_buttons.css({ color: "#9ca1a5" });
        },
        finish_process = (uuid) => {
            let $status_cell = $('[data-id="' + uuid + '"]'),
                $row = $status_cell.parent().parent(),
                current_version = $(".current_version", $row).text(),
                available_version = $(".available_version", $row).text(),
                previous_version = $(".previous_version", $row).text();

            hide_progress_bar();
            if (available_version != "-" && available_version != current_version) {
                $status_cell.html(NEW_VERSION_AVAILABLE);
            } else if (available_version != "-" && available_version == current_version) {
                $status_cell.html(UP_TO_DATE);
            } else if (available_version == "-") {
                $status_cell.html(REFRES_TABLE);
            }
            $(".update-firmware").each((index, elem) => {
                let $this = $(elem),
                    action = $this.attr("data-action"),
                    uuid = $this.attr("data-uuid");
                $this.attr("onclick", "return firmware('" + action + "','" + uuid + "')");
                $this.attr("style", "");
                if (action == "install" && available_version != '-' && current_version != available_version) {
                    $this.removeClass("hide");
                } else if (action == "install" && available_version != '-' && current_version == available_version) {
                    $this.addClass("hide");
                }
                else if (action == "downgrade" && current_version != previous_version && previous_version.match(/([0-9]+)-([a-z0-9]+)$/)) {
                    $this.removeClass("hide")
                } else if (action == "downgrade" && previous_version != "-") {
                    $this.addClass("hide");
                }
            });
        },
        hide_progress_bar = () => {
            $progressBar.css("width", "");
            $progress.removeClass("active");
            $progress.addClass("hidden");
            $info = $("#firmware-update-message");
            $info.parent().hide();
        },
        update_progress_bar = (value) => {
            if (value && value.match(/[0-9]+%/))
                $progressBar.css("width", value);
        },
        update_in_row_info = (res) => {
            let $status_cell = $('[data-id="' + res.uuid + '"]');
            if ($status_cell.length) {
                let status = res.state == "restarting" ? res.state : res.install_process,
                    gwstatus = res.state == "ready" ? "online" : "offline",
                    cell_classes = [
                        ".previous_version",
                        ".current_version",
                        ".available_version"
                    ],
                    cell_values = [
                        res.previous_version,
                        res.current_version,
                        res.available_version
                    ],
                    $row = $status_cell.parent().parent(),
                    current_status_value = $(".gateway_status", $row).html();

                $status_cell.html(!status ? '...' : status);
                $(".gateway_status", $row).html(current_status_value.replace(/online|offline/, gwstatus));

                cell_classes.forEach((_class, i) => {
                    $(_class, $row).html(cell_values[i]);
                })
            }

            else {
                console.log("no status cell found:>", 'data-id="' + uuid.replace(/[^-]+-/, "") + '"');
            }
        },
        status_ticker = undefined,
        check_status_progress = function (res) {
            if (!res.status) {
                finish_process(res.uuid);
                return;
            }
            if (!res.install_process && !res.action) {
                update_progress_bar("100%");
                setTimeout(() => {
                    update_in_row_info(res);
                    finish_process(res.uuid);
                }, 2000);
            } else if (res.details && (res.details.match(/SSLHandshakeException/) || (res.details.match('unable to find valid certification path to requested target')) ))  {
                $(".dynamic", $troubleshootingModal).hide();
                $(".certificate", $troubleshootingModal).show();
                $troubleshootingModal.modal("show");
                finish_process(res.uuid);
            } else if (res.status == "cancelled")
                finish_process(res.uuid);
            else if (res.install_process != null || res.action != null) {
                update_in_row_info(res);
                update_progress_bar(res.details);
                if (status_ticker != undefined) {
                    clearTimeout(status_ticker);
                    status_ticker = undefined;
                }
                status_ticker = setTimeout(() => {
                    check_status(res.uuid).then(check_status_progress).catch(err => {
                        //window.location.reload();
                        console.error(err);
                    });
                }, 10000);
            }
            else {
                console.log("Non of the previous statemets worked");
            }
        };
    $updateCertificateButton.on('click', function () {
        let uuid = $(this).data('uuid');
        $(this).hide();
        $(this).next().show();
        post_request('force_update_gw_certificate', { data: uuid })
            .then((res) => {
                // wait a bit for the gateway to update its certificate
                setTimeout(() => {
                    $troubleshootingModal.modal("hide");
                    $(this).show();
                }, 60000);
            }).catch(err => {
                $(this).show();
            });
    });

    $installFirmwareButton.on("click", function () {
        let uuid = $(this).data('uuid'),
            $this = $(this),
            $info = $("#firmware-update-message");
        $(this).hide();
        $(this).next().show();
        init_process();
        $info.html(uuid).parent().show();
        post_request('install_firmware', { data: uuid })
            .then((res) => {
                $troubleshootingModal.modal("hide");
                $(this).show();
                check_status(uuid)
                    .then(check_status_progress)
                    .catch(err => { finish_process(uuid); console.log(err) });
            }).catch(err => {
                if (err.message && err.message.match(/installing/))
                    check_status(uuid)
                        .then(check_status_progress)
                        .catch(err => { finish_process(uuid); console.log(err) });
                else
                    finish_process(uuid);
                $(this).show();
            });
    });

    $downgradeFirmwareButton.on("click", function () {
        let uuid = $(this).data("uuid"),
            $this = $(this),
            $info = $("#firmware-update-message");
        $(this).hide();
        $(this).next().show();
        init_process();
        $info.html(uuid).parent().show();
        post_request('downgrade_firmware', { data: uuid })
            .then((res) => {
                $troubleshootingModal.modal("hide");
                $(this).show();
                check_status(uuid)
                    .then(check_status_progress)
                    .catch(err => { finish_process(uuid); console.log(err) });
            }).catch(err => {
                console.log(err);
                if (err.message && err.message.match(/installing/))
                    check_status(uuid)
                        .then(check_status_progress)
                        .catch(err => { finish_process(uuid); console.log(err) });
                else
                    finish_process(uuid);
                $(this).show();
            });
    });

    return {
        refresh: function (uuid, status) {
            let $info = $("#firmware-update-message");
            init_process()
            $info.html(uuid).parent().show();
            if (status == "restarting") {
                update_progress_bar("100%");
            }
            check_status(uuid)
                .then(check_status_progress)
                .catch(err => { finish_process(uuid); console.log(err); })
        }
    }
})(jQuery, window, document);

var firmware = function (action, uuid) {
    let $troubleshootingModal = $('#troubleshooting-modal'),
        $installFirmwareButton = $("#install-firmware-button"),
        $downgradeFirmwareButton = $("#downgrade-firmware-button"),
        $updateCertificateButton = $("#update-certificate-button");

    $(".dynamic", $troubleshootingModal).hide();
    $("." + action + "-confirm", $troubleshootingModal).show();
    $troubleshootingModal.modal("show");
    if (action == "install") {
        $installFirmwareButton.data("uuid", uuid);
        $updateCertificateButton.data("uuid", uuid);
    }
    else if (action == "downgrade") {
        $downgradeFirmwareButton.data("uuid", uuid);
    }
    return false;
}

function userActions(value, row, index) {
    var html = '<a href="?display=userman&action=showuser&user=' + row.id + '#usermanhookiotserver"><i class="fa fa-edit"></i></a>';
    html += '&nbsp;&nbsp;<a href="?display=smartoffice&action=remove&id=' + row.id + '" class="delAction"><i class="fa fa-trash"></i></a>'
    return html;
}
function guestListActions (value, row, index) {
    html = '<a data-toggle="modal" data-guestuid="' + row.id + '" data-tmpguestdata="' + row.profile_data + '" data-target="#modalguestaccess" id="guestaccesssmlink' + row.id + '" class="clickable"><i class="fa fa-edit"></i></a>';
    html += '&nbsp;<a href="?display=smartoffice&action=removeGuest&id=' + row.id + '#guest-access" class="delAction"><i class="fa fa-trash"></i></a>'
    return html;
}
function accessProfileActions(value, row, index) {
    html = '<a data-toggle="modal" data-accessuid="' + row.id + '" data-tmpdata="' + row.profile_data + '" data-target="#setiotaccess" id="accesssmlink' + row.id + '" class="clickable"><i class="fa fa-edit"></i></a>';
    html += '&nbsp;<a href="?display=smartoffice&action=removeAccess&id=' + row.id + '#access-profiles" class="delAction"><i class="fa fa-trash"></i></a>'
    return html;
}
function automatedActions(value, row, index) {
    html = '<a data-toggle="modal" data-automatedactionuid="' + row.id + '" data-tmpautomationdata="' + row.automated_action_data + '" data-target="#setiotautomatedaction" id="automatedactionmlink' + row.id + '" class="clickable"><i class="fa fa-edit"></i></a>';
    html += '&nbsp;<a href="?display=smartoffice&action=removeAutomatedAction&id=' + row.id + '#automated-action" class="delAction"><i class="fa fa-trash"></i></a>'
    return html;
}
function eventActions(value, row, index) {
    var html = '<a data-toggle="modal" data-chartuid="' + row.event_object_uuid + '" data-chartevent="' + row.event_type + '" data-chartname="' + row.event_object_name + '" data-charttype="' + row.event_object_type + '" data-target="#showeventchart" id="chartmlink' + row.id + '" class="clickable"><i class="fa fa-area-chart"></i></a>';
    return html;
}

function gwActions(value, row, index) {
    var html = '',
        showupdate = row.available != undefined && row.available != '-' && row.available != row.version && row.version.match(/[^\.]+\.[^\.]+\.[^\-]+-[^\-]+-\w+$/) != null,
        showrevert = row.previous_version != undefined && row.previous_version != '-' && row.version.match(/[^\.]+\.[^\.]+\.[^\-]+-[^\-]+-\w+$/) != null && row.previous_version.match(/[^\.]+\.[^\.]+\.[^\-]+-[^\-]+-\w+$/) != null;
    if (row.debug == 'on') {
        html += '<a href="?display=smartoffice&action=setgwdebug&id=' + row.uuid + '&value=off"><i class="fa fa-toggle-on" aria-hidden="true" title="Disable gateway Debug mode"></i></a>';
    } else {
        html += '<a href="?display=smartoffice&action=setgwdebug&id=' + row.uuid + '&value=on"><i class="fa fa-toggle-off" aria-hidden="true" title="Enable gateway Debug mode"></i></a>';
    }
    html += '&nbsp;&nbsp;<a href="#" class="update-firmware ' + (showupdate ? '' : 'hide') + '" data-action="install" data-uuid="' + row.uuid + '" onclick="return firmware(\'install\',\'' + row.uuid + '\')" title="Download and Install the new firmware"><i class="fa fa-level-up" aria-hidden="true" title="Upgrade to the newest version"></i></a>';
    html += '&nbsp;&nbsp;<a href="#" class="update-firmware ' + (showrevert ? '' : 'hide') + '" data-action="downgrade" data-uuid="' + row.uuid + '" onclick="return firmware(\'downgrade\',\'' + row.uuid + '\')" title="Go back to the previous version"><i class="fa fa-exchange" aria-hidden="true" title="Go back to the previous version"></i></a>';
    return html;
}

function gwFormatStatusCell(value, row, index) {
    if (["pending", "downloading", "installing", "applaying"].includes(row.fwstatus)) {
        setTimeout(() => {
            scope.refresh(row.uuid, row.fwstatus);
        }, 3000);

    }
    if (!row.fwstatus) {
        row.fwstatus = row.version == row.available ? UP_TO_DATE : NEW_VERSION_AVAILABLE;
        row.fwstatus = !row.available ? REFRES_TABLE : row.fwstatus;
    }
    row.fwstatus = row.version != row.available && row.version.match(/[^\.]+\.[^\.]+\.[^\-]+-[^\-]+-\w+$/) == null ? NEW_SANGOMA_VERSION_AVAILABLE : row.fwstatus;
    return '<span data-id="' + row.uuid + '">' + row.fwstatus + '</span>';
}
function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
};

function saveGuest(guestprof,guestModal){
    $.post("ajax.php", { command: "setGuestProfile", module: "iotserver", guestprofile: guestprof }, function (data) {
        if (data.status) {
            guestModal.modal('hide');
        } else {
            alert('Failed to Save Guest Details: ' + data.message);
        }
    });
}
function auditLogGueryParams(params){
    $('#audit-log-refresh').attr('disabled', true);
    var formData = $("#auditLogExport").serialize();
    $.each(formData.split('&'), function(k,v) {
        var parts = v.split('=');
        params[parts[0]] = parts[1];
    });
    return params;
}

function auditLogsResponseHandler(res){
    $('#audit-log-refresh').attr('disabled', false);
    return res;
}