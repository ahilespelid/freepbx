<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>Mentions %receiver_name%</title>
<style>
a.hightlight:link, a.hightlight:visited {
  background-color: #0275d8;
  color: white;
  padding: 14px 25px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
}

a.hightlight:hover, a.hightlight:active {
  background-color: red;
}
</style>

<body>
  <div style="width: 600px; margin: auto; padding: 24px 32px; background-color:rgb(245, 245, 245);  ">

    <div style="margin-bottom: 24px;">
      <img src="https://images.apps.sangoma.com/images/smartoffice/smartoffice-logo.png" alt="SmartOffice" style="width: 260px">
    </div>

    <table width="600" align="center" cellpadding="0" cellspacing="0">
      <tr>
        <td colspan="2" style="border-left:10px solid #024987;" align="center" valign="top" width="100%">
          <table style="background-color:rgb(255, 255, 255); border-top:1px solid rgb(233, 233, 233); border-bottom:1px solid rgb(233, 233, 233); border-right:1px solid rgb(233, 233, 233); padding:5px 10px" border="0" cellpadding="10" cellspacing="0" width="100%">
            <tr>
              <td width="85%">
                  <p style="font-size: 16px; font-weight:bold; color:#024987; font-family:Arial, Helvetica; line-height: 1.2; margin: 12px 0 0;">Hello ${fname},</p>
                  <p style="font-size: 16px; color:rgb(0, 0, 0); font-family:Arial, Helvetica; line-height: 1.2; margin: 4px 0 0;">Welcome to your ${brand}!</p>

                  <div style="margin: 28px 0;">
                    <p style="font-size: 18px; font-weight: bold; color:#024987; font-family:Arial, Helvetica; line-height: 1.2; margin: 12px 0;">1. Install the ${brand} mobile app</p>
                    <a href="https://apps.apple.com/us/app/sangoma-smart-office/id1472400508"><img src="https://images.apps.sangoma.com/images/sangoma/appstore_logo.png" alt="appstore"></a>
                      <a href="https://play.google.com/store/apps/details?id=com.zuluiot"><img src="https://images.apps.sangoma.com/images/sangoma/playstore_logo.png" alt="playstore"></a>
                  </div>

                  <div style="margin: 28px 0;">
                    <p style="font-size: 18px; font-weight: bold; color:#024987; font-family:Arial, Helvetica; line-height: 1.2; margin: 12px 0;">2. Login to ${brand} by clicking the login link, after you install the app</p>
                    <span><a data-msys-clicktrack="0" href="https://${domain_base}/${email}/${orgid}/${password}" class="hightlight" style="font-size: 14px; color:#FFF; font-family:Arial, Helvetica; background-color: #0275d8;color: white;padding: 12px 20px;text-align: center;text-decoration: none; display: inline-block; border-radius: 6px;" target="_blank">Login link</a>
                  </div>
                  <p style="font-size:14px; font-family:Arial, Helvetica; line-height:20px; margin-top:30px; color:rgb(128, 128, 128);">
                    Note: Do not click on the login link from your desktop as this will invalidate the link. If the login link does not work, you can always get another login link from the ${brand} mobile app by requesting the magic link, then open the new email on your mobile phone and click the login link.
                  </p>
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
          <img src="https://images.apps.sangoma.com/images/sangoma/sangoma-logo.png" alt="Sangoma Inc." style="width: 160px;">
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
