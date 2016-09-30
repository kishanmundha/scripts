<?php
#!/usr/bin/php

define ('HOST', 'localhost');
define ('SQL_USERNAME', 'root');
define ('SQL_PASSWORD', '');
define ('SQL_DATABASE', 'mysql');

function invalidArgv() {
	echo	"Error: invalid argument\r\n",
		"Example:\r\n",
		"	./sqlhelp.php -id 3\r\n",
		"	./sqlhelp.php -key	(It will show all key list)\r\n",
		"	./sqlhelp.php -key join\r\n";
	exit;
}

function escapeSqlString($s = "") {
	return str_replace("'", "''", $s);
}

function getHelp() {
	global $argv;
	$conn = @mysql_connect(HOST, SQL_USERNAME, SQL_PASSWORD) or die(mysql_error());
	@mysql_select_db(SQL_DATABASE) or die(mysql_error());
	
	if ( sizeof($argv) == 2) {	// show all help keyword
		$key_list_query = "SELECT help_keyword_id, name FROM help_keyword";
		$stmt = @mysql_query($key_list_query) or die(mysql_error());
		echo "id\tname\r\n";
	        while(($row = mysql_fetch_array($stmt)) !== false) {
	        	echo $row[0] . "\t" . $row[1] . "\r\n";
	        }
	        mysql_free_result($stmt);
	}
	else {
		$help_query = 	"SELECT ht.description, ht.example, ht.name "
				. "FROM help_topic ht "
				. "LEFT JOIN help_relation hr ON ht.help_topic_id = hr.help_topic_id "
				. "LEFT JOIN help_keyword hk ON hk.help_keyword_id = hr.help_keyword_id "
				. "WHERE ";
		if( $argv[1] == '-id') {
			$help_query .= "hk.help_keyword_id = '" . escapeSqlString($argv[2]) . "'";
		}
		else {
			$help_query .= "(hk.name = '" . escapeSqlString($argv[2]) . "' OR ht.name = '" . escapeSqlString($argv[2]) . "')";
		}

		$stmt = @mysql_query($help_query) or die(mysql_error());
		if ( mysql_num_fields($stmt) == 0) {
			echo "No result found";
		}
		else {
		        while(($row = mysql_fetch_array($stmt)) !== false) {
		        	echo "\r\n----" . $row[2] . "----\r\n";
		        	echo "\r\nDescription:\r\n" . $row[0] . "\r\n";
		        	echo "\r\nExample:\r\n" . $row[1] . "\r\n";
		        }
		        mysql_free_result($stmt);
	        }
	}
	
	@mysql_close($conn);
}

if ( sizeof($argv) < 2) {
	invalidArgv();
}
else if ( sizeof($argv) == 2 and $argv[1] != '-key') {
	invalidArgv();
}

if ( $argv[1] != '-id' && $argv[1] != '-key') {
	invalidArgv();
}

getHelp();

//print_r($argv);

?>
