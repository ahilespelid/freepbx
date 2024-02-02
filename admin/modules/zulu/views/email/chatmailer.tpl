<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>Mentions %receiver_name%</title>

<body>
	<table style="background-color:rgb(245, 245, 245); padding:25px 30px" width="600" align="center" cellpadding="0" cellspacing="0">
		<tr>
			<td colspan="2" style="border-left:10px solid rgb(17, 114, 186);" align="center" valign="top" width="100%">
				<table style="background-color:rgb(255, 255, 255); border-top:1px solid rgb(233, 233, 233); border-bottom:1px solid rgb(233, 233, 233); border-right:1px solid rgb(233, 233, 233); padding:5px 10px" border="0" cellpadding="10" cellspacing="0" width="100%">
					<tr>
						<td width="85%">
								<p style="font-size:19.87px; padding-top:5px; line-height:26px; margin:0px; color:rgb(128, 128, 128); font-family:Arial, Helvetica;">
									<span style="font-weight:bold; color:rgb(0, 0, 0); font-family:Arial, Helvetica;">%sender_name%</span> %mentioned_you%<br><span style="font-size:14px; font-family:Arial, Helvetica;">%date_now%</span>
								</p>
							</td>
					</tr>
					<tr>
						<td colspan="2" width="100%">
							<p style="font-size:19.87px; margin:0px 0px 10px 0px; padding-left:10px; font-family:Arial, Helvetica;">%message%</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
		<tr width="100%" border="0">
			<td>
				<p style="font-size:14px; font-family:Arial, Helvetica; line-height:20px; margin-top:30px; color:rgb(128, 128, 128);">
					%message_intended_for%  <a href="%receiver_email%" style="color:rgb(17, 114, 186); text-decoration:none;">%receiver_name%</a><br>
					%if_it_was_error% <a href="mailto:%admin_email%">%admin_email%</a>
				</p>
				<p style="font-size:14px; font-family:Arial, Helvetica; line-height:20px; color:rgb(128, 128, 128);">
					<span style="font-family:Arial, Helvetica">%too_many_emails%</span><br>
					%change_your_notification%
				</p>
			</td>
		</tr>
	</table>
</body>
</html>
