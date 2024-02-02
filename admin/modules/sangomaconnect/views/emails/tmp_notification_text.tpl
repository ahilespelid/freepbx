<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>${brand} Notifications</title>

<body>
  <div style="width: 600px; margin: auto; padding: 24px 32px; background-color:rgb(245, 245, 245);  ">

    <table style="margin-bottom: 24px;" width="100%">
      <tr width="100%" border="0">
        <td><img src="https://sr.iot.sangoma.tech/images/smartoffice-logo.png" alt="SmartOffice" style="width: 260px"></td>
        <td valign="center" style="text-align: right;">
          <img src="https://sr.iot.sangoma.tech/images/${notification}.png" alt="NotificationLogo" style="width: 36px;">
        </td>
      </tr>
    </table>

    <table width="600" align="center" cellpadding="0" cellspacing="0">
      <tr>
        <td colspan="2" style="border-left:10px solid #024987;" align="center" valign="top" width="100%">
          <table style="background-color:rgb(255, 255, 255); border-top:1px solid rgb(233, 233, 233); border-bottom:1px solid rgb(233, 233, 233); border-right:1px solid rgb(233, 233, 233); padding:5px 10px" border="0" cellpadding="10" cellspacing="0" width="100%">
            <tr>
              <td width="85%">
                  <p style="font-size: 16px; font-weight:bold; color:#024987; font-family:Arial, Helvetica; line-height: 1.2; margin: 12px 0 0;">Hello,</p>
                  <p style="font-size: 16px; color:rgb(0, 0, 0); font-family:Arial, Helvetica; line-height: 1.2; margin: 4px 0 0;">${event} happened on your ${brand} product located at ${location}</p>
                  <p style="font-size: 16px; color:rgb(0, 0, 0); font-family:Arial, Helvetica; line-height: 1.2; margin: 20px 0 12px;">Here are the event details:</p>
                  <table align="center"  width="100%" border="0">
										<tr style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: white; background-color: #024987;">
											<th style="padding: 8px; border-top-left-radius: 6px;">Name</th>
											<th style="padding: 8px;">Type</th>
											<th style="padding: 8px;">Data</th>
											<th style="padding: 8px; border-top-right-radius: 6px;">Timestamp</th>
										</tr>
										<tr style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: black; background-color: rgb(245, 245, 245);">
											<td style="padding: 8px;">${event_name}</td>
											<td style="padding: 8px;">${event_type}</td>
											<td style="padding: 8px;">${event_data}</td>
											<td style="padding: 8px;">${event_timestamp}</td>
										</tr>
									</table>


                </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr width="100%" border="0">
        <td>
          <p style="font-size:14px; font-family:Arial, Helvetica; line-height:20px; color:rgb(128, 128, 128);">
            <br>
            Thanks,
            <br>Your ${brand} Administration Team
          </p>
        </td>
        <td valign="center" style="text-align: right;">
          <img src="https://sr.iot.sangoma.tech/images/sangoma-logo.png" alt="Sangoma Inc." style="width: 160px;">
        </td>
      </tr>
    </table>
  </div>
</body>

</html>
