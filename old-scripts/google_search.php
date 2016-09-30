<?php
#!/usr/bin/php
#
# url of google search

$only_link = true;

function g_error() {
	echo "Error: syntax is googel_search.php \"searchText\" limit (optional)\r\n";
	exit;
}

function g_url($search, $max_result=10) {
	$rank_pos = 0;
	$search = str_replace(" ", "+", $search);

	/**
	 * header, display link, description, google link, absolute link
	 */
	$results = array();
	
	$opts = array('http' =>
		array(
			'method'  => 'GET',
			'header'  => "User-Agent: Mozilla/5.0"
		)
	);
	
	$context  = stream_context_create($opts);
	
	while ( count($results) < $max_result ) {
		$url = 'http://www.google.com/search?q=' . $search . '&safe=on';
		if(count($results) != 0) $url .= "&start=" . count($results);
		
		$stream = fopen($url, 'r', false, $context);
		
		if(!$stream) {
			header("HTTP/1.1 404 Not Found", TRUE, 404);
			die('connection error');
		}
		
		//$h = stream_get_meta_data( $stream );
		//print_r($h);
		
		$data = stream_get_contents($stream);
		//echo $data;
		
		$data = preg_replace("/&amp;/", "&", $data);
		$data = preg_replace("/<(b|br)>/", "", $data);
		$data = preg_replace("/<\/b>/", "", $data);
	
		$data = preg_replace("/ (style|onclick|aria-expanded|aria-haspopup|tabindex|data-ved|role)=\"[^\"]*\"/", "", $data);
		$data = preg_replace("/\xe2\x80\x8e/", "", $data);	// 226, 128, 142  = e2, 80, 8e
		$data = preg_replace("/<div class=\"am-dropdown-menu\"><ul>(<li class=\"am-dropdown-menu-item\"><a class=\"am-dropdown-menu-item-text\" href=\"[^\"]+\">[^\>]*<\/a><\/li>)*<\/ul><\/div>/", "", $data);
		
		
		preg_match_all('/<li class=\"g\"><h3 class=\"r\"><a href=\"(?P<googleurl>\/url\?q=(?P<absoluteurl>[^"&]+)[^\"]*)\">(?P<header>[^>]+)<\/a><\/h3><div class=\"s\"><div class=\"kv\"><cite>(?P<displayurl>[^>]*)<\/cite><div class=\"am-dwn-arw-container\"><div><span class=\"am-dwn-arw\"><\/span><\/div><\/div><\/div><span class=\"st\">(?P<description>[^<]*)<\/span>/mi', $data, $matchs);
		
		//print_r($matchs);
		//exit;
		
		$_results = array();
		for($i = 0; $i < count($matchs[0]); $i++) {
			$_results[] = array(
				'header'	=> $matchs['header'][$i],
				'display_link'	=> $matchs['displayurl'][$i],
				'description'	=> $matchs['description'][$i],
				'google_link'	=> $matchs['googleurl'][$i],
				'absolute_link' => urldecode($matchs['absoluteurl'][$i])
			);
			//echo $url . "\r\n";
		}
		
		$results = array_merge($results, $_results);
		
		foreach($_results as $result) {
			$rank_pos++;
			if($GLOBALS['only_link']) {
				if(strpos($result['absolute_link'], 'www.mundha.com') !== false) {
					echo "\r\nfound on $rank_pos : ";
					echo $result['google_link'] . "\r\n";
				}
				echo "[$rank_pos] " . $result['absolute_link'] . "\r\n";
			}
			else {
				echo "[$rank_pos] " . $result['header'] . "\r\n";
				echo $result['display_link'] . "\r\n";
				echo $result['description'] . "\r\n";
				echo "\r\n";
			}
		}
		
		if ( count ( $_results ) == 0 )
			break;
		
		//sleep(rand(0,10));
	}
	
	//print_r($results);
	
		//echo "$search, $max_result\r\n";
}

if ( sizeof($argv) < 2) {
	g_error();
}

g_url($argv[1], isset($argv[2])?$argv[2]:10);

?>
