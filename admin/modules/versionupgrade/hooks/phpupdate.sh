#!/bin/bash
#####################################################################################
# Copyright 2021 Sangoma Technologies.  This upgrade script and all concepts are property of
# Sangoma Technologies and are not to be copied for other use.  This upgrade script is free
# to use for upgrading FreePBX Distro systems only but carries no guarnatee on performance
# and is used at your own risk.  This script carries NO WARRANTY.
#####################################################################################

#####################################################################################
# 						FreePBX 16 Upgrade	       #
#####################################################################################
quiet=0
if [ "$1" == "--quiet" ]; then
	quiet=1
fi 

txn_id=0
if [ "$2" ]; then
	txn_id="$2"
fi 


if [ $quiet == 0 ]; then
	echo "FreePBX 16.0 is right now available only for BETA testing purpose."
	echo "Please do not try to upgrade your production pbx to 16.0 release."
	echo "As a part of 16.0 upgrade process, we will update PHP version to PHP 7.4 and there is no rollback."
	echo 'This is highly recommend to try upgrade to 16.0 only on testing system.'
	echo -n "Do you really want to try (yes/no)? "
	read -r
	if [ "$REPLY" == "yes" ]; then
		echo "We are going to start upgrading your system to 16.0 release"
	else
		echo "Exiting upgrade process.."
		exit;
	fi
fi

######################### Enable logging  ####################################################
asterisk=`/usr/sbin/asterisk -rx "core show version"`
kernel=`uname -a`
version=`cat /etc/schmooze/pbx-version`
brand=`cat /etc/schmooze/pbx-brand`
host=`hostname`
frameworkver=`/usr/sbin/fwconsole ma list|grep framework | awk '{ print $4}'`
pidfile='/var/run/asterisk/16upgrade.pid'
pbxupgrader=`/usr/sbin/fwconsole ma list|grep versionupgrade | awk '{print $4}'`


mkdir -p '/var/log/pbx/'
log='/var/log/pbx/freepbx16-upgrade.log'
echo "" > $log

if [ -f "$pidfile" ]; then
   echo "`date` PBX 16 upgrade process is already going on, hence not starting new process"
   echo "`date` PBX 16 upgrade process is already going on, hence not starting new process" >> "$log"
   echo "`date` If PBX 16 upgrade process is NOT running then delete $pidfile file and try again."
   echo "`date` If PBX 16 upgrade process is NOT running then delete $pidfile file and try again." >> "$log"
   exit
fi


echo "`date` Starting System update process required for FreePBX 16 using versionupgrade[$pbxupgrader]" >> "$log"
touch $pidfile

echo "`date` Ensuring permissions are good.." >> $log
/usr/sbin/fwconsole chown >> $log

######################### Taking the backup ####################################################
echo "`date` Taking the backup of astDB" >> "$log"
`cp /var/lib/asterisk/astdb.sqlite3 /var/log/pbx/`
echo "`date` Taking the backup of /etc/asterisk " >> "$log"
cp -r /etc/asterisk/ /var/log/pbx/

######################### Start a node process on port 8090 ####################################################
AMPWEBROOT=`mysql -uroot -s -N -e "SELECT value FROM asterisk.freepbx_settings WHERE keyword ='AMPWEBROOT'"`
`/usr/bin/node $AMPWEBROOT/admin/modules/versionupgrade/hooks/server.js >/dev/null 2>/dev/null &`

################################################################################################################
#Helpers APIs
function terminate {
	# removing pid file
	rm -rf $pidfile
	exit
}
function isinstalled {
  if yum list installed "$@" >/dev/null 2>&1; then
    true
  else
    false
  fi
}

function updateGqlStatus {
	#  this code is part of the GraphQL API, an update of long running tasks  #
	if [ "$txn_id" != 0 ]; then
		if is16FrameworkInstalled; then 
			`mysql -uroot -s -N -e "UPDATE IGNORE asterisk.api_asynchronous_transaction_history SET event_status='Executed',failure_reason='',process_end_time='$(date +%s)' WHERE txn_id='$txn_id'"`
		else	
			`mysql -uroot -s -N -e "UPDATE IGNORE asterisk.api_asynchronous_transaction_history SET event_status='Failed',failure_reason='Framework 16 is not installed',process_end_time='$(date +%s)' WHERE txn_id='$txn_id'"`
		fi	
	fi
}

function is16FrameworkInstalled {
 	frameworkversion=`/usr/sbin/fwconsole ma list|grep framework | awk '{ print $4}'`
	requiredframeworkversion=16.0.2
	if (( $(echo "$frameworkversion $requiredframeworkversion" | awk '{print ($1 >= $2)}') )); then
		true
	else
		false
	fi	
}

install_php74_pkg() {
        rpm=$1
	yum -y --enablerepo=sng-sng7php74 install $rpm >> $log 2>&1 
	if isinstalled $rpm; then
		echo "`date` $rpm installed successfully...." >> $log 2>&1
	else 
		echo "`date` $rpm failed to install..please install manually from the linux cli using 'yum -y --enablerepo=sng-sng7php74 install $rpm' command." >> $log 
		echo "`date` Failed to install mandatory RPM. Exiting the upgrade process" >> $log	
		exit
        fi
}

remove_package() {
        rpm=$1
	if isinstalled $rpm; then
                #rpm -e --nodeps $rpm > /dev/null 2>&1
		echo "uninstalling $rpm"
                rpm -e --nodeps $rpm >> $log 2>&1
		echo "`date` $rpm uninstalled successfully...." >> $log 
	else 
		echo "$rpm is not installed"
		echo "`date` $rpm is not installed.." >> $log 
        fi
}

#####################################################################################
# Check to make sure this is a FreePBX Distro system before executing
echo "Check to make sure this is a Sangoma Distro system before executing"
if [ -f /etc/schmooze/pbx-version ]; then
		echo "This appears to be a Sangoma Distro system as it has a Distro Version of $version"
		echo "`date` This appears to be a Sangoma Distro system as it has a Distro Version of $version" >> "$log"
else
		echo "This does not appears to be a FreePBX Distro system as it has no Distro Version file"
		updateGqlStatus
		terminate
fi
export PATH="/sbin:/bin:/usr/sbin:/usr/bin:/usr/local/sbin"
#####################################################################################
## Disable modules
/usr/sbin/fwconsole ma disable digiumaddoninstaller
# We need to remove oembranding if its OEM/Brand so that during 16 license activation time oembranding
# will get installed again
/usr/sbin/fwconsole ma remove oembranding
###################################################################################
DEPLOYMENTID=`cat /etc/schmooze/pbxid`
echo "Deactivate the system with deploymentID $DEPLOYMENTID"
echo "`date` Deactivating the system with deploymentID $DEPLOYMENTID" >> "$log"
/usr/sbin/fwconsole sa deactivate $DEPLOYMENTID --quiet >> "$log" 2>&1

###################################################################################

#Echo in some settings into the log file for recording keeping.
echo "VARIABLES SET FOR UPGRADE" >> $log
echo "	asterisk=$asterisk" >> $log
echo "	brand=$brand" >> $log
echo "	framework=$frameworkver" >> $log
echo "	kernel=$kernel" >> $log
echo "	version=$version" >> $log
echo "	host=$host" >> $log
echo "	virtual=$virtual" >> $log
ASTMANPASS=`mysql -uroot -s -N -e "SELECT value FROM asterisk.freepbx_settings WHERE keyword ='AMPMGRPASS'"`
#echo "	Asterisk ManagerPass=$ASTMANPASS" >> $log
echo "	DEPLOYMENTID=$DEPLOYMENTID" >> $log
echo "" >> $log


###########################################################################

#Swicthing to php74 release repo
if [ $quiet == 0 ]; then
	echo "In order to upgrade to FreePBX 16.0 , we have to switched to Freepbx distro's PHP 7.x yum repository to download PHP 7.x RPMs"
	echo -n "Do you really want to enable sangoma-release16 yum repo (yes/no)? "
	read -r
	if [ "$REPLY" == "yes" ]; then
		echo "Enabling sangoma-release16 repo"
		echo "`date` Enabling sangoma-release16 repo ...." >> $log 
	else
		echo "Without enabling sangoma-release16 repo, we can not update PHP packages , hence Exiting upgrade process.."
		echo "`date` Without enabling sangoma-release16 repo, we can not update PHP packages , hence Exiting upgrade process.." >> $log
		updateGqlStatus
		terminate
	fi
else 
	echo "`date` Enabling sangoma-release16 repository ...." >> $log 
fi	

echo "" >> $log 
echo

pkg='sng-php74-repository'
if isinstalled $pkg; then
	echo "$pkg package is already installed"; 
	echo "`date` $pkg package is already installed" >> $log; 
else 
	yum -y install $pkg >> $log 2>&1
	if isinstalled $pkg; then
		echo "$pkg  successfully installed"; 
		echo "`date` $pkg successfully installed" >> $log; 
	else 
		echo "Failed to install $pkg package. Exiting upgrade process.."	
		echo "`date` Failed to install $pkg package. Exiting upgrade process.." >> $log
		updateGqlStatus
		terminate
	fi

fi

###########################################################################
# Removing PHP 5 RPMs
if [ $quiet == 0 ]; then
echo "In order to upgrade to FreePBX 16.0 which is mainly PHP 7.4, we need to remove existing PHP 5.x RPMs. This action is irrevokable.."
echo -n "Do you really want to continue (yes/no)? "
read -r
opt=$REPLY
	if [ "$opt" == "no" ]; then
		echo "Without removing PHP 5.x rpms, we can not update the latest PHP packages , hence Exiting upgrade process.."
		echo "`date` Without removing PHP 5.x rpms, we can not update the latest PHP packages , hence Exiting upgrade process.." >> $log
		updateGqlStatus
		terminate
	fi
fi

echo "`date`######   Now going to remove PHP 5.x RPMs   #######" 
echo "`date`######   Now going to remove PHP 5.x RPMs   #######" >> $log
 

phprpms=("php56w"
"php56w-mysql"
"php56w-pdo"
"php56w-cli"
"php56w-mysqlnd"
"php56w-bcmath" "php56w-pecl-ssh2" "php56w-common" "php56w-soap" "php56w-xml" "php56w-pear" "php56w-pecl-igbinary" 
"php56w-odbc" 
"php56w-ldap" 
"php56w-gd" 
"php56w-pecl-apcu"
"php56w-intl"  "php56w-process" "php56w-pecl-redis" "php56w-mbstring"  "php56w-pecl-xdebug" "php56w-imap")


	for i in "${!phprpms[@]}"; do
		remove_package ${phprpms[$i]}
	done

echo "`date`######   Now going to remove PHP 5.x dependent PBX RPMs   #######" >> $log

# removing freepbx rpm , intentionally keeping out from below loop as 
# do not want to dump removing freepbx logs (which is quite huge and not that much worth) to the log file
rpm -e --nodeps freepbx >> $log
sysrpms=( "zend-guard-loader"  "php-digium_register"  "sysadmin"  "sangoma-pbx"  "asterisk-version-switch"  "ioncube-loader-56")

	for i in "${!sysrpms[@]}"; do
		remove_package ${sysrpms[$i]}
	done

echo "" >> $log 
echo

###########################################################################
echo "######   Now going to install SNG PHP 7.4 repo RPM   #######"
echo "`date` Now going to install SNG PHP 7.4 repo RPM" >> $log
yum -y install sng-php74-repository
###########################################################################

echo "######   Now going to install PHP 7.4 RPMs   #######"
echo "`date` Now going to install PHP 7.4 RPMs" >> $log

yum -y --enablerepo=sng-sng7php74 install php php-xml php-soap php-xmlrpc php-mbstring php-json php-gd php-mcrypt php-intl php-ldap php-mysql php-odbc php-pdo php-pear php-pecl-igbinary php-pecl-redis php-pecl-xdebug php-pecl-process php-pecl-zip php-pecl-ssh2 php-bcmath php-imap >> $log 2>&1


echo "PHP 7.4 RPMs installed successfully"
echo "`date` PHP 7.4 RPMs installed successfully"  >> $log

###########################################################################
function installSangomaRelease16RPM {
	yumdownloader --destdir /tmp/ sangoma-release16 --archlist=x86_64
	if [ $? -eq 1 ];then
		echo "sangoma-release16 RPM failed to download, existing the process"
		echo "`date` sangoma-release16 RPM failed to download, existing the process" >> $log
		updateGqlStatus
		terminate
	fi

	file=`ls -lrt /tmp/ |grep sangoma-release16* | awk '{print $9}'`
	if [ -z $file ];then
		echo "sangoma-release16 RPM file not found, existing the process"
		echo "sangoma-release16 RPM file not found, existing the process" >> $log
		updateGqlStatus
		terminate
	fi

	path="/tmp/$file"
	
	#remove sangoma-release package	
	remove_package sangoma-release
	
	# install new sangoma-release16 rpm package
	rpm -Uvh --replacefiles $path 

	# remove downloaded rpm
	rm -rf $path

	echo "`date` sangoma-release16 RPM installed successfully"
	echo "`date` sangoma-release16 RPM installed successfully" >> $log
}
#We need to download sangoma-release16 package because we can not remove sangoma-release package
# Removing sangoma-release package means removing all yum configuration
# so we will download sangoma-release16 package then remove sangoma-release and then install sangoma-release16 from the rpm

installSangomaRelease16RPM

yum -y clean all

###########################################################################
## Download sysadmin , ioncubeloader , freepbx rpm for 16 ###

echo "#### `date` Starting process to install PBX 16 dependent RPMs ### " >> $log
remove_package asterisk-version-switch 
echo "`date` Installing ioncube , asterisk-version-switch RPM" >> $log
install_php74_pkg ioncube-loader-74
install_php74_pkg asterisk-version-switch
echo "`date` Installing sysadmin RPM" >> $log
install_php74_pkg sysadmin16
echo "`date` Installing PBX RPM" >> $log
echo "`date` Node Service will restart , it will automatically start to fetch the update progress.." >> $log
echo "`date` Do not refresh browser !!.." >> $log
yum -y clean all >> $log 2>&1
# removing PMS sound file which was causing an issue in upgrading/installing freepbx16
mv /var/lib/asterisk/sounds/en/pms /var/log/pbx/
# Now install Freepbx-16 RPM
#yum -y --enablerepo=sng-sng7php74 install freepbx16 >> $log
install_php74_pkg freepbx16
#### FreePBX RPM will restart the node service so need to again start this node ################
`/usr/bin/node $AMPWEBROOT/admin/modules/versionupgrade/hooks/server.js >/dev/null 2>/dev/null &`
################################################################################################
echo "`date` Installing Sangoma release RPM" >> $log
yum -y --enablerepo=sng-sng7php74 install sangoma-release16 
echo "`date` Installing Sangoma PBX RPM" >> $log
yum -y --enablerepo=sng-sng7php74 install sangoma-pbx16 
echo "`date` All PBX 16 dependent RPMs installed successfully" >> $log

################### COMPLETED - UPDATE VERSION ####################
################### Restoring data  ###############################
sed -c -i "s/\(secret *= *\).*/\secret=$ASTMANPASS/" /etc/asterisk/manager.conf

asterisk -rx'manager reload'
echo "asterisk Manager password reverted back"
echo "`date` Asterisk Manager password reverted back successfully" >> $log

echo "`date` Reverting the astDB" >> "$log"
`mv /var/log/pbx/astdb.sqlite3 /var/lib/asterisk/ -f `
chown asterisk:asterisk /var/lib/asterisk/astdb.sqlite3
chmod 777 /var/lib/asterisk/astdb.sqlite3
echo "`date` Reverting the /etc/asterisk files" >> "$log"
cp -R /var/log/pbx/asterisk/* /etc/asterisk/
if [ ! -f /etc/asterisk/extconfig_custom.conf ]; then
    echo "/etc/asterisk/extconfig_custom.conf file not found!.Creating dummy file" >> $log
    touch /etc/asterisk/extconfig_custom.conf
fi
asterisk -rx'manager reload'
chown -R asterisk:asterisk /etc/asterisk/
################### COMPLETED - UPDATE VERSION ####################
################################################################################################
echo "`date` Installing PBX 16 Framework module" >> $log
/usr/sbin/fwconsole ma downloadinstall framework --tag=16.0.21.18 >> $log 2>&1
echo "`date` Installing PBX 16 Certificate manager module" >> $log 2>&1
/usr/sbin/fwconsole ma downloadinstall certman --tag=16.0.22 >> $log 2>&1
echo "`date` Installing PBX 16 Pm2  module" >> $log 2>&1
/usr/sbin/fwconsole ma downloadinstall pm2 --tag=16.0.8 >> $log 2>&1
echo "`date` Installing PBX 16 Sysadmin manager module" >> $log 2>&1
/usr/sbin/fwconsole ma downloadinstall sysadmin --tag=16.0.26.2 >> $log 2>&1
echo "`date` Running chown.." >> $log
/usr/sbin/fwconsole chown >> $log 2>&1
echo "`date` Running reload" >> $log
/usr/sbin/fwconsole reload >> $log 2>&1
echo "`date` Activating the system with deploymentID "$DEPLOYMENTID
echo "`date` Activating the system with deploymentID "$DEPLOYMENTID >> $log
/usr/sbin/fwconsole sa activate $DEPLOYMENTID --quiet >> $log 2>&1

# reinstall sysadmin after activation to ensure the execution of all the install time hooks works properly
/usr/sbin/fwconsole ma install sysadmin >> $log 2>&1

echo "`date` Updating all the modules" >> $log
/usr/sbin/fwconsole ma upgradeall >> $log 2>&1

# Removing openvpn unwanted notification
/usr/sbin/fwconsole notifications --delete sysadmin openvpn

#ideally there should not be any more module to update
#adding this to ensure we are cleaning up security update notification 
#to avoid user confusion
/usr/sbin/fwconsole ma upgradeall >> $log 2>&1

echo "`date` Running chown.." >> $log
/usr/sbin/fwconsole chown >> $log
echo "`date` Running reload" >> $log
/usr/sbin/fwconsole reload >> $log 2>&1

echo "`date` Running fwconsole restart" >> $log
/usr/sbin/fwconsole restart >> $log 2>&1

#remove unwanted php74 repo 
remove_package sng-php74-repository

################### COMPLETED - MODULE/License Update ####################

echo "`date` System upgrade completed successfully."
echo "`date` System upgrade completed successfully." >> $log

updateGqlStatus

################ Kill the node process started above ####################
sleep 60m
fuser -k 8090/tcp
######################################################################### 
terminate
######################################################################### 
