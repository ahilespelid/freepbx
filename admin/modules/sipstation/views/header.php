<form autocomplete="off" name="editSip" action="" method="post">
<input type="hidden" name="action" id="action" value="edit">
	<?php if ($action == 'remove_all') { ?>
	<table>
	  <tr>
	    <td colspan="2">
	      <br /><br /><br />
	      <div class="sipstation-errors">
	        <p><?php echo _("KEYS AND TRUNKS REMOVED!") ?></p>
	        <ul>
				<?php echo _("Your SIPStation trunks and key have been removed from your system, make sure to Apply Configuration Changes for this to take effect"); ?>
	        </ul>
	      </div>
	    </td>
	  </tr>
	</table>
	<?php } ?>
