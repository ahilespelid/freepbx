<?php /*$Id*/
if (!defined('FREEPBX_IS_AUTH')) { die('No direct script access allowed'); }
/* 
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of version 2 the GNU General Public
 * License as published by the Free Software Foundation.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 */
?>

<?php 
    ob_start () ;
    phpinfo () ;
    $pinfo = ob_get_contents () ;
    ob_end_clean () ;
?>

<div class="container-fluid">
	<div class = "display full-border">
		<div class="row">
			<div class="col-sm-12">
				<div class="fpbx-container">
					<div class="display full-border">
						<?php echo $pinfo ?>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
<script type="text/javascript">
$(document).ready(function(){
	$("table").each(function(){
        $(this).addClass('table');
        $(this).addClass('table-striped');
        $(this).addClass('table-bordered');
    });
    $("hr").each(function(){
    	$(this).addClass('hidden');
    });
});
</script>