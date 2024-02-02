<?php
namespace FreePBX\Console\Command;
//Symfony stuff all needed add these
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
//la mesa
use Symfony\Component\Console\Helper\Table;

use Symfony\Component\Process\Process;

use Symfony\Component\Console\Command\HelpCommand;

use Symfony\Component\Console\Helper\ProgressBar;

use Symfony\Component\Console\Formatter\OutputFormatterStyle;

class Versionupgrade extends Command {
	const CHECK = 'O';
	const CROSS = 'X';
	protected function configure(){
		$this->setName('versionupgrade')
		->setDescription(_('Version Upgrade'))
		->setDefinition(array(
			new InputOption('upgrade', null, InputOption::VALUE_NONE, _('Upgrade')),
			new InputOption('check', null, InputOption::VALUE_NONE, _('Run Pre-Upgrade Checks')),
		));
	}
	protected function execute(InputInterface $input, OutputInterface $output){
		$outputStyle = new OutputFormatterStyle(null, null, array('bold'));
		$output->getFormatter()->setStyle('strong', $outputStyle);
		$output->getFormatter()->setStyle('b', $outputStyle);

		$outputStyle = new OutputFormatterStyle(null, null, array('underscore'));
		$output->getFormatter()->setStyle('u', $outputStyle);

		if($input->getOption('check')){
			$this->generateChecksTable($input, $output);
			return;
		}

		if($input->getOption('upgrade')){
			$checks = \FreePBX::Versionupgrade()->runChecks(true);
			if(!$checks['allowUpgrade']) {
				$this->generateChecksTable($input, $output);
				return;
			}

		if(\FreePBX::Versionupgrade()->checkOfficalDistro()){
			\FreePBX::Versionupgrade()->runHook('upgrade-php');
			$count = 0;
			while(true){
				if(file_exists('/var/log/pbx/freepbx16-upgrade.log')){
					$cmd = "tail -f /var/log/pbx/freepbx16-upgrade.log";
					break;
				}else{
					if($count == 10){
						$output->writeln('Sorry incron.d could not pick upgrade process');
						exit;
					}
					$count++;
					sleep(1); //sleep for 1 sec and again try if incron.d process for max 10 sec
				}
			}

			$description = array(0 => array("pipe", "r"),1 => array("pipe", "w"));
			flush();
			$process = proc_open($cmd, $description, $pipes, realpath('./'), array());
			$pattern ="/System upgrade completed successfully./i";

			if (is_resource($process)) {
				while ($str = fgets($pipes[1])) {
					$output->writeln($str);
					flush();
					if(preg_match($pattern, $str))
					exit;
				}
			}
		}

			\FreePBX::Versionupgrade()->setEventCallBack(function($type, $data) use($output) {
				switch($type) {
					case "message":
						if(isset($data['newline']) && !$data['newline']) {
							$output->write($data['message']);
						} else {
							$output->writeln($data['message']);
						}
					break;
					case "action":
						switch($data['action']) {
							case "error":
								$output->writeln("<error>".$data['message']."</error>");
							break;
							case "step":
								\FreePBX::Versionupgrade()->upgrade($data['step']);
							break;
							case "finish":
								$output->writeln("<info>The PBX has successfully upgraded</info>");
							break;
						}
					break;
					case "download":
						switch($data['progress']) {
							case "start":
							break;
							case "processing":
							break;
							case "finished":
							break;
						}
					break;
					case "total":
					break;
				}
			});
			\FreePBX::Versionupgrade()->upgrade(1);
			return;
		}

		$this->outputHelp($input,$output);
	}

	private function generateChecksTable(InputInterface $input, OutputInterface $output) {
		$checks = \FreePBX::Versionupgrade()->runChecks(true);
		$table = new Table($output);
		$table->setHeaders(array(_('Status'),_("Name"),_("Description")));
		$rows = array();
		foreach($checks['checks'] as $check) {
			$check['color'] = $check['color'] === 'orange' ? 'yellow' : $check['color'];
			$rows[] = array(
				'<fg='.$check['color'].'>'.($check['status'] ? self::CHECK : self::CROSS).'</>',
				$check['title'],
				$check['description']
			);
		}
		$table->setRows($rows);
		$table->render();
		if($checks['allowUpgrade']) {
			$output->writeln("<info>You may proceed to upgrade<info>");
		} else {
			$output->writeln("<error>You may not proceed with the upgrade. Please see the errors above</error>");
			exit(255);
		}

	}

	/**
	 * @param InputInterface $input
	 * @param OutputInterface $output
	 * @return int
	 * @throws \Symfony\Component\Console\Exception\ExceptionInterface
	 */
	protected function outputHelp(InputInterface $input, OutputInterface $output)	 {
		$help = new HelpCommand();
		$help->setCommand($this);
		return $help->run($input, $output);
	}
}
