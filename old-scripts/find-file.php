<?php

$search = "";
$directory = "";
$max_size = -1;
$extension = array();
$display_result_desc = false;

$directory = getcwd();

unset($argv[0]);

$last_argv_key = "";
foreach ($argv as $value) {
	if(strlen($last_argv_key)==0) {
		$last_argv_key = $value;
		continue;
	}

	switch ($last_argv_key) {
		case "-s":
			$s = $value;
			$i = 1;
			switch (strtoupper(substr($value, strlen($value)-2, 2))) {
				case "KB":
					$s = substr($value, 0, strlen($value)-2);
					$i = 1000;
					break;
				case "MB":
					$s = substr($value, 0, strlen($value)-2);
					$i = 1000*1000;
					break;
			}
			
			if(!is_numeric($s)) print_help ();
			
			$max_size = intval($s) * $i;
			break;
		case "-e":
			$extension = explode(",", $value);
			break;
		case "-p":
			$directory = $value;
			break;
		case "-t":
			$search = $value;
			break;
		case "-d":
			$display_result_desc = ($value == "1");
			break;
	}
	$last_argv_key = "";
}

if(strlen($search)==0 || strlen($directory) ==0) {
	print_help();
}

ini_set('memory_limit', '-1');

$directory = str_replace("\\", "/", $directory);

if(substr($directory, strlen($directory)-1, 1) != "/")
	$directory .= "/";
	
if(!file_exists($directory)) {
	echo "File not exits\r\n";
	exit;
}

$total_file_searched = 0;
$total_file_found = 0;
$file_not_accessable = 0;

search_directory($directory, $search);

echo "\r\nFile Searched : $total_file_searched, File Found : $total_file_found";
if($file_not_accessable > 0) echo ", File not accessable : $file_not_accessable";

//echo "\r\nDone\r\n";

exit;

function print_help() {
	echo "use : php find.php [-s [maxfilesize]] [-e [extention]] -p [path] -t [text]";
	exit;
}

function search_directory($dir, $needle) {
	global $total_file_searched;
	global $total_file_found;
	global $max_size;
	global $extension;
	global $display_result_desc;
	//echo "\r" . substr($dir, 0, 120);
	$handle=opendir($dir);
	while ($file = readdir($handle)) 
	{
		if($file == ".") continue;
		if($file == "..") continue;

		if (is_file("$dir$file")) {
			//echo "FILE : $dir$file\r\n";
			
			// File size greater then max size to search
			if($max_size != -1 && filesize("$dir$file") > $max_size)
				continue;
			
			// check white list extiontion
			if(count($extension) > 0) {
				$isWhite = false;
				foreach ($extension as $value) {
					if(strtolower(substr($file, strlen($file)-strlen($value), strlen($value)))==strtolower($value)) {
						$isWhite =true;
						break;
					}
				}
				if(!$isWhite)continue;
			}
			
			$total_file_searched++;
			if(search_file("$dir$file", $needle)) {
				echo "Found : " . $dir . $file . "\r\n";
				
				if($display_result_desc === true) {
					$row = show_search_result_row("$dir$file", $needle);

					foreach($row as $r) {
						echo "\t" . $r . "\r\n";
					}
					echo "\r\n";
				}
				
				$total_file_found++;
			}
		}
		elseif (is_dir("$dir$file")) {
			//echo "DIR : $dir$file\r\n";
			search_directory("$dir$file/", $needle);
		}
		else {
			echo "UNKNOWN : $dir$file\r\n";
		}
	}
	closedir($handle);
}

/**
 * 
 * @param type $filename
 * @param type $needle
 * @return boolean
 */
function search_file($filename, $needle) {
	if(!filesize($filename))
		return false;
	
	$handle = @fopen($filename, "r");
	if(!$handle) {
		global $file_not_accessable;
		$file_not_accessable++;
		echo "Access denied : $filename\r\n";
		return false;
	}
	
	$str = fread($handle, filesize($filename));
	if(stripos($str, $needle) !== false) {
		return true;
	}
	
	return false;
}

function show_search_result_row($filename, $needle) {
	$retValue = array();
	
	if(!filesize($filename))
		return $retValue;
	
	$handle = @fopen($filename, "r");
	
	$str = fread($handle, filesize($filename));
	
	$offset = 0;
	$pos = -1;

	while(($pos = stripos($str, $needle, $offset)) !== false) {
		$rowStart = $offset;
		while(($p = strpos($str, "\n", $rowStart)) !== false && $p < $pos)
			$rowStart = $p+1;
		
		$rowEnd = $pos;
		
		if(($p = strpos($str, "\n", $rowEnd)) !== false)
			$rowEnd = $p;
		
		//if($rowEnd > ($offset + strlen($needle) + 10))
		
		$retValue[] = trim(substr($str, $rowStart, $rowEnd - $rowStart));
		
		$offset = $rowEnd+1;
	}
	
	return $retValue;
}

?>
