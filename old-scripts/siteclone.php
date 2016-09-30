<?php

/*
 * prepare command param
 * 
 * get page response from given param
 * save it
 * get all links from page response
 * get page response from all links
 * save it
 * get all links from ...
 * ...
 */

$next = false;
$arg = array();
$white_arg = array('-url', '-save', '-last');
foreach ($argv as $value) {
	if(in_array($value, $white_arg)) {
		$next = $value;
		continue;
	}
	if($next !== false) {
		$arg[$next] = str_replace("\"", "", $value);
	}
	$next = false;
}

if(!isset($arg['-url'])) {
	echo "./siteclonse.php -url http://domain/ -save [location] -last [location]";
	exit;
}

if(isset($arg['-save'])) {
	$domain = get_domain( $arg['-url'] );

	$save_directory = $arg['-save'] . '/' . $domain . '/' . date('YmdHis') . '/';
	make_path($save_directory);
	
	$f = fopen($save_directory . '_clone.txt', 'w');
	fwrite($f, date("D, d M Y H:i:s") . ' GMT');
	fclose($f);
}

if(isset($arg['-last'])) {
	if(file_exists($arg['-last'] . '/_clone.txt') && filesize($arg['-last'] . '/_clone.txt') > 0) {
		$f = fopen($arg['-last'] . '/_clone.txt', 'r');
		$GLOBALS['if_modified_since'] = fread($f, filesize($arg['-last'] . '/_clone.txt'));
		fclose($f);
	}
}

$links = array();
$done_links = array();

$domain = $arg['-url'];
$links[] = array($domain);

$mail_list = array();

$white_contentType = array(
	"text/html",
	"text/css",
	"text/plain",
	"text/xml"
);

$black_contentType = array(
	// images
	"image/png",
	"image/gif",
	"image/x-icon",
	"image/jpeg",
	"image/tiff",
	
	//scripts
	"application/javascript",
	"text/javascript",
	"application/x-javascript",
	
	// documents
	"application/pdf",
	"application/msword",
	"application/vnd.ms-excel",
	
	// fonts
	"application/font-woff",
	"image/bmp",
	
	// others
	"image/svg+xml",
	"application/x-shockwave-flash",
	"application/zip"
);

while(!empty($links)) {
	foreach ($links[0] as $l) {
		if(in_array($l, $done_links))
			continue;
		
		$done_links[] = $l;
		$response = get_response($l);
		
		if($response !== false) {
			if(isset($arg['-save']) && (@$response['header']['code'] == 200 || @$response['header']['code'] == 500)) {
				save_response($l, $response['response']);
			}
			
			if(in_array(@$response['header']['Content-Type'], $white_contentType)) {
				$links[] = remove_period_links( get_links($l, $response['response']) );
				
				if(@$response['header']['Location']) {
					$loc = get_absolute_location($l, $response['header']['Location']);

					if(get_fulldomain($loc) == get_fulldomain($l)) {
						$links[] = array($loc);
					}
				}
			}
			elseif(@$response['header']['Content-Type'] && !in_array(@$response['header']['Content-Type'], $black_contentType)) {
				echo "\r\nContent-Type: " . @$response['header']['Content-Type'] . " Not listed\r\n";
			}
			
			if(@$response['header']['code'] == 500) {
				//echo "\r\n" . $response['response'] . "\r\n";
			}
		}
	}
	array_shift($links);
}

//print_r($done_links);

exit;

//////////////////
// functions
//////////////////

function get_links($url, $str = '') {
	$data = &$str;

	$dc = decode_url($url);

	$url_http_proto = $dc['proto'];
	$url_full_domain = $dc['fulldomain'];
	$url_subpath	= @$dc['subpath'];
	$url_fileName	= @$dc['file'];
	
	$links = array();
	preg_match_all("/(?:href|src|action)=\"([^\"]*)\"/", $data, $matchs);
	$links = array_merge($links, $matchs[1]);
	preg_match_all("/(?:href|src|action)=\'([^\']*)\'/", $data, $matchs);
	$links = array_merge($links, $matchs[1]);
	preg_match_all("/(?:href|src|action)=([^\"\'][^\s>]*)/", $data, $matchs);
	$links = array_merge($links, $matchs[1]);
	
	$_links = $links;
	$links = array();
	
	foreach ($_links as $value) {
		if(stripos($value, "javascript:") === 0) continue;
		
		if(stripos($value, "mailto:") === 0) {
			save_mail_address(substr($value, 7));
			continue;
		}
		
		if(stripos($value, "?") === 0) {
			$value = $url_http_proto . $url_full_domain . $url_subpath . $url_fileName . $value;
		}
		elseif(stripos($value, "/") === 0) {
			$value = $url_http_proto . $url_full_domain . $value;
		}
		elseif(stripos($value, ".") === 0) {
			$value = $url_http_proto . $url_full_domain . $url_subpath . $value;
		}
		elseif(stripos($value, "http") !== 0) {
			$value = $url_http_proto . $url_full_domain . $url_subpath . $value;
		}
		
		if(get_fulldomain($value) == $url_full_domain) {
			$links[] = get_script_path($value);
		}
	}
	
	return $links;
	
	// Replace href|src address from html
	$matchs = Array();
	// have only query
	$data = preg_replace("/((?:href|src|action)=[\"\'])(\?[^\"\'\s]+)([\"\'\s])/", "$1$url_http_proto$url_full_domain$url_subpath$url_fileName$2$3", $data);
	// have only subpath
	$data = preg_replace("/((?:href|src|action)=[\"\'])(\/[^\"\'\s]+)([\"\'\s])/", "$1$url_http_proto$url_full_domain$2$3", $data);
	// have only relative filename
	$data = preg_replace("/((?:href|src|action)=[\"\'])\.\/([^\"\'\s]+)([\"\'\s])/", "$1$url_http_proto$url_full_domain$url_subpath$2$3", $data);					// have only relative filename
	// have only file name
	$data = preg_replace("/((?:href|src|action)=[\"\'])(?:(?!https?)([^\"\'\s]+))([\"\'\s])/", "$1$url_http_proto$url_full_domain$url_subpath$2$3", $data);

	// Replace url from css
	$data = preg_replace("/(url\([\"\']?)(\?[^\"\'\)]+)([\"\'\)])/", "$1$url_http_proto$url_full_domain$url_subpath$url_fileName$2$3", $data);		// have only query
	$data = preg_replace("/(url\([\"\']?)(\/[^\"\'\)]+)([\"\'\)])/", "$1$url_http_proto$url_full_domain$2$3", $data);								// have only subpath
	$data = preg_replace("/(url\([\"\']?)\.\/([^\"\'\)]+)([\"\'\)])/", "$1$url_http_proto$url_full_domain$url_subpath$2$3", $data);					// have only relative filename
	$data = preg_replace("/(url\([\"\']?)(?:(?!https?)([^\"\'\)]+))([\"\'\)])/", "$1$url_http_proto$url_full_domain$url_subpath$2$3", $data);		// have only file name
	
	
	$links = array();
	if(preg_match_all("/((?:href|src|action)=[\"\'])([^\"\'\s]+)([\"\'\s])/", $data, $matchs)) {
		foreach($matchs[2] as $l) {
			if(get_fulldomain($l) == $url_full_domain) {
				$links[] = get_script_path($l);
			}
		}
	}
	if(preg_match_all("/(url\([\"\']?)([^\"\'\)]+)([\"\'\)])/", $data, $matchs)) {
		foreach($matchs[2] as $l) {
			if(get_fulldomain($l) == $url_full_domain && !preg_match("/^javascript:/", get_url_file_name($l))) {
				$links[] = get_script_path($l);
			}
		}
	}
	return $links;
}

function get_response($url) {
	
		$p_url = $url;
		while(strlen($p_url) < 110) {
			$p_url .= ' ';
		}
		echo $p_url . ' ';
		
		$domain = get_domain($url);
		
		$userAgent = 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.107 Safari/537.36'; //'ROBOT';
		
		if(!isset($GLOBALS['cookies'])) $GLOBALS['cookies'] = array();
		
		$cookie = "";
		if(!empty($GLOBALS['cookies'])) {
			$cookie = implode("; ", $GLOBALS['cookies']);
		}
		//echo "1\r\n";
		$opts = array('http' =>
			array(
				'method' => 'GET',
					'header' => 'Host: ' . $domain . "\r\n" . 'User-Agent: ' . $userAgent
					. (isset($GLOBALS['if_modified_since']) ? "\r\nIf-Modified-Since: " . $GLOBALS['if_modified_since'] : '')
					. (!empty($cookie) ? "\r\ncookie: " . $cookie : ''),
				'max_redirects' => '0',
				'ignore_errors' => '1'
			)
		);
		//echo "2\r\n";
		//print_r(array($url, $opts));

		$context = stream_context_create($opts);
		//echo "3\r\n";
		$stream = @fopen($url, 'r', false, $context);
		//echo "4\r\n";
		if(!$stream) {
			echo "Error\r\n";
			return false;
		}
		
		$header = stream_get_meta_data( $stream );
		$header = $header['wrapper_data'];
		//echo "5\r\n";
		$url_response = stream_get_contents($stream);
		//echo "6\r\n";
		
		$h = decode_header($header);
		
		print_size(strlen($url_response));
		
		echo "\t$h[status]\r\n";
		return array('response' => $url_response, 'header' => $h);
}

function save_response($url, $str = '') {
	global $save_directory;
	
	$dc = decode_url($url);
	$subpath = @$dc['subpath'];

	if(strpos($subpath, '/') === 0) {
		$subpath = substr($subpath, 1);
	}
	if(!file_exists($save_directory . $subpath)) {
		make_path($save_directory . $subpath);
	}
	
	$file = @$dc['file'];
	if(empty($file)) {
		$file = '__index.htm';
	}
	
	$save_file_name = $save_directory . $subpath . $file;
	if(!empty($file) && is_dir($save_file_name)) {
		$save_file_name .= "/" . '__index.htm';
	}
	
	if(file_exists($save_file_name)) {
		return;
	}
	
	$f = @fopen($save_file_name, 'w');
	if(!$f) {
		echo "Error Create File: $save_file_name\r\n";
		return;
	}
	fwrite($f, $str);
	fclose($f);
}

function make_path($path) {
	$sub_path = preg_split("/\/|\\\\/", $path);
	$p = "";
	foreach ($sub_path as $value) {
		if(empty($value)) continue;
		
		$p .= $value . "/";
		//echo $p . "\r\n";
		if(!file_exists($p)) {
			mkdir($p);
		}
	}
}

function get_domain($url) {
	$du = decode_url($url);
	return $du['domain'];
}

function get_fulldomain($url) {
	$du = decode_url($url);
	if(!isset($du['fulldomain'])) {
		print_r(array($url, $du));
		//exit;
	}
	return $du['fulldomain'];
}

function get_url_file_name($url) {
	$du = decode_url($url);
	return isset($du['file'])?$du['file']:'';
}

function get_script_path($url) {
	$du = decode_url($url);
	return $du['proto'].$du['fulldomain'] . @$du['subpath'] . @$du['file'];
}

function decode_url($url) {
	preg_match(
		"/^"
		. "(?P<proto>http[s]?:\/\/)"		// protocol
		. "(?P<fulldomain>(?P<domain>[\w\.]+)(?:\:(?P<port>[\d]+))?)"	// full domain
		. "(?P<subpath>(?:\/[\w-]+)*\/)?"		// subpath
		. "(?P<file>[^\?\#]+)?"			// file
		. "(?P<query>\?[^#]*)?"			// query
		//. "(?P<hash>#[\w]*)?"			// hash
		//. "$"	// end of line
		. "/",
		$url, $match);
	
	//print_r(array($url, $match));
	return $match;
}

function decode_header($header) {
	$response_header = array(
		'code'	=> 0,
		'status'	=> '0'
	);

	foreach( $header as $head_data ) {
		if(preg_match( "#^HTTP/1.[0-1] ([0-9]+) [\S\s]+#", $head_data, $matchs )) {
			$response_header['code'] = intval($matchs[1]);
			$response_header['status']	= $matchs[0];
		}
		elseif(preg_match( "#^Content-Type: ([^;]+)#", $head_data, $matchs ) ) {
			$response_header['Content-Type'] = $matchs[1];
		}
		elseif(preg_match( "#^Location: ([^;]+)#", $head_data, $matchs ) ) {
			$response_header['Location'] = $matchs[1];
		}
		elseif(preg_match("#^Last-Modified: (.*)$#", $head_data, $matchs)) {
			$response_header['Last-Modified'] = $matchs[1];
		}
		elseif(preg_match("/Set-Cookie: (.+);/", $head_data, $match)) {
			if(!isset($GLOBALS['cookies'])) $GLOBALS['cookies'] = array();
			$GLOBALS['cookies'][] = $match[1];
		}
	}

	return $response_header;
}

function get_absolute_location($url, $location) {
	$dc = decode_url($url);
	
	// have only subpath
	if(preg_match("/^\//", $location)) {
		$location = $dc['proto'] . $dc['fulldomain'] . $location;
	}
	elseif(!preg_match("/^http/", $location)) {
		$location = $dc['proto'] . $dc['fulldomain'] . @$dc['subpath'] . $location;
	}

	return $location;
}

function remove_period_links($lnks) {
	if(is_array($lnks)) {
		foreach ($lnks as &$value) {
			$value = remove_period_links($value);
		}
		return $lnks;
	}
	
	$pattern = "/[\w]*\/\.\.\//";
	while(preg_match($pattern, $lnks)) {
		$lnks = preg_replace($pattern, "", $lnks);
	}
	
	return $lnks;
}

function print_size($size) {
	$size = intval($size);
	
	$size_unit = array(0 => 'Bytes', 1 => 'KB', 2 => 'MB', 3 => 'GB', 4 => 'TB');
	
	$size_level = 0;
	
	while($size_level < count($size_unit) - 1 && $size > 1024) {
		$size_level++;
		$size /= 1024;
		$size = intval($size);
	}
	
	$size_string = $size . " " . $size_unit[$size_level];
	while(strlen($size_string) < 10) {
		$size_string = " " . $size_string;
	}
	
	echo $size_string;
}

function save_mail_address($mail_address) {
	if(!isset($GLOBALS['save_directory'])) return;
	global $save_directory;
	global $mail_list;
	
	if(in_array($mail_list, $mail_address))
		return;
	
	$f = fopen($save_directory . '_mail.txt', 'a');
	fwrite($f, $mail_address . "\r\n");
	fclose($f);
	
	$mail_list[] = $mail_address;
}

?>
