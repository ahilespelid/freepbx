<?php
//Namespace should be FreePBX\Console\Command
namespace FreePBX\Console\Command;
//Symfony stuff all needed add these
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class Sipstation extends Command {
	protected function configure() {
		$this->setName('sipstation')
			->setDescription(_('SIPStation'))
			->setDefinition(array(
				new InputOption('refreshallsms', null, InputOption::VALUE_NONE, _('Refresh ALL SMS')),
				new InputOption('refreshinboundsms', null, InputOption::VALUE_NONE, _('Refresh Inbound SMS Only')),
				new InputOption('refreshoutboundsms', null, InputOption::VALUE_NONE, _('Refresh Outbound SMS Only')),
				new InputOption('removekeyandtrunks', null, InputOption::VALUE_NONE, _('Remove key and trunks'))
			));
	}

	protected function execute(InputInterface $input, OutputInterface $output){
		if($input->getOption('refreshallsms')){
			return $this->refreshAllSMS($input,$output);
		}
		if($input->getOption('refreshinboundsms')){
			return $this->refreshInboundSMS($input,$output);
		}
		if($input->getOption('refreshoutboundsms')){
			return $this->refreshOutboundSMS($input,$output);
		}
		if($input->getOption('removekeyandtrunks')){
			return $this->unsetKeyAndTrunks($input,$output);
		}

	}
	private function refreshInboundSMS(InputInterface $input, OutputInterface $output){
		$this->removeMessagesByDirection('in');
		$dids = $this->getAllDids();

		foreach($dids as $did) {
			$adaptor = \FreePBX::Sms()->getAdaptor($did);

			$recs = $adaptor->getReceivedMessagesSince($did,0);
			if(!$recs['status']) {
				continue;
			}
			foreach($recs['messages'] as &$rec) {
				$rec['dir'] = 'received';
			}

			$messages = $recs['messages'];

			foreach($messages as $message) {
				$message['from'] = trim(str_replace("+","",$message['from']));
				$message['to'] = trim(str_replace("+","",$message['to']));

				$output->write("Processing ".$message['dir']." ".$message['id']." from ".$message['from']." to ".$message['to']." timestamp [".$message['time']."]...");
				try {
					if($message['dir'] == 'received') {
						$id = $adaptor->addReceivedMessagePassthru($message);
						$adaptor->getMessageByID($message['id']);
					} else {
						$id = $adaptor->addSentMessagePassthru($message);
					}
					$output->writeln("[".$id."] Done");
				} catch(\Exception $e) {
					$output->writeln(print_r($message,true));
					$output->writeln("Error ".$e->getMessage()." Done");
				}
			}
		}
	}

	private function refreshOutboundSMS(InputInterface $input, OutputInterface $output){
		$this->removeMessagesByDirection('out');
		$dids = $this->getAllDids();
		foreach($dids as $did) {
			$adaptor = \FreePBX::Sms()->getAdaptor($did);

			$sents = $adaptor->getSentMessagesSince($did,0);
			if(!$sents['status']) {
				continue;
			}
			foreach($sents['messages'] as &$sent) {
				$sent['dir'] = 'sent';
			}

			$messages = $sents['messages'];

			foreach($messages as $message) {
				$message['from'] = trim(str_replace("+","",$message['from']));
				$message['to'] = trim(str_replace("+","",$message['to']));

				$output->write("Processing ".$message['dir']." ".$message['id']." from ".$message['from']." to ".$message['to']." timestamp [".$message['time']."]...");
				try {
					if($message['dir'] == 'received') {
						$id = $adaptor->addReceivedMessagePassthru($message);
						$adaptor->getMessageByID($message['id']);
					} else {
						$id = $adaptor->addSentMessagePassthru($message);
					}
					$output->writeln("[".$id."] Done");
				} catch(\Exception $e) {
					$output->writeln(print_r($message,true));
					$output->writeln("Error ".$e->getMessage()." Done");
				}

			}
		}
	}

	private function removeMessagesByDirection($direction) {
		$sql = "SELECT id FROM sms_messages WHERE `direction` = ?";
		$database = \FreePBX::Database();
		$sth = $database->prepare($sql);
		$sth->execute(array($direction));
		$messages = $sth->fetchAll(\PDO::FETCH_COLUMN);

		$database->query("DELETE FROM sms_media WHERE `mid` IN (".implode(",",$messages).")");
		$database->query("DELETE FROM sms_messages WHERE `id` IN (".implode(",",$messages).")");
	}

	private function getAllDids() {
		$sth = $database->prepare("SELECT DISTINCT did FROM sms_routing WHERE adaptor = 'Sipstation'");
		$sth->execute();
		$dids = $sth->fetchAll(\PDO::FETCH_COLUMN, 0);
		return $dids;
	}

	private function refreshAllSMS(InputInterface $input, OutputInterface $output){
		set_time_limit(0);
		$database = \FreePBX::Database();
		$database->query("TRUNCATE sms_media");
		$database->query("TRUNCATE sms_messages");

		$sth = $database->prepare("SELECT DISTINCT did FROM sms_routing WHERE adaptor = 'Sipstation'");
		$sth->execute();
		$dids = $sth->fetchAll(\PDO::FETCH_COLUMN, 0);

		foreach($dids as $did) {
			$adaptor = \FreePBX::Sms()->getAdaptor($did);

			$sents = $adaptor->getSentMessagesSince($did,0);
			if(!$sents['status']) {
				continue;
			}
			foreach($sents['messages'] as &$sent) {
				$sent['dir'] = 'sent';
			}
			$recs = $adaptor->getReceivedMessagesSince($did,0);
			if(!$recs['status']) {
				continue;
			}
			foreach($recs['messages'] as &$rec) {
				$rec['dir'] = 'received';
			}
			$messages = array_merge($sents['messages'],$recs['messages']);

			uasort($messages, function($a,$b) {
				return ($a['time'] < $b['time']) ? -1 : 1;
			});

			foreach($messages as $message) {
				$message['from'] = trim(str_replace("+","",$message['from']));
				$message['to'] = trim(str_replace("+","",$message['to']));

				$output->write("Processing ".$message['dir']." ".$message['id']." from ".$message['from']." to ".$message['to']." timestamp [".$message['time']."]...");
				try {
					if($message['dir'] == 'received') {
						$id = $adaptor->addReceivedMessagePassthru($message);
						$adaptor->getMessageByID($message['id']);
					} else {
						$id = $adaptor->addSentMessagePassthru($message);
					}
					$output->writeln("[".$id."] Done");
				} catch(\Exception $e) {
					$output->writeln(print_r($message,true));
					$output->writeln("Error ".$e->getMessage()." Done");
				}

			}
		}
	}

	private function unsetKeyAndTrunks(InputInterface $input, OutputInterface $output){
		try {
			$ret = \FreePBX::Sipstation()->removeKeyAndTrunks();
			if($ret) {
				$output->writeln("Done");
			} else {
				$output->writeln("Sipstation key doesn't exists.");
			}
		} catch(\Exception $e) {
			$output->writeln("Error ".$e->getMessage()." Done");
		}
	}
}
